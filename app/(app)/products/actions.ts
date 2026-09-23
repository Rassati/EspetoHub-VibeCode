"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth";
import { moneyToCents } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/server";
import { formText, isUuid } from "@/lib/validation";
function text(formData: FormData, key: string) {
    return formText(formData, key);
}
function optionalUnits(formData: FormData) {
    const raw = text(formData, "units_per_package");
    if (!raw)
        return null;
    const units = Number(raw);
    if (!Number.isInteger(units) || units < 1 || units > 100000)
        return NaN;
    return units;
}
function price(formData: FormData) {
    const cents = moneyToCents(text(formData, "price"));
    return cents;
}
function variantValues(formData: FormData, destination: string) {
    const name = text(formData, "variant_name");
    const units = optionalUnits(formData);
    const cents = price(formData);
    if (!name || name.length > 100 || (units !== null && !Number.isInteger(units)) || !Number.isSafeInteger(cents) || cents < 0) {
        redirect(`${destination}?error=${encodeURIComponent("Informe um nome de até 100 caracteres, um preço válido e uma quantidade inteira de 1 a 100.000 unidades.")}`);
    }
    return { name, units, cents };
}
function productIdFrom(formData: FormData) {
    const id = text(formData, "product_id");
    if (!isUuid(id))
        redirect("/products?error=Produto+inv%C3%A1lido.");
    return id;
}
function isValidProductImagePath(imagePath: string, companyId: string, productId: string) {
    const prefix = `${companyId}/${productId}/`;
    const fileName = imagePath.slice(prefix.length);
    return imagePath.startsWith(prefix) && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}\.(?:jpg|jpeg|png|webp)$/i.test(fileName);
}
type ProductImageResult = {
    error?: string;
    warning?: string;
};
/**
 * The file itself is uploaded directly from the browser to Supabase Storage.
 * This action only associates a photo in the current company's folder with the
 * current product. Keeping that check on the server prevents a forged browser
 * request from pointing a product at somebody else's Storage object.
 */
export async function saveProductImageAction(productId: string, imagePath: string): Promise<ProductImageResult> {
    const context = await getCompanyContext();
    if (!isUuid(productId) || typeof imagePath !== "string" || !isValidProductImagePath(imagePath, context.company.id, productId)) {
        return { error: "Não foi possível validar a foto enviada." };
    }
    const supabase = await createClient();
    const { data: product, error: productError } = await supabase
        .from("products")
        .select("image_path")
        .eq("id", productId)
        .eq("company_id", context.company.id)
        .maybeSingle();
    if (productError || !product)
        return { error: "Produto não encontrado." };
    let update = supabase
        .from("products")
        .update({ image_path: imagePath })
        .eq("id", productId)
        .eq("company_id", context.company.id);
    update = product.image_path ? update.eq("image_path", product.image_path) : update.is("image_path", null);
    const { data: updated, error } = await update.select("id").maybeSingle();
    if (error || !updated)
        return { error: "Não foi possível salvar a foto. Recarregue a página e tente novamente." };
    // Keeping the new photo if this cleanup fails is preferable to losing a
    // successfully saved product image. A failed cleanup merely leaves an
    // unreferenced object in the public bucket; report cleanup failures explicitly.
    let warning: string | undefined;
    if (product.image_path && product.image_path !== imagePath && isValidProductImagePath(product.image_path, context.company.id, productId)) {
        const { error: cleanupError } = await supabase.storage.from("product-images").remove([product.image_path]);
        if (cleanupError)
            warning = "A nova foto foi salva, mas a antiga ainda precisa ser removida do armazenamento.";
    }
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/orders/new");
    return { warning };
}
export async function removeProductImageAction(productId: string): Promise<ProductImageResult> {
    const context = await getCompanyContext();
    if (!isUuid(productId))
        return { error: "Produto inválido." };
    const supabase = await createClient();
    const { data: product, error: productError } = await supabase
        .from("products")
        .select("image_path")
        .eq("id", productId)
        .eq("company_id", context.company.id)
        .maybeSingle();
    if (productError || !product)
        return { error: "Produto não encontrado." };
    if (!product.image_path)
        return {};
    const { data: updated, error } = await supabase
        .from("products")
        .update({ image_path: null })
        .eq("id", productId)
        .eq("company_id", context.company.id)
        .eq("image_path", product.image_path)
        .select("id").maybeSingle();
    if (error || !updated)
        return { error: "A foto foi alterada em outra sessão. Recarregue a página e tente novamente." };
    let warning: string | undefined;
    if (isValidProductImagePath(product.image_path, context.company.id, productId)) {
        const { error: cleanupError } = await supabase.storage.from("product-images").remove([product.image_path]);
        if (cleanupError)
            warning = "A foto saiu do produto, mas ainda precisa ser removida do armazenamento.";
    }
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/orders/new");
    return { warning };
}
export async function createProductAction(formData: FormData) {
    const name = text(formData, "name");
    if (!name || name.length > 140 || text(formData, "description").length > 2000)
        redirect("/products?error=Revise+o+nome+e+a+descri%C3%A7%C3%A3o+do+produto.");
    const { name: variantName, units: unitsPerPackage, cents: priceCents } = variantValues(formData, "/products");
    const context = await getCompanyContext();
    const supabase = await createClient();
    const transaction = await supabase.rpc("create_product_with_variant", {
        p_company_id: context.company.id, p_name: name, p_description: text(formData, "description") || null,
        p_variant_name: variantName, p_units: unitsPerPackage, p_price_cents: priceCents,
    });
    if (!transaction.error && isUuid(transaction.data)) {
        revalidatePath("/products");
        revalidatePath("/orders/new");
        redirect(`/products/${transaction.data}`);
    }
    // Compatibility until migration 0005 is applied. Never retry an uncertain write.
    if (transaction.error?.code !== "PGRST202")
        redirect(`/products?error=${encodeURIComponent("Não foi possível cadastrar. Confira os dados e se já existe um produto com esse nome.")}`);
    const { data: product, error: productError } = await supabase
        .from("products")
        .insert({ company_id: context.company.id, name, description: text(formData, "description") || null })
        .select("id")
        .single();
    if (productError)
        redirect(`/products?error=${encodeURIComponent("Não foi possível cadastrar. Confira se já existe um produto com esse nome.")}`);
    const { error: variantError } = await supabase.from("product_variants").insert({
        company_id: context.company.id,
        product_id: product.id,
        name: variantName,
        units_per_package: unitsPerPackage,
        price_cents: priceCents,
    });
    revalidatePath("/products");
    revalidatePath("/orders/new");
    if (variantError)
        redirect(`/products/${product.id}?error=${encodeURIComponent("O produto foi criado, mas a primeira forma de venda não foi salva. Adicione a variação abaixo.")}`);
    redirect(`/products/${product.id}`);
}
export async function updateProductAction(formData: FormData) {
    const productId = productIdFrom(formData);
    if (!text(formData, "name") || text(formData, "name").length > 140 || text(formData, "description").length > 2000)
        redirect(`/products/${productId}?error=Revise+o+nome+e+a+descri%C3%A7%C3%A3o.`);
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("products")
        .update({ name: text(formData, "name"), description: text(formData, "description") || null })
        .eq("id", productId)
        .eq("company_id", context.company.id).select("id").maybeSingle();
    if (error || !data)
        redirect(`/products/${productId}?error=${encodeURIComponent("Não foi possível atualizar. Confira o nome e tente novamente.")}`);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/orders/new");
    redirect(`/products/${productId}?saved=1`);
}
export async function toggleProductAction(formData: FormData) {
    const productId = productIdFrom(formData);
    if (!["true", "false"].includes(text(formData, "next_state")))
        redirect("/products?error=Estado+inv%C3%A1lido.");
    const nextState = text(formData, "next_state") === "true";
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { data, error } = await supabase.from("products").update({ is_active: nextState }).eq("id", productId).eq("company_id", context.company.id).select("id").maybeSingle();
    if (error || !data)
        redirect(`/products?error=${encodeURIComponent("Não foi possível alterar o produto. Tente novamente.")}`);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/orders/new");
}
export async function addVariantAction(formData: FormData) {
    const productId = productIdFrom(formData);
    const { name, units: unitsPerPackage, cents: priceCents } = variantValues(formData, `/products/${productId}`);
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { error } = await supabase.from("product_variants").insert({
        company_id: context.company.id,
        product_id: productId,
        name,
        units_per_package: unitsPerPackage,
        price_cents: priceCents,
    });
    if (error)
        redirect(`/products/${productId}?error=${encodeURIComponent("Não foi possível adicionar. Confira se já existe uma variação com esse nome.")}`);
    revalidatePath(`/products/${productId}`);
    revalidatePath("/products");
    revalidatePath("/orders/new");
    redirect(`/products/${productId}`);
}
export async function updateVariantAction(formData: FormData) {
    const productId = productIdFrom(formData);
    const variantId = text(formData, "variant_id");
    if (!isUuid(variantId))
        redirect(`/products/${productId}?error=Varia%C3%A7%C3%A3o+inv%C3%A1lida.`);
    const { name, units: unitsPerPackage, cents: priceCents } = variantValues(formData, `/products/${productId}`);
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("product_variants")
        .update({
        name,
        units_per_package: unitsPerPackage,
        price_cents: priceCents,
        is_active: formData.get("is_active") === "on",
    })
        .eq("id", variantId)
        .eq("product_id", productId)
        .eq("company_id", context.company.id).select("id").maybeSingle();
    if (error || !data)
        redirect(`/products/${productId}?error=${encodeURIComponent("Não foi possível atualizar a variação. Confira os dados e tente novamente.")}`);
    revalidatePath(`/products/${productId}`);
    revalidatePath("/products");
    revalidatePath("/orders/new");
    redirect(`/products/${productId}?saved=1`);
}

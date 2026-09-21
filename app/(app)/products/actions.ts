"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth";
import { moneyToCents } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalUnits(formData: FormData) {
  const raw = text(formData, "units_per_package");
  if (!raw) return null;
  const units = Number(raw);
  if (!Number.isInteger(units) || units < 1) throw new Error("A quantidade de unidades deve ser um número inteiro positivo.");
  return units;
}

function price(formData: FormData) {
  const cents = moneyToCents(text(formData, "price"));
  if (!Number.isInteger(cents) || cents < 0) throw new Error("Informe um preço válido.");
  return cents;
}

export async function createProductAction(formData: FormData) {
  const name = text(formData, "name");
  const variantName = text(formData, "variant_name");
  if (!name || !variantName) redirect("/products?error=Preencha+o+produto+e+a+forma+de+venda.");
  const unitsPerPackage = optionalUnits(formData);
  const priceCents = price(formData);

  const context = await getCompanyContext();
  const supabase = await createClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({ company_id: context.company.id, name, description: text(formData, "description") || null })
    .select("id")
    .single();
  if (productError) redirect(`/products?error=${encodeURIComponent(productError.message)}`);

  const { error: variantError } = await supabase.from("product_variants").insert({
    company_id: context.company.id,
    product_id: product.id,
    name: variantName,
    units_per_package: unitsPerPackage,
    price_cents: priceCents,
  });
  if (variantError) redirect(`/products/${product.id}?error=${encodeURIComponent(variantError.message)}`);

  revalidatePath("/products");
  revalidatePath("/orders/new");
  redirect(`/products/${product.id}`);
}

export async function updateProductAction(formData: FormData) {
  const productId = text(formData, "product_id");
  const context = await getCompanyContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ name: text(formData, "name"), description: text(formData, "description") || null })
    .eq("id", productId)
    .eq("company_id", context.company.id);
  if (error) redirect(`/products/${productId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");
  redirect(`/products/${productId}?saved=1`);
}

export async function toggleProductAction(formData: FormData) {
  const productId = text(formData, "product_id");
  const nextState = text(formData, "next_state") === "true";
  const context = await getCompanyContext();
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: nextState }).eq("id", productId).eq("company_id", context.company.id);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");
}

export async function addVariantAction(formData: FormData) {
  const productId = text(formData, "product_id");
  const name = text(formData, "variant_name");
  if (!name) redirect(`/products/${productId}?error=Informe+o+nome+da+forma+de+venda.`);
  const unitsPerPackage = optionalUnits(formData);
  const priceCents = price(formData);
  const context = await getCompanyContext();
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    company_id: context.company.id,
    product_id: productId,
    name,
    units_per_package: unitsPerPackage,
    price_cents: priceCents,
  });
  if (error) redirect(`/products/${productId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/orders/new");
  redirect(`/products/${productId}`);
}

export async function updateVariantAction(formData: FormData) {
  const productId = text(formData, "product_id");
  const variantId = text(formData, "variant_id");
  const unitsPerPackage = optionalUnits(formData);
  const priceCents = price(formData);
  const context = await getCompanyContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_variants")
    .update({
      name: text(formData, "variant_name"),
      units_per_package: unitsPerPackage,
      price_cents: priceCents,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", variantId)
    .eq("company_id", context.company.id);
  if (error) redirect(`/products/${productId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/orders/new");
  redirect(`/products/${productId}?saved=1`);
}

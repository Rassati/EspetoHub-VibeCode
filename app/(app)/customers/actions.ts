"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formText, isUuid } from "@/lib/validation";
const field = formText;
function validFields(formData: FormData) {
    return field(formData, "name").length >= 1 && field(formData, "name").length <= 140 &&
        field(formData, "phone").length <= 40 && field(formData, "address").length <= 500 && field(formData, "notes").length <= 2000;
}
export async function createCustomerAction(formData: FormData) {
    const name = field(formData, "name");
    if (!validFields(formData))
        redirect("/customers?error=Revise+o+nome+e+o+tamanho+dos+campos+do+cliente.");
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { error } = await supabase.from("customers").insert({
        company_id: context.company.id,
        name,
        phone: field(formData, "phone") || null,
        address: field(formData, "address") || null,
        notes: field(formData, "notes") || null,
    });
    if (error)
        redirect(`/customers?error=${encodeURIComponent("Não foi possível salvar o cliente. Confira os dados e tente novamente.")}`);
    revalidatePath("/customers");
    revalidatePath("/orders/new");
    redirect("/customers?saved=1");
}
export async function updateCustomerAction(formData: FormData) {
    const customerId = field(formData, "customer_id");
    const name = field(formData, "name");
    if (!isUuid(customerId))
        redirect("/customers?error=Cliente+inv%C3%A1lido.");
    if (!validFields(formData))
        redirect(`/customers/${customerId}?error=Revise+o+nome+e+o+tamanho+dos+campos+do+cliente.`);
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("customers")
        .update({
        name,
        phone: field(formData, "phone") || null,
        address: field(formData, "address") || null,
        notes: field(formData, "notes") || null,
    })
        .eq("id", customerId)
        .eq("company_id", context.company.id)
        .select("id")
        .maybeSingle();
    if (error || !data)
        redirect(`/customers/${customerId}?error=${encodeURIComponent("Não foi possível atualizar o cliente. Confira os dados e tente novamente.")}`);
    revalidatePath("/customers");
    revalidatePath("/orders/new");
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/orders", "layout");
    redirect(`/customers/${customerId}?saved=1`);
}
export async function deleteCustomerAction(formData: FormData) {
    const customerId = field(formData, "customer_id");
    if (!isUuid(customerId))
        redirect("/customers?error=Cliente+inv%C3%A1lido.");
    const context = await getCompanyContext();
    const supabase = await createClient();
    const { count, error: countError } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.company.id)
        .eq("customer_id", customerId);
    if (countError)
        redirect(`/customers/${customerId}?error=N%C3%A3o+foi+poss%C3%ADvel+verificar+o+hist%C3%B3rico.+Tente+novamente.`);
    if ((count ?? 0) > 0) {
        redirect(`/customers/${customerId}?error=Este+cliente+tem+pedidos+no+hist%C3%B3rico+e+n%C3%A3o+pode+ser+exclu%C3%ADdo.`);
    }
    const { data, error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId)
        .eq("company_id", context.company.id)
        .select("id")
        .maybeSingle();
    if (error || !data)
        redirect(`/customers/${customerId}?error=${encodeURIComponent("Não foi possível excluir. O cliente pode ter recebido um pedido ou não estar mais disponível.")}`);
    revalidatePath("/customers");
    revalidatePath("/orders/new");
    redirect("/customers?deleted=1");
}

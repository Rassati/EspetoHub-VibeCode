"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function createCustomerAction(formData: FormData) {
  const name = field(formData, "name");
  if (!name) redirect("/customers?error=Informe+o+nome+do+cliente.");
  const context = await getCompanyContext();
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    company_id: context.company.id,
    name,
    phone: field(formData, "phone") || null,
    address: field(formData, "address") || null,
    notes: field(formData, "notes") || null,
  });
  if (error) redirect(`/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  redirect("/customers?saved=1");
}

export async function updateCustomerAction(formData: FormData) {
  const customerId = field(formData, "customer_id");
  const name = field(formData, "name");
  if (!customerId || !name) redirect(`/customers/${customerId}?error=Informe+o+nome+do+cliente.`);
  const context = await getCompanyContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: field(formData, "phone") || null,
      address: field(formData, "address") || null,
      notes: field(formData, "notes") || null,
    })
    .eq("id", customerId)
    .eq("company_id", context.company.id);
  if (error) redirect(`/customers/${customerId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  redirect(`/customers/${customerId}?saved=1`);
}

export async function deleteCustomerAction(formData: FormData) {
  const customerId = field(formData, "customer_id");
  const context = await getCompanyContext();
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("company_id", context.company.id)
    .eq("customer_id", customerId);
  if (countError) redirect(`/customers/${customerId}?error=${encodeURIComponent(countError.message)}`);
  if ((count ?? 0) > 0) {
    redirect(`/customers/${customerId}?error=Este+cliente+tem+pedidos+no+hist%C3%B3rico+e+n%C3%A3o+pode+ser+exclu%C3%ADdo.`);
  }
  const { error } = await supabase.from("customers").delete().eq("id", customerId).eq("company_id", context.company.id);
  if (error) redirect(`/customers/${customerId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  redirect("/customers?deleted=1");
}

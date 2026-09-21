"use server";

import { revalidatePath } from "next/cache";
import { getCompanyContext } from "@/lib/auth";
import { orderStatus, type OrderStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type CreateOrderInput = {
  customerId: string;
  discountCents: number;
  notes?: string;
  items: Array<{ variationId: string; quantity: number }>;
};

export async function createOrderAction(input: CreateOrderInput): Promise<{ orderId?: string; error?: string }> {
  if (!input.customerId || input.items.length === 0) return { error: "Escolha um cliente e pelo menos um item." };
  if (!Number.isInteger(input.discountCents) || input.discountCents < 0) return { error: "O desconto informado não é válido." };
  if (input.items.some((item) => !item.variationId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    return { error: "Revise as quantidades do pedido." };
  }

  await getCompanyContext(); // Authenticates before the database transaction.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_customer_id: input.customerId,
    p_discount_cents: input.discountCents,
    p_notes: input.notes?.trim() || null,
    p_items: input.items.map((item) => ({ variation_id: item.variationId, quantity: item.quantity })),
  });
  if (error) return { error: "Não foi possível salvar o pedido. Confira o desconto e tente novamente." };

  revalidatePath("/dashboard");
  revalidatePath("/orders");
  return { orderId: data as string };
}

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!orderId || !(status in orderStatus)) return;
  await getCompanyContext();
  const supabase = await createClient();
  await supabase.rpc("update_order_status", { p_order_id: orderId, p_status: status });
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

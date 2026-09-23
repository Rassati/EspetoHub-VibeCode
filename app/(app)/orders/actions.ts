"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth";
import { orderStatus, type OrderStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { isUuid, validateOrder, type CreateOrderInput } from "@/lib/validation";
export async function createOrderAction(input: CreateOrderInput): Promise<{
    orderId?: string;
    error?: string;
}> {
    await getCompanyContext(); // Authenticates before the database transaction.
    if (!validateOrder(input))
        return { error: "Revise o cliente, os itens, o desconto e as observações do pedido." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_order", {
        p_customer_id: input.customerId,
        p_discount_cents: input.discountCents,
        p_notes: input.notes?.trim() || null,
        p_items: input.items.map((item) => ({ variation_id: item.variationId, quantity: item.quantity })),
    });
    if (error || !isUuid(data))
        return { error: "Não foi possível salvar o pedido. Confira os itens e o desconto e tente novamente." };
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    return { orderId: data as string };
}
export async function updateOrderStatusAction(formData: FormData) {
    const orderId = String(formData.get("order_id") ?? "");
    const status = String(formData.get("status") ?? "") as OrderStatus;
    if (!isUuid(orderId))
        redirect("/orders");
    if (!Object.hasOwn(orderStatus, status))
        redirect(`/orders/${orderId}?error=Status+inv%C3%A1lido.`);
    await getCompanyContext();
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_order_status", { p_order_id: orderId, p_status: status });
    if (error)
        redirect(`/orders/${orderId}?error=${encodeURIComponent("Não foi possível atualizar o status. Tente novamente.")}`);
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}/print`);
    redirect(`/orders/${orderId}?saved=1`);
}

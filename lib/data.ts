import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { dayBoundaries, saoPauloDate } from "@/lib/dates";
import { isUuid } from "@/lib/validation";
import { readAllRows } from "@/lib/pagination";
export { saoPauloDate } from "@/lib/dates";
import type { Customer, Order, OrderItem, Product, ProductVariant, SaleVariant } from "@/types/app";
export async function getProducts(companyId: string, includeInactive = false) {
    const supabase = await createClient();
    return readAllRows<Product>((start, end) => {
        let query = supabase
            .from("products")
            .select("*")
            .eq("company_id", companyId)
            .order("name").order("id").range(start, end);
        if (!includeInactive)
            query = query.eq("is_active", true);
        return query;
    });
}
export async function getVariants(companyId: string, includeInactive = false) {
    const supabase = await createClient();
    return readAllRows<ProductVariant>((start, end) => {
        let query = supabase
            .from("product_variants")
            .select("*")
            .eq("company_id", companyId)
            .order("name").order("id").range(start, end);
        if (!includeInactive)
            query = query.eq("is_active", true);
        return query;
    });
}
export async function getProduct(companyId: string, productId: string) {
    if (!isUuid(productId))
        notFound();
    const supabase = await createClient();
    const [{ data: product, error: productError }, { data: variants, error: variantsError }] = await Promise.all([
        supabase.from("products").select("*").eq("company_id", companyId).eq("id", productId).maybeSingle(),
        supabase.from("product_variants").select("*").eq("company_id", companyId).eq("product_id", productId).order("created_at"),
    ]);
    if (productError)
        throw productError;
    if (!product)
        notFound();
    if (variantsError)
        throw variantsError;
    return { product: product as Product, variants: (variants ?? []) as ProductVariant[] };
}
export async function getCustomers(companyId: string) {
    const supabase = await createClient();
    return readAllRows<Customer>((start, end) => supabase
        .from("customers")
        .select("*")
        .eq("company_id", companyId)
        .order("name").order("id").range(start, end));
}
export async function getCustomer(companyId: string, customerId: string) {
    if (!isUuid(customerId))
        notFound();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", customerId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        notFound();
    return data as Customer;
}
export async function getOrders(companyId: string, page = 1, pageSize = 50) {
    const supabase = await createClient();
    const { data, error, count } = await supabase
        .from("orders")
        .select("*, customers(name)", { count: "exact" })
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
    if (error)
        throw error;
    return { total: count ?? 0, orders: (data ?? []).map((row) => ({
            ...(row as Order),
            customerName: (row.customers as {
                name?: string;
            } | null)?.name ?? "Cliente removido",
        })) };
}
async function fetchOrder(companyId: string, orderId: string, receiptOnly: boolean) {
    if (!isUuid(orderId))
        notFound();
    const supabase = await createClient();
    const [orderResult, itemsResult] = await Promise.all([supabase
            .from("orders")
            .select(receiptOnly ? "*, customers(name, phone)" : "*, customers(name, phone, address)")
            .eq("company_id", companyId)
            .eq("id", orderId)
            .maybeSingle(), supabase
            .from("order_items")
            .select("*")
            .eq("company_id", companyId)
            .eq("order_id", orderId)
            .order("created_at").order("id")]);
    if (orderResult.error)
        throw orderResult.error;
    if (!orderResult.data)
        notFound();
    if (itemsResult.error)
        throw itemsResult.error;
    return {
        order: orderResult.data as unknown as Order & {
            customers: {
                name: string;
                phone: string | null;
                address: string | null;
            } | null;
        },
        items: (itemsResult.data ?? []) as OrderItem[],
    };
}
export function getOrder(companyId: string, orderId: string) {
    return fetchOrder(companyId, orderId, false);
}
export function getReceiptOrder(companyId: string, orderId: string) {
    return fetchOrder(companyId, orderId, true);
}
export async function getDashboardData(companyId: string, date = saoPauloDate()) {
    const supabase = await createClient();
    const { date: validDate, start, end } = dayBoundaries(date);
    const [createdResult, deliveredOrders, pendingResult, items] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("company_id", companyId).neq("status", "cancelled").gte("created_at", start).lt("created_at", end),
        readAllRows<{
            total_cents: number;
        }>((from, to) => supabase.from("orders").select("total_cents").eq("company_id", companyId).eq("status", "delivered").gte("delivered_at", start).lt("delivered_at", end).order("id").range(from, to)),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("status", ["new", "preparing", "ready"]),
        readAllRows<{
            product_name: string;
            quantity: number;
        }>((from, to) => supabase.from("order_items").select("product_name, quantity, orders!inner(id)").eq("company_id", companyId).eq("orders.company_id", companyId).eq("orders.status", "delivered").gte("orders.delivered_at", start).lt("orders.delivered_at", end).order("id").range(from, to)),
    ]);
    if (createdResult.error)
        throw createdResult.error;
    if (pendingResult.error)
        throw pendingResult.error;
    const productTotals = new Map<string, number>();
    (items ?? []).forEach((item) => {
        productTotals.set(item.product_name, (productTotals.get(item.product_name) ?? 0) + Number(item.quantity));
    });
    return {
        date: validDate,
        orderCount: createdResult.count ?? 0,
        revenue: deliveredOrders.reduce((sum, order) => sum + Number(order.total_cents), 0),
        awaiting: pendingResult.count ?? 0,
        completed: deliveredOrders.length,
        bestSellers: [...productTotals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity })),
    };
}
export async function getSaleCatalog(companyId: string): Promise<SaleVariant[]> {
    const [products, variants] = await Promise.all([getProducts(companyId), getVariants(companyId)]);
    const productsById = new Map(products.map((product) => [product.id, product]));
    return variants
        .filter((variant) => productsById.has(variant.product_id))
        .map((variant) => {
        const product = productsById.get(variant.product_id)!;
        return { ...variant, productName: product.name, productImagePath: product.image_path };
    });
}

import { createClient } from "@/lib/supabase/server";
import type { Customer, Order, OrderItem, Product, ProductVariant, SaleVariant } from "@/types/app";

export async function getProducts(companyId: string, includeInactive = false) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getVariants(companyId: string, includeInactive = false) {
  const supabase = await createClient();
  let query = supabase
    .from("product_variants")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProductVariant[];
}

export async function getProduct(companyId: string, productId: string) {
  const supabase = await createClient();
  const [{ data: product, error: productError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase.from("products").select("*").eq("company_id", companyId).eq("id", productId).single(),
    supabase.from("product_variants").select("*").eq("company_id", companyId).eq("product_id", productId).order("created_at"),
  ]);
  if (productError) throw productError;
  if (variantsError) throw variantsError;
  return { product: product as Product, variants: (variants ?? []) as ProductVariant[] };
}

export async function getCustomers(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomer(companyId: string, customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", customerId)
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function getOrders(companyId: string, limit = 100) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, customers(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as Order),
    customerName: (row.customers as { name?: string } | null)?.name ?? "Cliente removido",
  }));
}

export async function getOrder(companyId: string, orderId: string) {
  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, customers(name, phone, address)")
    .eq("company_id", companyId)
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("order_id", orderId)
    .order("created_at");
  if (itemsError) throw itemsError;
  return {
    order: order as Order & { customers: { name: string; phone: string | null; address: string | null } | null },
    items: (items ?? []) as OrderItem[],
  };
}

export function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function dayBoundaries(date: string) {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : saoPauloDate();
  const start = new Date(`${safeDate}T00:00:00-03:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}

export async function getDashboardData(companyId: string, date = saoPauloDate()) {
  const supabase = await createClient();
  const { start, end } = dayBoundaries(date);
  const [createdResult, deliveredResult, pendingResult] = await Promise.all([
    supabase.from("orders").select("id, status, total_cents").eq("company_id", companyId).gte("created_at", start).lt("created_at", end),
    supabase.from("orders").select("id, total_cents").eq("company_id", companyId).eq("status", "delivered").gte("delivered_at", start).lt("delivered_at", end),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("status", ["new", "preparing", "ready"]),
  ]);
  if (createdResult.error) throw createdResult.error;
  if (deliveredResult.error) throw deliveredResult.error;
  if (pendingResult.error) throw pendingResult.error;

  const createdOrders = (createdResult.data ?? []) as Pick<Order, "id" | "status" | "total_cents">[];
  const deliveredOrders = (deliveredResult.data ?? []) as Pick<Order, "id" | "total_cents">[];
  const validCreatedOrders = createdOrders.filter((order) => order.status !== "cancelled");
  const ids = deliveredOrders.map((order) => order.id);
  const { data: items, error: itemError } = ids.length
    ? await supabase.from("order_items").select("product_name, quantity").in("order_id", ids)
    : { data: [], error: null };
  if (itemError) throw itemError;

  const productTotals = new Map<string, number>();
  (items ?? []).forEach((item) => {
    productTotals.set(item.product_name, (productTotals.get(item.product_name) ?? 0) + Number(item.quantity));
  });

  return {
    date,
    orderCount: validCreatedOrders.length,
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
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  return variants
    .filter((variant) => productNames.has(variant.product_id))
    .map((variant) => ({ ...variant, productName: productNames.get(variant.product_id)! }));
}

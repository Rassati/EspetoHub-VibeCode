export const MAX_ORDER_ITEMS = 200;
export const MAX_ITEM_QUANTITY = 10000;
export const MAX_NOTES_LENGTH = 2000;
export function isUuid(value: unknown): value is string {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function formText(formData: FormData, name: string, trim = true) {
    const value = formData.get(name);
    return typeof value === "string" ? (trim ? value.trim() : value) : "";
}
/** Only local, unambiguous paths may be used after authentication. */
export function safeRedirect(value: unknown, fallback = "/dashboard") {
    if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//"))
        return fallback;
    if (/[\\\u0000-\u0020\u007f]/.test(value) || /%(?:25|2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value))
        return fallback;
    try {
        const url = new URL(value, "https://local.invalid");
        return url.origin === "https://local.invalid" && !url.pathname.startsWith("//")
            ? `${url.pathname}${url.search}${url.hash}` : fallback;
    }
    catch {
        return fallback;
    }
}
export type CreateOrderInput = {
    customerId: string;
    discountCents: number;
    notes?: string;
    items: Array<{
        variationId: string;
        quantity: number;
    }>;
};
export function validateOrder(input: unknown): input is CreateOrderInput {
    if (!input || typeof input !== "object")
        return false;
    const order = input as CreateOrderInput;
    if (!isUuid(order.customerId) || !Number.isSafeInteger(order.discountCents) || order.discountCents < 0)
        return false;
    if (order.notes !== undefined && (typeof order.notes !== "string" || order.notes.length > MAX_NOTES_LENGTH))
        return false;
    if (!Array.isArray(order.items) || !order.items.length || order.items.length > MAX_ORDER_ITEMS)
        return false;
    const seen = new Set<string>();
    return order.items.every((item) => {
        if (!item || !isUuid(item.variationId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY)
            return false;
        const key = item.variationId.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}

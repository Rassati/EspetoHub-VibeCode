const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const timestampFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
});
const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", year: "numeric",
});
export function formatCurrency(cents: number | null | undefined) {
    return currencyFormatter.format((cents ?? 0) / 100);
}
export function formatDate(date: string) {
    return timestampFormatter.format(new Date(date));
}
export function formatDay(date: string) {
    return dayFormatter.format(new Date(`${date}T12:00:00Z`));
}
/** Accepts both 12,50 and 12.50 and returns cents. */
export function moneyToCents(value: string) {
    const clean = value.trim().replace(/^R\$\s*/, "");
    let normalized: string;
    if (/^-?\d+(?:[.,]\d{1,2})?$/.test(clean)) {
        normalized = clean.replace(",", ".");
    }
    else if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(clean)) {
        normalized = clean.replace(/\./g, "").replace(",", ".");
    }
    else if (/^-?\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(clean)) {
        normalized = clean.replace(/,/g, "");
    }
    else {
        return NaN;
    }
    const negative = normalized.startsWith("-");
    const [whole, decimal = ""] = normalized.replace(/^-/, "").split(".");
    const cents = (Number(whole) * 100 + Number(decimal.padEnd(2, "0"))) * (negative ? -1 : 1);
    return Number.isSafeInteger(cents) ? cents : NaN;
}

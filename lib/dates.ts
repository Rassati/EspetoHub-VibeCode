const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});
export function saoPauloDate(now = new Date()) {
    const parts = dateFormatter.formatToParts(now);
    const read = (type: string) => parts.find((part) => part.type === type)!.value;
    return `${read("year")}-${read("month")}-${read("day")}`;
}
export function normalizeDate(value: unknown, fallback = saoPauloDate()) {
    if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
        return fallback;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : fallback;
}
export function dayBoundaries(value: unknown) {
    const date = normalizeDate(value);
    // Current Brasília civil time is UTC-3, without daylight saving time.
    const start = new Date(`${date}T00:00:00-03:00`);
    return { date, start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}

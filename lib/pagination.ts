/** Supabase caps each response; keep lists and totals complete beyond that cap. */
export async function readAllRows<T>(load: (start: number, end: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
}>) {
    const rows: T[] = [];
    const pageSize = 500;
    for (let start = 0;; start += pageSize) {
        const { data, error } = await load(start, start + pageSize - 1);
        if (error)
            throw error;
        const page = data ?? [];
        rows.push(...page);
        if (page.length < pageSize)
            return rows;
    }
}

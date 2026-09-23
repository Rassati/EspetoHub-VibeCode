"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function DashboardDatePicker({ date }: {
    date: string;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    return (<label className="dashboard-date">
      <span>{pending ? "Atualizando…" : "Ver outro dia"}</span>
      <input aria-label="Data do painel" type="date" value={date} disabled={pending} onChange={(event) => {
            const value = event.target.value;
            if (value)
                startTransition(() => router.replace(`/dashboard?date=${encodeURIComponent(value)}`, { scroll: false }));
        }}/>
    </label>);
}

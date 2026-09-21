"use client";

import { useRouter } from "next/navigation";

export function DashboardDatePicker({ date }: { date: string }) {
  const router = useRouter();
  return (
    <label className="dashboard-date">
      <span>Ver outro dia</span>
      <input
        aria-label="Data do painel"
        type="date"
        value={date}
        onChange={(event) => router.replace(`/dashboard?date=${event.target.value}`)}
      />
    </label>
  );
}

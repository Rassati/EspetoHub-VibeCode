import { orderStatus, type OrderStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status}`}>{orderStatus[status]}</span>;
}

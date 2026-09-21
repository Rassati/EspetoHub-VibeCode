export const orderStatus = {
  new: "Aberto",
  preparing: "Em preparação",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
} as const;

export type OrderStatus = keyof typeof orderStatus;

export const activeOrderStatuses: OrderStatus[] = ["new", "preparing", "ready"];

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getCompanyContext } from "@/lib/auth";
import { getOrders } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default async function OrdersPage() {
  const { company } = await getCompanyContext();
  const orders = await getOrders(company.id);
  return <section className="page"><div className="page-heading split-heading"><div><p className="eyebrow">Histórico</p><h1>Pedidos</h1><p className="muted">Os 100 pedidos mais recentes da sua empresa.</p></div><Link className="button button-primary" href="/orders/new">+ Novo pedido</Link></div>{orders.length ? <div className="orders-table panel"><div className="table-head"><span>Número</span><span>Cliente</span><span>Data</span><span>Status</span><span>Total</span></div>{orders.map((order) => <Link className="order-row" href={`/orders/${order.id}`} key={order.id}><b>#{order.order_number}</b><span>{order.customerName}</span><time>{formatDate(order.created_at)}</time><StatusBadge status={order.status}/><strong>{formatCurrency(order.total_cents)}</strong></Link>)}</div> : <div className="empty panel"><p>Ainda não há pedidos.</p><Link className="button button-primary" href="/orders/new">Criar o primeiro pedido</Link></div>}</section>;
}

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getCompanyContext } from "@/lib/auth";
import { getOrders } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/formatters";
export default async function OrdersPage({ searchParams }: {
    searchParams: Promise<{
        page?: string;
    }>;
}) {
    const { company } = await getCompanyContext();
    const rawPage = Number((await searchParams).page ?? 1);
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
    const { orders, total } = await getOrders(company.id, page);
    const pages = Math.max(1, Math.ceil(total / 50));
    return (<section className="page">
      <div className="page-heading split-heading"><div><p className="eyebrow">Histórico</p><h1>Pedidos</h1><p className="muted">{total} pedidos no histórico. Até 50 por página.</p></div><Link className="button button-primary" href="/orders/new">+ Novo pedido</Link></div>
      {orders.length ? <div className="orders-table panel"><div className="table-head"><span>Número</span><span>Cliente</span><span>Data</span><span>Status</span><span>Total</span></div>{orders.map((order) => <Link className="order-row" href={`/orders/${order.id}`} key={order.id} prefetch={false}><b>#{order.order_number}</b><span>{order.customerName}</span><time dateTime={order.created_at}>{formatDate(order.created_at)}</time><StatusBadge status={order.status}/><strong>{formatCurrency(order.total_cents)}</strong></Link>)}</div> : <div className="empty panel"><p>{total ? "Não há pedidos nesta página." : "Ainda não há pedidos."}</p><Link className="button button-primary" href={total ? "/orders" : "/orders/new"}>{total ? "Voltar à primeira página" : "Criar o primeiro pedido"}</Link></div>}
      {(pages > 1 || page > 1) && <nav className="pagination" aria-label="Páginas do histórico">{page > 1 && <Link className="button button-secondary" href={`/orders?page=${Math.min(page - 1, pages)}`}>Anteriores</Link>}<span>Página {page} de {pages}</span>{page < pages && <Link className="button button-secondary" href={`/orders?page=${page + 1}`}>Próximos</Link>}</nav>}
    </section>);
}

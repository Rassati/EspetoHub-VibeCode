import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { updateOrderStatusAction } from "@/app/(app)/orders/actions";
import { StatusBadge } from "@/components/status-badge";
import { orderStatus, type OrderStatus } from "@/lib/constants";
import { getCompanyContext } from "@/lib/auth";
import { getOrder } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/formatters";
type Props = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?: string;
        saved?: string;
    }>;
};
export default async function OrderDetailPage({ params, searchParams }: Props) {
    const [{ id }, { company }, options] = await Promise.all([params, getCompanyContext(), searchParams]);
    const { order, items } = await getOrder(company.id, id);
    return (<section className="page">
      <Link className="back-link" href="/orders">← Pedidos</Link>
      {options.error && <p className="form-error" role="alert">{options.error}</p>}
      {options.saved && <p className="form-success" role="status">Status atualizado.</p>}
      <div className="page-heading split-heading">
        <div>
          <p className="eyebrow">Pedido #{order.order_number}</p>
          <h1>{order.customers?.name ?? "Cliente"}</h1>
          <p className="muted">Criado em {formatDate(order.created_at)}</p>
          {order.delivered_at && <p className="muted">Entregue em {formatDate(order.delivered_at)}</p>}
        </div>
        <div className="order-heading-actions">
          <StatusBadge status={order.status}/>
          <Link className="button button-secondary" href={`/orders/${order.id}/print`}>
            Imprimir comanda
          </Link>
        </div>
      </div>
      <div className="content-grid order-detail-grid">
        <section className="panel">
          <h2>Itens</h2>
          <ul className="detail-items">
            {items.map((item) => (<li key={item.id}>
                <div>
                  <strong>{item.quantity} × {item.product_name}</strong>
                  <span>{item.variant_name}{item.total_units ? ` · ${item.total_units} unidades` : ""}</span>
                </div>
                <b>{formatCurrency(item.line_total_cents)}</b>
              </li>))}
          </ul>
          {order.notes && <div className="order-note"><b>Observações</b><p>{order.notes}</p></div>}
          <div className="detail-totals">
            <span>Subtotal <b>{formatCurrency(order.subtotal_cents)}</b></span>
            {order.discount_cents > 0 && <span>Desconto <b>− {formatCurrency(order.discount_cents)}</b></span>}
            <strong>Total <b>{formatCurrency(order.total_cents)}</b></strong>
          </div>
        </section>
        <aside className="panel">
          <h2>Andamento</h2>
          <p className="muted">Atualize o status conforme o pedido avança.</p>
          <form action={updateOrderStatusAction} className="stack-form compact-form">
            <input type="hidden" name="order_id" value={order.id}/>
            <label>Status
              <select name="status" defaultValue={order.status}>
                {(Object.keys(orderStatus) as OrderStatus[]).map((status) => <option value={status} key={status}>{orderStatus[status]}</option>)}
              </select>
            </label>
            <SubmitButton>Atualizar status</SubmitButton>
          </form>
          <hr />
          <h3>Contato</h3>
          <p>{order.customers?.phone || "Telefone não informado"}</p>
          <p>{order.customers?.address || "Endereço não informado"}</p>
        </aside>
      </div>
    </section>);
}

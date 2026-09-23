import { ReceiptPrintControls } from "@/components/receipt-print-controls";
import { getCompanyContext } from "@/lib/auth";
import { orderStatus } from "@/lib/constants";
import { getReceiptOrder } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/formatters";
type Props = {
    params: Promise<{
        id: string;
    }>;
};
export default async function PrintOrderPage({ params }: Props) {
    const [{ id }, { company }] = await Promise.all([params, getCompanyContext()]);
    const { order, items } = await getReceiptOrder(company.id, id);
    return (<main className="receipt-page">
      <link rel="stylesheet" href="/receipt-print.css" media="print" data-receipt-print=""/>
      <ReceiptPrintControls orderId={order.id} orderNumber={order.order_number}/>

      <div className="receipt-sheet">
      <article className="receipt-card">
        <header className="receipt-header">
          <p className="receipt-company">{company.name}</p>
          <h1>COMANDA #{order.order_number}</h1>
          <p>Pedido recebido em {formatDate(order.created_at)}</p>
        </header>

        <dl className="receipt-meta">
          <div>
            <dt>Cliente</dt>
            <dd>{order.customers?.name ?? "Cliente não informado"}</dd>
          </div>
          {order.customers?.phone && (<div>
              <dt>Telefone</dt>
              <dd>{order.customers.phone}</dd>
            </div>)}
          <div>
            <dt>Status</dt>
            <dd>{orderStatus[order.status]}</dd>
          </div>
          {order.delivered_at && (<div>
              <dt>Entregue em</dt>
              <dd>{formatDate(order.delivered_at)}</dd>
            </div>)}
        </dl>

        <section className="receipt-items-section">
          <h2>Itens do pedido</h2>
          <ul className="receipt-items">
            {items.map((item) => (<li key={item.id}>
                <div>
                  <strong>{item.quantity} × {item.product_name}</strong>
                  <span>
                    {item.variant_name}
                    {item.total_units ? ` · ${item.total_units} unidades` : ""}
                    {` · ${formatCurrency(item.unit_price_cents)} cada`}
                  </span>
                </div>
                <b>{formatCurrency(item.line_total_cents)}</b>
              </li>))}
          </ul>
        </section>

        {order.notes && (<section className="receipt-note">
            <h2>Observações</h2>
            <p>{order.notes}</p>
          </section>)}

        <section className="receipt-totals" aria-label="Totais do pedido">
          <span>Subtotal <b>{formatCurrency(order.subtotal_cents)}</b></span>
          {order.discount_cents > 0 && <span>Desconto <b>− {formatCurrency(order.discount_cents)}</b></span>}
          <strong>Total <b>{formatCurrency(order.total_cents)}</b></strong>
        </section>

        <footer className="receipt-footer">
          <p>Obrigado pela preferência!</p>
          <small>Guarde esta comanda para acompanhar o pedido.</small>
        </footer>
      </article>
      </div>
    </main>);
}

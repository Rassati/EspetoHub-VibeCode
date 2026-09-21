import Link from "next/link";
import { DashboardDatePicker } from "@/components/dashboard-date-picker";
import { getCompanyContext } from "@/lib/auth";
import { getDashboardData, saoPauloDate } from "@/lib/data";
import { formatCurrency, formatDay } from "@/lib/formatters";

type Props = { searchParams: Promise<{ date?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const context = await getCompanyContext();
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : saoPauloDate();
  const dashboard = await getDashboardData(context.company.id, selectedDate);
  return (
    <section className="page">
      <div className="page-heading split-heading">
        <div><p className="eyebrow">Painel diário</p><h1>{formatDay(dashboard.date)}</h1><p className="muted">Pedidos recebidos e entregas realizadas nesta data.</p></div>
        <Link className="button button-primary" href="/orders/new">+ Novo pedido</Link>
      </div>
      <DashboardDatePicker date={dashboard.date} />
      <div className="metrics-grid">
        <article className="metric"><span>Pedidos recebidos</span><strong>{dashboard.orderCount}</strong><small>criados neste dia</small></article>
        <article className="metric"><span>Faturamento entregue</span><strong>{formatCurrency(dashboard.revenue)}</strong><small>entregas concluídas neste dia</small></article>
        <article className="metric"><span>Em andamento</span><strong>{dashboard.awaiting}</strong><small>todos os pedidos pendentes</small></article>
        <article className="metric"><span>Entregues no dia</span><strong>{dashboard.completed}</strong><small>pedidos finalizados</small></article>
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="panel-title"><h2>Mais vendidos no dia</h2><Link href="/orders">Ver pedidos</Link></div>
          {dashboard.bestSellers.length ? <ol className="best-sellers">{dashboard.bestSellers.map((item, index) => <li key={item.name}><b>{index + 1}</b><span>{item.name}</span><strong>{item.quantity} pacotes</strong></li>)}</ol> : <Empty text="Os produtos entregues nesta data aparecerão aqui." />}
        </section>
        <section className="panel quick-start">
          <h2>Comece por aqui</h2>
          <p className="muted">Antes do primeiro pedido, cadastre ao menos um produto e um cliente.</p>
          <Link href="/products" className="button button-secondary">Cadastrar produtos</Link>
          <Link href="/customers" className="button button-ghost">Cadastrar cliente</Link>
        </section>
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "@/app/sales.module.css";
const orders = [
    { name: "Mariana Costa", initials: "MC", item: "Espeto de carne · 2 pacotes", amount: 90, status: "Em preparo", tone: "preparing" },
    { name: "João Almeida", initials: "JA", item: "Espeto de frango · 3 pacotes", amount: 105, status: "Pronto", tone: "ready" },
    { name: "Ana Oliveira", initials: "AO", item: "Espetos variados · 4 pacotes", amount: 160, status: "Entregue", tone: "delivered" },
    { name: "Pedro Santos", initials: "PS", item: "Espeto de carne · 1 pacote", amount: 45, status: "Novo", tone: "newOrder" },
];
const demoCurrency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const money = (value: number) => demoCurrency.format(value);
const periods = {
    today: { revenue: 845, received: 24, pending: 7, labels: ["09h", "10h", "11h", "12h", "13h", "14h", "15h", "16h"], values: [35, 55, 42, 86, 61, 94, 72, 100] },
    week: { revenue: 5280, received: 146, pending: 18, labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"], values: [45, 62, 54, 74, 88, 100, 68] },
};
export function SalesDemo() {
    const [period, setPeriod] = useState<"today" | "week">("today");
    const [view, setView] = useState<"overview" | "orders">("overview");
    const [filter, setFilter] = useState("Todos");
    const data = periods[period];
    const shownOrders = view === "overview" ? orders.slice(0, 3) : orders.filter((order) => filter === "Todos" || order.status === filter);
    return <div className={styles.demo}>
    <aside className={styles.demoSidebar}><span className={styles.demoBrand}><span className={styles.brandIcon}>eh</span> Espeto Hub</span><span className={styles.demoCompany}>Espetaria da Vila<small>Empresa de demonstração</small></span><nav aria-label="Demonstração do painel"><button type="button" aria-pressed={view === "overview"} className={view === "overview" ? styles.activeNav : ""} onClick={() => setView("overview")}><span aria-hidden="true">▦</span> Visão geral</button><button type="button" aria-pressed={view === "orders"} className={view === "orders" ? styles.activeNav : ""} onClick={() => setView("orders")}><span aria-hidden="true">▤</span> Pedidos <b>4</b></button></nav><div className={styles.demoSidebarBottom}><span className={styles.demoAvatar}>EV</span><div>Espetaria da Vila<small>Sua empresa organizada</small></div></div></aside>
    <div className={styles.demoMain}>
      <div className={styles.demoToolbar}><span>Painel da empresa <span aria-hidden="true">/</span> <b>{view === "overview" ? "Visão geral" : "Pedidos"}</b></span><span className={styles.demoBadge}>Demonstração</span></div>
      <div className={styles.demoContent}>
        <div className={styles.demoTitle}><div><h3>{view === "overview" ? "Tudo pronto para mais um dia." : "Cada pedido, uma etapa."}</h3><p>{view === "overview" ? "Veja como estão as vendas da sua empresa." : "Filtre os exemplos e acompanhe o atendimento."}</p></div>{view === "overview" ? <div className={styles.period} aria-label="Período da demonstração"><button type="button" aria-pressed={period === "today"} onClick={() => setPeriod("today")}>Hoje</button><button type="button" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Esta semana</button></div> : <Link href="/signup" className={styles.demoCreate}>Criar minha conta</Link>}</div>
        {view === "overview" && <>
          <div className={styles.demoMetrics} aria-live="polite"><article><span>Valor das entregas <i aria-hidden="true">↗</i></span><strong>{money(data.revenue)}<small>,00</small></strong><p>Pedidos entregues no período</p></article><article><span>Pedidos recebidos <i aria-hidden="true">▤</i></span><strong>{data.received}</strong><p>Movimento do período</p></article><article><span>Pedidos em andamento <i aria-hidden="true">◷</i></span><strong>{data.pending}</strong><p>Para preparar ou entregar</p></article></div>
          <div className={styles.demoCharts}><div className={styles.chartPanel}><div className={styles.chartTitle}><h4>Movimento de vendas</h4><span><i /> Entregas</span></div><div className={styles.chart} role="img" aria-label={`Gráfico ilustrativo de entregas: ${period === "today" ? "por hora, das 09h às 16h" : "por dia, de segunda a domingo"}. Valores fictícios.`}>{data.values.map((value, i) => <div key={data.labels[i]} className={styles.chartColumn}><div className={styles.barTrack}><div style={{ height: `${value}%` }}/></div><span>{data.labels[i]}</span></div>)}</div></div><div className={styles.bestProducts}><h4>Mais vendidos</h4><p>Os favoritos dos seus clientes</p>{[["Carne", "48", "84%"], ["Frango", "36", "64%"], ["Queijo coalho", "24", "43%"]].map(([name, amount, width]) => <div key={name}><span>{name}<b>{amount} un.</b></span><div className={styles.productTrack}><i style={{ width }}/></div></div>)}<small>Quantidades fictícias para ilustrar o painel.</small></div></div>
        </>}
        <div className={styles.recentOrders}><div className={styles.chartTitle}><h4>{view === "overview" ? "Últimos pedidos" : "Pedidos de demonstração"}</h4>{view === "overview" && <button type="button" onClick={() => setView("orders")}>Ver todos</button>}</div>{view === "orders" && <div className={styles.filters} aria-label="Filtrar por status">{["Todos", "Novo", "Em preparo", "Pronto", "Entregue"].map(status => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status}</button>)}</div>}<div className={styles.orderTable}><table><thead><tr><th scope="col">Cliente / pedido</th><th scope="col">Status</th><th scope="col">Valor</th></tr></thead><tbody>{shownOrders.map(order => <tr key={order.name}><td><div className={styles.customer}><span className={styles.demoAvatar}>{order.initials}</span><div><b>{order.name}</b><small>{order.item}</small></div></div></td><td><span className={`${styles.orderStatus} ${styles[order.tone]}`}>{order.status}</span></td><td>{money(order.amount)},00</td></tr>)}</tbody></table></div><span className={styles.srOnly} aria-live="polite">{shownOrders.length} pedidos exibidos.</span></div>
      </div>
    </div>
  </div>;
}

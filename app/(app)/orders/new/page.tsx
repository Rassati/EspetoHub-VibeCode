import Link from "next/link";
import { NewOrderForm } from "@/components/new-order-form";
import { getCompanyContext } from "@/lib/auth";
import { getCustomers, getSaleCatalog } from "@/lib/data";
export default async function NewOrderPage() {
    const { company } = await getCompanyContext();
    const [customers, catalog] = await Promise.all([getCustomers(company.id), getSaleCatalog(company.id)]);
    const needsSetup = !customers.length || !catalog.length;
    return <section className="page"><div className="page-heading split-heading"><div><p className="eyebrow">Atendimento rápido</p><h1>Novo pedido</h1><p className="muted">Escolha o cliente, toque nos itens e salve.</p></div><Link href="/orders" className="button button-ghost">Ver histórico</Link></div>{needsSetup && <p className="setup-note">Para registrar um pedido, você precisa ter ao menos <Link href="/customers">um cliente</Link> e <Link href="/products">um produto ativo</Link> cadastrados.</p>}<NewOrderForm customers={customers.map(({ id, name, phone }) => ({ id, name, phone }))} catalog={catalog}/></section>;
}

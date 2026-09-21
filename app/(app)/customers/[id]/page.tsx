import Link from "next/link";
import { updateCustomerAction } from "@/app/(app)/customers/actions";
import { DeleteCustomerForm } from "@/components/delete-customer-form";
import { getCompanyContext } from "@/lib/auth";
import { getCustomer } from "@/lib/data";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> };

export default async function CustomerDetailPage({ params, searchParams }: Props) {
  const [{ id }, options, { company }] = await Promise.all([params, searchParams, getCompanyContext()]);
  const customer = await getCustomer(company.id, id);
  return (
    <section className="page narrow-page">
      <Link href="/customers" className="back-link">← Clientes</Link>
      <div className="page-heading"><p className="eyebrow">Editar cliente</p><h1>{customer.name}</h1><p className="muted">Atualize os dados para facilitar o próximo atendimento.</p></div>
      {options.error && <p className="form-error">{options.error}</p>}
      {options.saved && <p className="form-success">Dados do cliente atualizados.</p>}
      <section className="panel">
        <form action={updateCustomerAction} className="stack-form compact-form">
          <input type="hidden" name="customer_id" value={customer.id} />
          <label>Nome<input required name="name" defaultValue={customer.name} /></label>
          <label>Telefone <small>opcional</small><input name="phone" inputMode="tel" defaultValue={customer.phone ?? ""} /></label>
          <label>Endereço <small>opcional</small><textarea name="address" rows={3} defaultValue={customer.address ?? ""} /></label>
          <label>Observações <small>opcional</small><textarea name="notes" rows={3} defaultValue={customer.notes ?? ""} /></label>
          <button className="button button-primary">Salvar alterações</button>
        </form>
      </section>
      <section className="danger-zone">
        <div><h2>Excluir cliente</h2><p>Clientes sem pedidos podem ser apagados definitivamente. Clientes com pedidos ficam protegidos para não alterar o histórico de vendas.</p></div>
        <DeleteCustomerForm customerId={customer.id} customerName={customer.name} />
      </section>
    </section>
  );
}

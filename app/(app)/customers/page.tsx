import Link from "next/link";
import { createCustomerAction } from "@/app/(app)/customers/actions";
import { getCompanyContext } from "@/lib/auth";
import { getCustomers } from "@/lib/data";

type Props = {
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
};

export default async function CustomersPage({ searchParams }: Props) {
  const [{ company }, params] = await Promise.all([getCompanyContext(), searchParams]);
  const customers = await getCustomers(company.id);

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Agenda</p>
        <h1>Clientes</h1>
        <p className="muted">Guarde os dados que ajudam no próximo atendimento.</p>
      </div>

      {params.error && <p className="form-error">{params.error}</p>}
      {params.saved && <p className="form-success">Cliente cadastrado.</p>}
      {params.deleted && <p className="form-success">Cliente excluído.</p>}

      <div className="content-grid customers-layout">
        <section className="panel sticky-panel">
          <h2>Novo cliente</h2>
          <form action={createCustomerAction} className="stack-form compact-form">
            <label>
              Nome
              <input required name="name" placeholder="Ex.: João da Silva" />
            </label>
            <label>
              Telefone <small>opcional</small>
              <input name="phone" inputMode="tel" placeholder="(11) 99999-9999" />
            </label>
            <label>
              Endereço <small>opcional</small>
              <textarea name="address" rows={2} placeholder="Rua, número e bairro" />
            </label>
            <label>
              Observações <small>opcional</small>
              <textarea name="notes" rows={2} placeholder="Ex.: entregar depois das 18h" />
            </label>
            <button className="button button-primary">Salvar cliente</button>
          </form>
        </section>

        <section>
          <div className="panel-title">
            <h2>Todos os clientes</h2>
            <span className="count-pill">{customers.length}</span>
          </div>

          {customers.length ? (
            <div className="customer-list">
              {customers.map((customer) => (
                <Link className="customer-card" href={`/customers/${customer.id}`} key={customer.id}>
                  <div className="avatar">{customer.name.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <h3>{customer.name}</h3>
                    <p>{customer.phone || "Sem telefone"}</p>
                    {customer.address && <small>{customer.address}</small>}
                  </div>
                  <b className="edit-customer">Editar →</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty panel">Cadastre um cliente para começar a registrar pedidos.</p>
          )}
        </section>
      </div>
    </section>
  );
}

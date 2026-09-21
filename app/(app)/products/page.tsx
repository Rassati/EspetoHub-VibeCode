import Link from "next/link";
import { createProductAction, toggleProductAction } from "@/app/(app)/products/actions";
import { getCompanyContext } from "@/lib/auth";
import { getProducts, getVariants } from "@/lib/data";
import { formatCurrency } from "@/lib/formatters";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const [{ company }, params] = await Promise.all([getCompanyContext(), searchParams]);
  const [products, variants] = await Promise.all([getProducts(company.id, true), getVariants(company.id, true)]);
  const variantsByProduct = new Map<string, typeof variants>();
  variants.forEach((variant) => variantsByProduct.set(variant.product_id, [...(variantsByProduct.get(variant.product_id) ?? []), variant]));

  return (
    <section className="page">
      <div className="page-heading"><p className="eyebrow">Catálogo</p><h1>Produtos</h1><p className="muted">Cadastre o produto uma vez e adicione as formas de venda que precisar.</p></div>
      {params.error && <p className="form-error">{params.error}</p>}
      <div className="content-grid products-layout">
        <section className="panel sticky-panel">
          <h2>Novo produto</h2>
          <p className="muted">Comece com a primeira variação. Depois você pode adicionar outras.</p>
          <form action={createProductAction} className="stack-form compact-form">
            <label>Nome do produto<input required name="name" placeholder="Ex.: Espeto de carne" /></label>
            <label>Descrição <small>opcional</small><textarea name="description" rows={2} placeholder="Ex.: congelado, pronto para assar" /></label>
            <fieldset><legend>Primeira forma de venda</legend>
              <label>Nome da variação<input required name="variant_name" placeholder="Ex.: Pacote com 10" /></label>
              <div className="form-two"><label>Unidades <small>opcional</small><input name="units_per_package" type="number" min="1" placeholder="10" /></label><label>Preço (R$)<input required name="price" inputMode="decimal" placeholder="25,00" /></label></div>
            </fieldset>
            <button className="button button-primary" type="submit">Salvar produto</button>
          </form>
        </section>
        <section className="product-list">
          <div className="panel-title"><h2>Seu catálogo</h2><span className="count-pill">{products.length}</span></div>
          {products.length === 0 ? <p className="empty panel">Ainda não há produtos. Cadastre o primeiro ao lado.</p> : products.map((product) => {
            const productVariants = variantsByProduct.get(product.id) ?? [];
            return <article className="product-card" key={product.id}>
              <div><div className="split-heading"><h3>{product.name}</h3>{!product.is_active && <span className="status status-cancelled">Inativo</span>}</div><p>{product.description || "Sem descrição"}</p></div>
              <ul>{productVariants.map((variant) => <li key={variant.id}><span>{variant.name}{variant.units_per_package ? ` · ${variant.units_per_package} un.` : ""}{!variant.is_active ? " · inativa" : ""}</span><b>{formatCurrency(variant.price_cents)}</b></li>)}</ul>
              <div className="card-actions"><Link href={`/products/${product.id}`} className="button button-secondary">Editar</Link><form action={toggleProductAction}><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="next_state" value={String(!product.is_active)} /><button className="text-button" type="submit">{product.is_active ? "Desativar" : "Ativar"}</button></form></div>
            </article>;
          })}
        </section>
      </div>
    </section>
  );
}

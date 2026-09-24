import { createProductAction, quickAddVariantAction, toggleProductAction } from "@/app/(app)/products/actions";
import { ProductEntryForm } from "@/components/product-entry-form";
import { ProductCatalog } from "@/components/product-catalog";
import { getCompanyContext } from "@/lib/auth";
import { getProducts, getVariants } from "@/lib/data";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const [{ company }, params] = await Promise.all([getCompanyContext(), searchParams]);
  const [products, variants] = await Promise.all([getProducts(company.id, true), getVariants(company.id, true)]);
  return <section className="page">
    <div className="page-heading"><p className="eyebrow">Cardápio</p><h1>Produtos</h1><p className="muted">Cadastre, encontre e organize os produtos da sua churrascaria.</p></div>
    {params.error && <p className="form-error" role="alert">{params.error}</p>}
    <div className="content-grid products-layout">
      <ProductEntryForm createAction={createProductAction} variantAction={quickAddVariantAction}/>
      <ProductCatalog
        products={products.map(({ id, name, description, image_path, is_active }) => ({ id, name, description, image_path, is_active }))}
        variants={variants.map(({ id, product_id, name, price_cents, units_per_package, is_active }) => ({ id, product_id, name, price_cents, units_per_package, is_active }))}
        toggleAction={toggleProductAction}/>
    </div>
  </section>;
}

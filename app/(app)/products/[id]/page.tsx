import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { quickAddVariantAction, toggleProductAction, updateProductAction, updateVariantAction } from "@/app/(app)/products/actions";
import { VariantEntryForm } from "@/components/product-entry-form";
import { ProductImageUploader } from "@/components/product-image-uploader";
import { getCompanyContext } from "@/lib/auth";
import { getProduct } from "@/lib/data";
import { formatCurrency } from "@/lib/formatters";
type Props = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?: string;
        saved?: string;
    }>;
};
export default async function ProductDetailPage({ params, searchParams }: Props) {
    const [{ id }, options, { company }] = await Promise.all([params, searchParams, getCompanyContext()]);
    const { product, variants } = await getProduct(company.id, id);
    return (<section className="page">
      <Link href="/products" className="back-link">← Produtos</Link>
      <div className="page-heading split-heading"><div><p className="eyebrow">Editar produto</p><h1>{product.name}</h1></div><form action={toggleProductAction}><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="next_state" value={String(!product.is_active)}/><button className="button button-secondary" type="submit">{product.is_active ? "Desativar" : "Ativar"}</button></form></div>
      {options.error && <p className="form-error">{options.error}</p>}{options.saved && <p className="form-success">Alterações salvas.</p>}
      <div className="content-grid product-detail-layout">
        <section className="panel"><h2>Informações</h2><form action={updateProductAction} className="stack-form compact-form"><input type="hidden" name="product_id" value={product.id}/><label>Nome<input required name="name" maxLength={140} defaultValue={product.name}/></label><label>Descrição<textarea name="description" maxLength={2000} rows={3} defaultValue={product.description ?? ""}/></label><SubmitButton>Salvar informações</SubmitButton></form></section>
        <section className="panel product-photo-panel"><ProductImageUploader key={product.image_path ?? "no-image"} companyId={company.id} productId={product.id} initialImagePath={product.image_path} productName={product.name}/></section>
        <section className="panel"><VariantEntryForm productId={product.id} productName={product.name} action={quickAddVariantAction}/></section>
      </div>
      <section className="panel variants-panel"><div className="panel-title"><h2>Formas de venda</h2><span className="count-pill">{variants.length}</span></div>{variants.length === 0 ? <p className="empty">Este produto ainda não tem formas de venda.</p> : <div className="variant-list">{variants.map((variant) => <form action={updateVariantAction} className="variant-editor" key={variant.id}><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="variant_id" value={variant.id}/><label>Nome<input required name="variant_name" maxLength={100} defaultValue={variant.name}/></label><label>Unidades<input name="units_per_package" type="number" min="1" defaultValue={variant.units_per_package ?? ""}/></label><label>Preço (R$)<input required name="price" inputMode="decimal" defaultValue={(variant.price_cents / 100).toFixed(2).replace(".", ",")}/></label><label className="check-label"><input name="is_active" type="checkbox" defaultChecked={variant.is_active}/><span>Ativa</span></label><SubmitButton className="button button-secondary">Salvar</SubmitButton><b>{formatCurrency(variant.price_cents)}</b></form>)}</div>}</section>
    </section>);
}

// Local fixture only: real client components, in-memory fake actions, no credentials.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ProductEntryForm, VariantEntryForm } from "@/components/product-entry-form";
import { ProductCatalog, type CatalogProduct, type CatalogVariant } from "@/components/product-catalog";
import { NewOrderForm } from "@/components/new-order-form";

const initialProducts: CatalogProduct[] = Array.from({ length: 60 }, (_, index) => ({
  id: `product-${index}`, name: index === 0 ? "Linguiças artesanais da churrascaria" : `Produto ${String(index).padStart(2, "0")} — espeto especial da casa`,
  description: index === 0 ? "Quatro sabores para escolher" : null, image_path: null, is_active: true,
}));
const initialVariants: CatalogVariant[] = initialProducts.flatMap((product, index) => (index === 0
  ? ["Toscana", "Apimentada", "Com queijo", "De frango com ervas finas e tempero especial"] : ["Padrão"]
).map((name, option) => ({ id: `variant-${index}-${option}`, product_id: product.id, name, price_cents: 1590 + option * 100, units_per_package: null, is_active: true })));

function Preview() {
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [mode, setMode] = useState("catalog");
  const [failure, setFailure] = useState(false);
  const pause = () => new Promise(resolve => setTimeout(resolve, 300));
  async function create(data: FormData) {
    await pause();
    if (failure) return { error: "Falha simulada: confira o preço. Seus dados foram mantidos." };
    const productId = crypto.randomUUID();
    const productName = String(data.get("name"));
    const variantName = String(data.get("variant_name") || "Padrão");
    setProducts(current => [{ id: productId, name: productName, description: null, image_path: null, is_active: true }, ...current]);
    setVariants(current => [...current, { id: crypto.randomUUID(), product_id: productId, name: variantName, price_cents: 1590, units_per_package: null, is_active: true }]);
    return { productId, productName, variantName };
  }
  async function add(data: FormData) {
    await pause();
    if (failure) return { error: "Falha simulada: confira o preço. Seus dados foram mantidos." };
    const productId = String(data.get("product_id"));
    const variantName = String(data.get("variant_name"));
    setVariants(current => [...current, { id: crypto.randomUUID(), product_id: productId, name: variantName, price_cents: 1500, units_per_package: null, is_active: true }]);
    return { productId, productName: products.find(product => product.id === productId)?.name, variantName };
  }
  return <>
    <nav className="fixture-toolbar" aria-label="Teste local">
      <strong>Prévia • dados fictícios</strong>
      <button onClick={() => setMode("catalog")}>Cadastro e catálogo</button>
      <button onClick={() => setMode("order")}>Novo pedido</button>
      <button onClick={() => setMode("variants")}>Editar variações</button>
      <label><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)}/>Simular erro</label>
    </nav>
    <div className="app-shell"><aside className="sidebar"><b className="logo">Espeto Hub</b><p>Churrascaria de demonstração</p></aside><main className="app-main"><section className="page">
      <div className="page-heading"><p className="eyebrow">Cardápio</p><h1>{mode === "order" ? "Novo pedido" : "Produtos"}</h1><p className="muted">Cadastre, encontre e organize os produtos da sua churrascaria.</p></div>
      {mode === "catalog" && <div className="content-grid products-layout"><ProductEntryForm createAction={create} variantAction={add}/><ProductCatalog products={products} variants={variants} toggleAction={async data => {setProducts(current => current.map(product => product.id === data.get("product_id") ? {...product, is_active: data.get("next_state") === "true"} : product));}}/></div>}
      {mode === "order" && <NewOrderForm customers={[{id:"customer",name:"Cliente de demonstração",phone:"11999990000"}]} catalog={variants.map(variant => ({...variant, company_id:"demo",created_at:"2026-09-23",track_inventory:false, productName:products.find(product => product.id===variant.product_id)!.name, productImagePath:null}))}/>}
      {mode === "variants" && <><section className="panel"><VariantEntryForm productId="product-0" productName={products.find(product => product.id === "product-0")!.name} action={add}/></section><section className="panel variants-panel"><h2>Variações cadastradas</h2><div className="variant-list">{variants.filter(v=>v.product_id==="product-0").map(v=><form className="variant-editor" key={v.id}><label>Nome<input defaultValue={v.name}/></label><label>Unidades<input type="number"/></label><label>Preço (R$)<input defaultValue="15,90"/></label><label className="check-label"><input type="checkbox" defaultChecked/><span>Ativa</span></label><button type="button" className="button button-secondary">Salvar</button></form>)}</div></section></>}
    </section></main></div>
  </>;
}
createRoot(document.getElementById("root")!).render(<Preview/>);

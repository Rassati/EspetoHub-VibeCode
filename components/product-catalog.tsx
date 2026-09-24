"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { catalogSearchText } from "@/lib/product-entry";
import { productImageUrl } from "@/lib/product-images";
import type { Product, ProductVariant } from "@/types/app";
import { SubmitButton } from "@/components/submit-button";

export type CatalogProduct = Pick<Product, "id" | "name" | "description" | "image_path" | "is_active">;
export type CatalogVariant = Pick<ProductVariant, "id" | "product_id" | "name" | "price_cents" | "units_per_package" | "is_active">;
const PAGE_SIZE = 12;

export function ProductCatalog({ products, variants, toggleAction }: {
  products: CatalogProduct[]; variants: CatalogVariant[]; toggleAction: (data: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const indexed = useMemo(() => {
    const byProduct = new Map<string, CatalogVariant[]>();
    for (const variant of variants) {
      const group = byProduct.get(variant.product_id) || [];
      group.push(variant); byProduct.set(variant.product_id, group);
    }
    return products.map(product => {
      const options = byProduct.get(product.id) || [];
      return { product, options, search: catalogSearchText([product.name, ...options.map(option => option.name)].join(" ")) };
    });
  }, [products, variants]);
  const matches = useMemo(() => indexed.filter(({ product, search }) =>
    (filter === "all" || product.is_active === (filter === "active")) && search.includes(catalogSearchText(deferredQuery)),
  ), [indexed, filter, deferredQuery]);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = matches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <section className="product-list" aria-labelledby="catalog-heading">
    <div className="panel-title"><h2 id="catalog-heading">Seu catálogo</h2><span className="count-pill">{products.length}</span></div>
    <div className="product-catalog-tools">
      <label>Buscar no cardápio<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Nome do produto ou da variação"/></label>
      <label>Mostrar<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
    </div>
    <div className="catalog-results-row"><p className="catalog-results" role="status">{matches.length} {matches.length === 1 ? "produto encontrado" : "produtos encontrados"}{pages > 1 ? ` · página ${currentPage} de ${pages}` : ""}</p>{query && <button type="button" className="text-button" onClick={() => { setQuery(""); setPage(1); }}>Limpar busca</button>}</div>
    {visible.length === 0 ? <p className="empty panel">{products.length ? "Nenhum produto encontrado. Tente outro nome ou filtro." : "Seu primeiro produto aparecerá aqui depois de salvar."}</p> : visible.map(({ product, options }) => {
      const search = catalogSearchText(deferredQuery);
      const isMatch = (option: CatalogVariant) => catalogSearchText(option.name).includes(search);
      const rankedOptions = search ? [...options.filter(isMatch), ...options.filter(option => !isMatch(option))] : options;
      return <article className="product-card" key={product.id}>
      <div className="product-card-header">
        <div className="product-image-thumbnail">{productImageUrl(product.image_path) ? <img src={productImageUrl(product.image_path)!} alt="" width={64} height={64} loading="lazy" decoding="async"/> : <span aria-hidden="true">◈</span>}</div>
        <div><div className="split-heading"><h3>{product.name}</h3>{!product.is_active && <span className="status status-cancelled">Inativo</span>}</div>{product.description && <p>{product.description}</p>}</div>
      </div>
      <ul>{rankedOptions.slice(0, 4).map(variant => <li key={variant.id}><span><strong>{variant.name === "Padrão" ? "Preço" : variant.name}</strong>{variant.units_per_package ? ` · ${variant.units_per_package} un.` : ""}{!variant.is_active ? " · inativa" : ""}</span><b>{formatCurrency(variant.price_cents)}</b></li>)}</ul>
      {options.length > 4 && <p className="field-help">Mais {options.length - 4} variações. Abra o produto para ver todas.</p>}
      <div className="card-actions"><Link href={`/products/${product.id}`} prefetch={false} className="button button-secondary">Editar / variações</Link><form action={toggleAction}><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="next_state" value={String(!product.is_active)}/><SubmitButton className="text-button">{product.is_active ? "Desativar" : "Ativar"}</SubmitButton></form></div>
    </article>; })}
    {pages > 1 && <nav className="pagination" aria-label="Páginas do catálogo"><button type="button" className="button button-ghost" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>{currentPage} de {pages}</span><button type="button" className="button button-ghost" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Próxima</button></nav>}
  </section>;
}

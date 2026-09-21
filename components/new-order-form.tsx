"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/(app)/orders/actions";
import { formatCurrency, moneyToCents } from "@/lib/formatters";
import { productImageUrl } from "@/lib/product-images";
import type { Customer, SaleVariant } from "@/types/app";

type CartItem = { variant: SaleVariant; quantity: number };
type CatalogProduct = {
  id: string;
  name: string;
  imagePath: string | null;
  variants: SaleVariant[];
};

function searchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
}

function ProductThumbnail({ name, imagePath }: { name: string; imagePath: string | null }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = imagePath ? productImageUrl(imagePath) : null;

  return (
    <div className="catalog-product-image" aria-hidden="true">
      {imageUrl && !failed ? <img src={imageUrl} alt="" onError={() => setFailed(true)} /> : <span>{initials(name)}</span>}
    </div>
  );
}

export function NewOrderForm({ customers, catalog }: { customers: Customer[]; catalog: SaleVariant[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<"all" | "in-cart">("all");
  const [isPending, startTransition] = useTransition();

  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.quantity * item.variant.price_cents, 0), [cart]);
  const discountCents = discount ? moneyToCents(discount) : 0;
  const safeDiscount = Number.isFinite(discountCents) ? discountCents : 0;
  const total = Math.max(0, subtotal - safeDiscount);
  const groups = useMemo(() => {
    const groupMap = new Map<string, CatalogProduct>();
    catalog.forEach((variant) => {
      const current = groupMap.get(variant.product_id);
      if (current) {
        current.variants.push(variant);
        return;
      }
      groupMap.set(variant.product_id, {
        id: variant.product_id,
        name: variant.productName,
        imagePath: variant.productImagePath,
        variants: [variant],
      });
    });
    return [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [catalog]);
  const quantitiesByVariation = useMemo(() => new Map(cart.map((item) => [item.variant.id, item.quantity])), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
  const visibleGroups = useMemo(() => {
    const query = searchText(catalogQuery.trim());
    return groups.filter((product) => {
      const quantity = product.variants.reduce((total, variant) => total + (quantitiesByVariation.get(variant.id) ?? 0), 0);
      const matchesFilter = catalogFilter === "all" || quantity > 0;
      const matchesSearch = !query || searchText(`${product.name} ${product.variants.map((variant) => variant.name).join(" ")}`).includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [catalogFilter, catalogQuery, groups, quantitiesByVariation]);

  function add(variant: SaleVariant) {
    setCart((current) => {
      const found = current.find((item) => item.variant.id === variant.id);
      return found
        ? current.map((item) => item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { variant, quantity: 1 }];
    });
  }

  function changeQuantity(variationId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.variant.id !== variationId) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  }

  function save() {
    setError("");
    if (!customerId) return setError("Escolha o cliente antes de salvar.");
    if (!cart.length) return setError("Adicione pelo menos um item ao pedido.");
    if (!Number.isFinite(discountCents) || safeDiscount > subtotal) return setError("Informe um desconto válido, menor que o subtotal.");
    startTransition(async () => {
      const result = await createOrderAction({
        customerId,
        discountCents: safeDiscount,
        notes,
        items: cart.map((item) => ({ variationId: item.variant.id, quantity: item.quantity })),
      });
      if (result.error) return setError(result.error);
      router.push(`/orders/${result.orderId}`);
      router.refresh();
    });
  }

  return (
    <div className="order-builder">
      <section className="order-workspace">
        <div className="order-step"><span>1</span><div><h2>Cliente</h2><p>Quem está fazendo o pedido?</p></div></div>
        <select className="customer-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">Selecione um cliente</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
        </select>
        <div className="order-step"><span>2</span><div><h2>Itens</h2><p>Busque ou toque em uma forma de venda para adicionar.</p></div></div>
        {groups.length ? <>
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <span className="sr-only">Buscar produto ou forma de venda</span>
              <span aria-hidden="true">⌕</span>
              <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Buscar produto" type="search" />
            </label>
            <span className="catalog-result-count" aria-live="polite">{visibleGroups.length} {visibleGroups.length === 1 ? "produto" : "produtos"}</span>
          </div>
          <div className="catalog-filters" aria-label="Filtrar catálogo">
            <button type="button" className={catalogFilter === "all" ? "is-active" : ""} aria-pressed={catalogFilter === "all"} onClick={() => setCatalogFilter("all")}>Todos</button>
            <button type="button" className={catalogFilter === "in-cart" ? "is-active" : ""} aria-pressed={catalogFilter === "in-cart"} onClick={() => setCatalogFilter("in-cart")}>No pedido {cartItemCount ? `(${cartItemCount})` : ""}</button>
          </div>
          {visibleGroups.length ? <div className="sale-catalog">{visibleGroups.map((product) => {
            const productQuantity = product.variants.reduce((total, variant) => total + (quantitiesByVariation.get(variant.id) ?? 0), 0);
            return <article className="catalog-product-card" key={product.id}>
              <div className="catalog-product-heading">
                <ProductThumbnail name={product.name} imagePath={product.imagePath} />
                <div><h3>{product.name}</h3><span>{product.variants.length === 1 ? "1 forma de venda" : `${product.variants.length} formas de venda`}</span></div>
                {productQuantity > 0 && <b className="catalog-cart-count" aria-label={`${productQuantity} itens deste produto no pedido`}>{productQuantity}</b>}
              </div>
              <div className="catalog-variants">{product.variants.map((variant) => {
                const quantity = quantitiesByVariation.get(variant.id) ?? 0;
                return <button type="button" key={variant.id} className={`variant-choice${quantity ? " is-selected" : ""}`} onClick={() => add(variant)} aria-label={`Adicionar ${variant.name} de ${product.name}`}>
                  <span>{variant.name}</span>
                  <b>{formatCurrency(variant.price_cents)}</b>
                  {variant.units_per_package && <small>{variant.units_per_package} unidades</small>}
                  {quantity > 0 && <em>{quantity} no pedido</em>}
                </button>;
              })}</div>
            </article>;
          })}</div> : <p className="empty catalog-empty">Nenhum produto encontrado. Tente outro nome ou veja os itens já adicionados.</p>}
        </> : <p className="empty">Cadastre um produto ativo com uma forma de venda para adicionar itens.</p>}
      </section>
      <aside className="order-summary panel">
        <div className="order-step"><span>3</span><div><h2>Resumo</h2><p>Confira e salve.</p></div></div>
        {!cart.length ? <p className="empty">Os itens do pedido aparecerão aqui.</p> : <ul className="cart-list">{cart.map(({ variant, quantity }) => <li key={variant.id}><div><strong>{variant.productName}</strong><span>{variant.name}{variant.units_per_package ? ` · ${quantity * variant.units_per_package} unidades` : ""}</span></div><div className="quantity-control"><button type="button" onClick={() => changeQuantity(variant.id, -1)} aria-label={`Remover um ${variant.productName}`}>−</button><b>{quantity}</b><button type="button" onClick={() => changeQuantity(variant.id, 1)} aria-label={`Adicionar um ${variant.productName}`}>+</button></div><strong>{formatCurrency(quantity * variant.price_cents)}</strong></li>)}</ul>}
        <label className="discount-field">Desconto <small>opcional</small><input value={discount} onChange={(event) => setDiscount(event.target.value)} inputMode="decimal" placeholder="0,00" /></label>
        <label className="notes-field">Observações <small>opcional</small><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Ex.: entregar amanhã" /></label>
        <div className="totals"><span>Subtotal <b>{formatCurrency(subtotal)}</b></span><span>Desconto <b>− {formatCurrency(safeDiscount)}</b></span><strong>Total <b>{formatCurrency(total)}</b></strong></div>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary save-order" type="button" onClick={save} disabled={isPending}>{isPending ? "Salvando…" : "Salvar pedido"}</button>
      </aside>
    </div>
  );
}

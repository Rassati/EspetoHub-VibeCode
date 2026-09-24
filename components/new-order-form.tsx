"use client";
import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/(app)/orders/actions";
import { formatCurrency, moneyToCents } from "@/lib/formatters";
import { productImageUrl } from "@/lib/product-images";
import { orderItemLabel } from "@/lib/product-entry";
import type { Customer, SaleVariant } from "@/types/app";
import { MAX_ITEM_QUANTITY, MAX_ORDER_ITEMS, MAX_NOTES_LENGTH } from "@/lib/validation";
type CartItem = {
    variant: SaleVariant;
    quantity: number;
};
type CatalogProduct = {
    id: string;
    name: string;
    imagePath: string | null;
    variants: SaleVariant[];
    search: string;
};
function searchText(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
}
function ProductThumbnail({ name, imagePath }: {
    name: string;
    imagePath: string | null;
}) {
    const [failed, setFailed] = useState(false);
    const imageUrl = imagePath ? productImageUrl(imagePath) : null;
    return (<div className="catalog-product-image" aria-hidden="true">
      {imageUrl && !failed ? <img src={imageUrl} alt="" width={54} height={54} loading="lazy" decoding="async" onError={() => setFailed(true)}/> : <span>{initials(name)}</span>}
    </div>);
}
export function NewOrderForm({ customers, catalog }: {
    customers: Pick<Customer, "id" | "name" | "phone">[];
    catalog: SaleVariant[];
}) {
    const router = useRouter();
    const [customerId, setCustomerId] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [catalogQuery, setCatalogQuery] = useState("");
    const [catalogFilter, setCatalogFilter] = useState<"all" | "in-cart">("all");
    const [isPending, startTransition] = useTransition();
    const saving = useRef(false);
    const deferredQuery = useDeferredValue(catalogQuery);
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
                current.search += ` ${searchText(variant.name)}`;
                return;
            }
            groupMap.set(variant.product_id, {
                id: variant.product_id,
                name: variant.productName,
                imagePath: variant.productImagePath,
                variants: [variant],
                search: searchText(`${variant.productName} ${variant.name}`),
            });
        });
        return [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }, [catalog]);
    const quantitiesByVariation = useMemo(() => new Map(cart.map((item) => [item.variant.id, item.quantity])), [cart]);
    const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
    const visibleGroups = useMemo(() => {
        const query = searchText(deferredQuery.trim());
        return groups.filter((product) => {
            const quantity = product.variants.reduce((total, variant) => total + (quantitiesByVariation.get(variant.id) ?? 0), 0);
            const matchesFilter = catalogFilter === "all" || quantity > 0;
            const matchesSearch = !query || product.search.includes(query);
            return matchesFilter && matchesSearch;
        });
    }, [catalogFilter, deferredQuery, groups, quantitiesByVariation]);
    function add(variant: SaleVariant) {
        if (saving.current)
            return;
        setCart((current) => {
            const found = current.find((item) => item.variant.id === variant.id);
            return found
                ? current.map((item) => item.variant.id === variant.id ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + 1) } : item)
                : current.length < MAX_ORDER_ITEMS ? [...current, { variant, quantity: 1 }] : current;
        });
    }
    function changeQuantity(variationId: string, delta: number) {
        if (saving.current)
            return;
        setCart((current) => current.flatMap((item) => {
            if (item.variant.id !== variationId)
                return [item];
            const quantity = Math.min(MAX_ITEM_QUANTITY, item.quantity + delta);
            return quantity > 0 ? [{ ...item, quantity }] : [];
        }));
    }
    function save() {
        if (saving.current)
            return;
        setError("");
        if (!customerId)
            return setError("Escolha o cliente antes de salvar.");
        if (!cart.length)
            return setError("Adicione pelo menos um item ao pedido.");
        if (!Number.isSafeInteger(discountCents) || safeDiscount < 0 || safeDiscount > subtotal)
            return setError("Informe um desconto válido entre zero e o subtotal.");
        saving.current = true;
        startTransition(async () => {
            try {
                const result = await createOrderAction({
                    customerId,
                    discountCents: safeDiscount,
                    notes,
                    items: cart.map((item) => ({ variationId: item.variant.id, quantity: item.quantity })),
                });
                if (result.error || !result.orderId) {
                    saving.current = false;
                    return setError(result.error ?? "Não foi possível confirmar o pedido.");
                }
                router.push(`/orders/${result.orderId}`);
            }
            catch {
                saving.current = false;
                setError("Não foi possível confirmar o salvamento. Confira o histórico de pedidos antes de tentar novamente.");
            }
        });
    }
    return (<div className="order-builder">
      <section className="order-workspace">
        <div className="order-step"><span>1</span><div><h2>Cliente</h2><p>Quem está fazendo o pedido?</p></div></div>
        <select className="customer-select" aria-label="Cliente do pedido" disabled={isPending} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">Selecione um cliente</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
        </select>
        <div className="order-step"><span>2</span><div><h2>Itens</h2><p>Busque ou toque em uma forma de venda para adicionar.</p></div></div>
        {groups.length ? <>
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <span className="sr-only">Buscar produto ou forma de venda</span>
              <span aria-hidden="true">⌕</span>
              <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Buscar produto" type="search"/>
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
                <ProductThumbnail key={product.imagePath} name={product.name} imagePath={product.imagePath}/>
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
        {!cart.length ? <p className="empty">Os itens do pedido aparecerão aqui.</p> : <ul className="cart-list">{cart.map(({ variant, quantity }) => <li key={variant.id}><div><strong>{orderItemLabel(variant.productName, variant.name)}</strong>{variant.units_per_package && <span>{quantity * variant.units_per_package} unidades</span>}</div><div className="quantity-control"><button type="button" disabled={isPending} onClick={() => changeQuantity(variant.id, -1)} aria-label={`Remover um ${orderItemLabel(variant.productName, variant.name)}`}>−</button><b>{quantity}</b><button type="button" disabled={isPending} onClick={() => changeQuantity(variant.id, 1)} aria-label={`Adicionar um ${orderItemLabel(variant.productName, variant.name)}`}>+</button></div><strong>{formatCurrency(quantity * variant.price_cents)}</strong></li>)}</ul>}
        <label className="discount-field">Desconto <small>opcional</small><input disabled={isPending} value={discount} onChange={(event) => setDiscount(event.target.value)} inputMode="decimal" placeholder="0,00"/></label>
        <label className="notes-field">Observações <small>opcional</small><textarea disabled={isPending} maxLength={MAX_NOTES_LENGTH} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Ex.: entregar amanhã"/></label>
        <div className="totals"><span>Subtotal <b>{formatCurrency(subtotal)}</b></span><span>Desconto <b>− {formatCurrency(safeDiscount)}</b></span><strong>Total <b>{formatCurrency(total)}</b></strong></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary save-order" type="button" onClick={save} disabled={isPending}>{isPending ? "Salvando…" : "Salvar pedido"}</button>
      </aside>
    </div>);
}

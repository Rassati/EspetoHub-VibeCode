"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/(app)/orders/actions";
import { formatCurrency, moneyToCents } from "@/lib/formatters";
import type { Customer, SaleVariant } from "@/types/app";

type CartItem = { variant: SaleVariant; quantity: number };

export function NewOrderForm({ customers, catalog }: { customers: Customer[]; catalog: SaleVariant[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.quantity * item.variant.price_cents, 0), [cart]);
  const discountCents = discount ? moneyToCents(discount) : 0;
  const safeDiscount = Number.isFinite(discountCents) ? discountCents : 0;
  const total = Math.max(0, subtotal - safeDiscount);
  const groups = useMemo(() => {
    const groupMap = new Map<string, SaleVariant[]>();
    catalog.forEach((variant) => groupMap.set(variant.productName, [...(groupMap.get(variant.productName) ?? []), variant]));
    return [...groupMap.entries()];
  }, [catalog]);

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
        <div className="order-step"><span>2</span><div><h2>Itens</h2><p>Toque em uma forma de venda para adicionar.</p></div></div>
        {groups.length ? <div className="sale-catalog">{groups.map(([productName, variants]) => <article key={productName}><h3>{productName}</h3><div>{variants.map((variant) => <button type="button" key={variant.id} className="variant-choice" onClick={() => add(variant)}><span>{variant.name}</span><b>{formatCurrency(variant.price_cents)}</b>{variant.units_per_package && <small>{variant.units_per_package} unidades por pacote</small>}</button>)}</div></article>)}</div> : <p className="empty">Cadastre um produto ativo com uma forma de venda para adicionar itens.</p>}
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

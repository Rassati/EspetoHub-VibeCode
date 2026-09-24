"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { orderItemLabel, type ProductEntryResult } from "@/lib/product-entry";

type EntryAction = (data: FormData) => Promise<ProductEntryResult>;
const uncertainMessage = "Não foi possível confirmar o salvamento. Seus dados continuam aqui. Confira o catálogo antes de tentar de novo para evitar duplicar.";

export function VariantEntryForm({ productId, productName, action, onPendingChange }: {
  productId: string; productName: string; action: EntryAction; onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [name, setName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    busy.current = true; setPending(true); onPendingChange?.(true); setError(""); setSavedName("");
    try {
      const result = await action(data);
      if (result.error || !result.productId) { setError(result.error || uncertainMessage); return; }
      setSavedName(result.variantName || name);
      form.reset(); setName("");
      router.refresh();
    } catch { setError(uncertainMessage); }
    finally { busy.current = false; setPending(false); onPendingChange?.(false); }
  }
  useEffect(() => { if (savedName && !pending) nameInput.current?.focus(); }, [savedName, pending]);

  return <div className="variant-quick-entry">
    <h2>Adicionar variação</h2>
    <p className="muted">Em <strong>{productName}</strong>. Cadastre cada tipo, sabor ou tamanho aqui.</p>
    {savedName && <p className="form-success" role="status"><strong>{savedName}</strong> salva. Pode adicionar a próxima.</p>}
    <form onSubmit={submit} className="stack-form compact-form">
      <input type="hidden" name="product_id" value={productId}/>
      <fieldset disabled={pending} className="entry-fields">
        <label>Nome da variação<input ref={nameInput} name="variant_name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Toscana, apimentada, com queijo"/></label>
        <div className="form-two">
          <label>Preço (R$)<input name="price" required inputMode="decimal" placeholder="15,00"/></label>
          <label>Unidades no pacote <small>opcional</small><input name="units_per_package" type="number" min="1" max="100000" placeholder="Ex.: 10"/></label>
        </div>
        {name.trim() && <p className="receipt-label-preview">Na comanda: <strong>{orderItemLabel(productName, name)}</strong></p>}
        <button className="button button-primary" type="submit">{pending ? "Salvando…" : "Salvar variação e adicionar outra"}</button>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </div>;
}

export function ProductEntryForm({ createAction, variantAction }: { createAction: EntryAction; variantAction: EntryAction }) {
  const router = useRouter();
  const busy = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<ProductEntryResult | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);
  const [hasOptions, setHasOptions] = useState(false);
  const [name, setName] = useState("");
  const [variant, setVariant] = useState("");
  const [entryNumber, setEntryNumber] = useState(0);

  useEffect(() => {
    if (saved) successHeading.current?.focus();
    else if (entryNumber > 0) nameInput.current?.focus();
  }, [saved, entryNumber]);

  function startAnother() {
    setSaved(null); setAddingVariant(false); setError(""); setName(""); setVariant("");
    setEntryNumber(value => value + 1);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true; setPending(true); setError("");
    try {
      const result = await createAction(data);
      if (result.error || !result.productId) { setError(result.error || uncertainMessage); return; }
      setSaved(result);
      router.refresh();
    } catch { setError(uncertainMessage); }
    finally { busy.current = false; setPending(false); }
  }

  if (saved?.productId) return <section className="panel product-entry-panel" aria-label="Cadastro de produtos">
    <div className="entry-success">
      <span className="entry-success-icon" aria-hidden="true">✓</span>
      <h2 ref={successHeading} tabIndex={-1}>{saved.productName} cadastrado!</h2>
      <p role="status">{saved.warning || "Produto salvo no catálogo. O que deseja fazer agora?"}</p>
      <div className="entry-next-actions">
        <button type="button" className="button button-primary" disabled={pending} onClick={startAnother}>Cadastrar outro produto</button>
        {!addingVariant && <button type="button" className="button button-secondary" onClick={() => setAddingVariant(true)}>{saved.warning ? "Adicionar variação" : "Adicionar outra variação"}</button>}
        {!pending && <Link href={`/products/${saved.productId}`} prefetch={false} className="button button-ghost">Editar produto ou colocar foto</Link>}
      </div>
    </div>
    {addingVariant && <VariantEntryForm productId={saved.productId} productName={saved.productName || name} action={variantAction} onPendingChange={setPending}/>}
  </section>;

  return <section className="panel product-entry-panel" aria-labelledby="new-product-heading">
    <h2 id="new-product-heading">Novo produto</h2>
    <p className="muted">Cadastre um por vez, sem sair desta tela.</p>
    <form key={entryNumber} onSubmit={submit} className="stack-form compact-form">
      <fieldset disabled={pending} className="entry-fields">
        <label>Nome do produto<input ref={nameInput} name="name" required maxLength={140} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Linguiças ou pão de alho"/></label>
        <label className="check-label entry-options-toggle"><input type="checkbox" checked={hasOptions} onChange={event => setHasOptions(event.target.checked)}/><span>Este produto tem variações</span></label>
        <p className="field-help">Tipos, sabores, tamanhos ou pacotes. Ex.: Linguiças → Toscana, apimentada, com queijo.</p>
        {hasOptions ? <label>Primeira variação<input name="variant_name" required maxLength={100} value={variant} onChange={event => setVariant(event.target.value)} placeholder="Ex.: Toscana"/></label> : <input type="hidden" name="variant_name" value="Padrão"/>}
        <label>{hasOptions ? "Preço desta variação (R$)" : "Preço (R$)"}<input name="price" required inputMode="decimal" placeholder="15,00"/></label>
        <details className="entry-extra"><summary>Descrição e unidades no pacote <span>opcional</span></summary>
          <div className="entry-extra-fields">
            <label>Descrição<textarea name="description" maxLength={2000} rows={2} placeholder="Ex.: resfriado, pronto para assar"/></label>
            <label>Unidades no pacote<input name="units_per_package" type="number" min="1" max="100000" placeholder="Ex.: 10 — deixe vazio se não for um pacote"/></label>
          </div>
        </details>
        {name.trim() && <p className="receipt-label-preview">Na comanda: <strong>{orderItemLabel(name, hasOptions ? variant : "Padrão")}</strong></p>}
        <button type="submit" className="button button-primary">{pending ? "Salvando…" : "Salvar produto"}</button>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </section>;
}

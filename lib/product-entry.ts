export type ProductEntryResult = {
  error?: string;
  productId?: string;
  productName?: string;
  variantName?: string;
  warning?: string;
};

export function catalogSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

/** Preserve the order's snapshots, while giving the chosen option equal prominence. */
export function orderItemLabel(productName: string, variantName: string) {
  const product = productName.trim();
  const variant = variantName.trim();
  const normalized = catalogSearchText(variant);
  return !normalized || normalized === "padrao" || normalized === catalogSearchText(product)
    ? product
    : `${product} — ${variant}`;
}

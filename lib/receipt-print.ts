/** Never enlarge short receipts; leave a small guard for printer rounding. */
export function receiptPrintScale(width: number, height: number, pageWidth: number, pageHeight: number) {
  if (![width, height, pageWidth, pageHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error("Não foi possível medir a comanda para impressão.");
  }
  return Math.min(1, (pageWidth - 2) / width, (pageHeight - 2) / height);
}

/** Measure with exactly the same stylesheet/width used by the print renderer. */
export function fitReceiptToPage(root: Document = document) {
  const stylesheet = root.querySelector<HTMLLinkElement>("link[data-receipt-print]");
  const sheet = root.querySelector<HTMLElement>(".receipt-sheet");
  const card = root.querySelector<HTMLElement>(".receipt-card");
  if (!stylesheet?.sheet || !sheet || !card) throw new Error("A comanda ainda está carregando.");
  const previousMedia = stylesheet.media;
  try {
    stylesheet.media = "all";
    sheet.setAttribute("data-print-fitting", "");
    sheet.style.setProperty("--receipt-print-scale", "1");
    // Synchronous layout also works in beforeprint, where awaiting a frame is too late.
    const scale = receiptPrintScale(
      Math.max(card.scrollWidth, card.offsetWidth),
      Math.max(card.scrollHeight, card.offsetHeight),
      sheet.clientWidth,
      sheet.clientHeight,
    );
    sheet.style.setProperty("--receipt-print-scale", String(scale));
    sheet.setAttribute("data-print-fitted", "");
    return scale;
  } catch (error) {
    // If preparation fails, preserve the full content instead of clipping it.
    sheet.removeAttribute("data-print-fitted");
    sheet.style.removeProperty("--receipt-print-scale");
    throw error;
  } finally {
    sheet.removeAttribute("data-print-fitting");
    stylesheet.media = previousMedia;
  }
}

export function waitForReceiptStyles(root: Document = document): Promise<void> {
  const stylesheet = root.querySelector<HTMLLinkElement>("link[data-receipt-print]");
  if (!stylesheet) return Promise.reject(new Error("Estilo de impressão não encontrado."));
  if (stylesheet.sheet) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      stylesheet.removeEventListener("load", loaded);
      stylesheet.removeEventListener("error", failed);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Não foi possível carregar a impressão. Recarregue a página.")); };
    const timeout = setTimeout(failed, 15000);
    stylesheet.addEventListener("load", loaded, { once: true });
    stylesheet.addEventListener("error", failed, { once: true });
  });
}

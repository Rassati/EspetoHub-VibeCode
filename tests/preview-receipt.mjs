// Local-only visual fixture. No application route or real customer data is exposed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
import ts from "typescript";

const order = {
  id: "preview", order_number: 42, status: "ready", created_at: "2026-09-22T15:00:00Z", delivered_at: null,
  notes: "Separar em dois pacotes.", subtotal_cents: 12500, discount_cents: 500, total_cents: 12000,
  customers: { name: "Cliente de demonstração", phone: "(11) 99999-0000", address: "Este endereço não deve aparecer" },
};
const { default: Page } = loadTs("app/(receipt)/orders/[id]/print/page.tsx", {
  "@/components/receipt-print-controls": { ReceiptPrintControls: () => null },
  "@/lib/auth": { getCompanyContext: async () => ({ company: { id: "preview", name: "Espetaria de demonstração" } }) },
  "@/lib/data": { getReceiptOrder: async () => ({ order, items: [
    { id: "1", quantity: 2, product_name: "Espeto de carne", variant_name: "Pacote com 10", total_units: 20, unit_price_cents: 4500, line_total_cents: 9000 },
    { id: "2", quantity: 1, product_name: "Espeto de frango", variant_name: "Pacote com 10", total_units: 10, unit_price_cents: 3500, line_total_cents: 3500 },
  ] }) },
});
const css = await readFile("app/globals.css", "utf8");
const printCss = await readFile("public/receipt-print.css", "utf8");
const printScript = ts.transpileModule(await readFile("lib/receipt-print.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3002");
  if (url.pathname === "/receipt-print.css") {
    res.writeHead(200, { "content-type": "text/css" }); res.end(printCss); return;
  }
  if (url.pathname === "/receipt-print.js") {
    res.writeHead(200, { "content-type": "text/javascript" }); res.end(printScript); return;
  }
  const count = Math.min(200, Math.max(1, Number(url.searchParams.get("items")) || 2));
  const page = await Page({ params: Promise.resolve({ id: "preview" }) });
  let markup = renderToStaticMarkup(page);
  // Repeat only the rendered fixture items; production component/layout stays unchanged.
  const sample = markup.match(/<ul class="receipt-items">([\s\S]*?)<\/ul>/)[1].match(/<li>[\s\S]*?<\/li>/g);
  markup = markup.replace(/(<ul class="receipt-items">)[\s\S]*?(<\/ul>)/, `$1${Array.from({ length: count }, (_, i) => sample[i % sample.length]).join("")}$2`);
  const script = `<script type="module">
    import { fitReceiptToPage, waitForReceiptStyles } from '/receipt-print.js';
    await Promise.all([document.fonts.ready, waitForReceiptStyles()]);
    const scale = fitReceiptToPage();
    document.querySelector('link[data-receipt-print]').media = 'all';
    document.body.dataset.scale = scale;
    document.body.dataset.ready = 'true';
  </script>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Comanda — ${count} itens fictícios em A4</title><style>${css}</style></head><body>${markup}${script}</body></html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(html);
}).listen(3002, "127.0.0.1", () => console.log("Receipt fixture: http://127.0.0.1:3002/?items=200"));

// Local-only visual fixture. No application route or real customer data is exposed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

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
const markup = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "preview" }) }));
const css = await readFile("app/globals.css", "utf8");
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Comanda — teste com dados fictícios</title><style>${css}</style></head><body>${markup}</body></html>`;
createServer((_req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(html); }).listen(3002, "127.0.0.1", () => console.log("Receipt fixture: http://127.0.0.1:3002"));

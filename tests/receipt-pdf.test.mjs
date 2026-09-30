import test from "node:test";
import assert from "node:assert/strict";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument } from "pdf-lib";
import { loadTs } from "./load-ts.mjs";
import { receiptFixture } from "./receipt-pdf-fixture.mjs";

const { createReceiptPdf } = loadTs("lib/receipt-pdf.ts");
const { formatCurrency } = loadTs("lib/formatters.ts");

async function inspect(bytes) {
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdf = await task.promise;
  assert.equal(pdf.numPages, 1);
  const page = await pdf.getPage(1);
  const { items } = await page.getTextContent();
  const runs = items.filter(item => "str" in item && item.str.trim());
  const text = runs.map(item => item.str).join(" ");
  const viewport = page.getViewport({ scale: 1 });
  for (const item of runs) {
    assert.ok(item.transform[4] >= 30 && item.transform[4] + item.width <= viewport.width - 28, `Horizontal clipping: ${item.str}`);
    assert.ok(item.transform[5] > 10 && item.transform[5] + item.height < viewport.height - 20, `Vertical clipping: ${item.str}`);
  }
  await task.destroy();
  return { text, runs };
}

for (const [count, longNames] of [[1,false],[4,false],[50,false],[60,false],[100,false],[200,false],[200,true]]) {
  test(`actual PDF: ${count} items${longNames ? " with long names and notes" : ""}, exactly one page, full list and visible TOTAL`, async () => {
    const data = receiptFixture(count, longNames);
    const bytes = await createReceiptPdf(data);
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
    const { text, runs } = await inspect(bytes);
    const compact = text.replace(/\s/g, "");
    for (let i = 0; i < count; i++) {
      assert.ok(compact.includes(`PRODUTO${String(i).padStart(3, "0")}`), `Missing product ${i}`);
      assert.ok(compact.includes(`VARIACAO${String(i).padStart(3, "0")}`), `Missing variation ${i}`);
      for (const value of [data.items[i].product_name, data.items[i].variant_name, formatCurrency(data.items[i].line_total_cents)]) {
        assert.ok(compact.includes(value.replace(/\s/g, "")), `Missing item content: ${value}`);
      }
    }
    assert.ok(compact.includes(data.order.notes.replace(/\s/g, "")), "Full notes must be preserved");
    assert.ok(compact.includes(formatCurrency(data.order.total_cents).replace(/\s/g, "")));
    assert.ok(text.includes("TOTAL"));
    assert.ok(text.includes("Cliente de demonstração"));
    assert.ok(text.includes("(11) 99999-0000"));
    assert.ok(!text.includes("ENDERECO_NAO_PODE_APARECER"));
    const total = runs.find(item => item.str === "TOTAL");
    assert.equal(total.height, 18);
    assert.ok(total.transform[5] > 35 && total.transform[5] < 80);
    const body = runs.filter(item => item.str.includes("PRODUTO") || item.str.includes("VARIACAO"));
    assert.ok(body.every(item => item.transform[5] > 122), "Items must never enter the reserved totals area");
  });
}

test("PDF total zero remains visible; missing/invalid totals block generation instead of printing an incomplete receipt", async () => {
  const data = receiptFixture(1);
  data.order.discount_cents = data.order.subtotal_cents;
  data.order.total_cents = 0;
  const { text } = await inspect(await createReceiptPdf(data));
  assert.ok(text.includes("TOTAL")); assert.match(text, /R\$\s*0,00/);
  for (const value of [undefined, NaN, -1, Infinity]) {
    data.order.total_cents = value;
    await assert.rejects(createReceiptPdf(data), /Valor inválido/);
  }
});

test("long unbroken names, accents, symbols and unit counts survive on one page", async () => {
  const data = receiptFixture(1);
  data.items[0].product_name = "ÁÉÍÓÚÇ" + "A".repeat(120);
  data.items[0].variant_name = "Linguiça 🔥";
  data.items[0].total_units = 48;
  const { text } = await inspect(await createReceiptPdf(data));
  assert.ok(text.replace(/\s/g, "").includes(data.items[0].product_name));
  assert.ok(text.includes("Linguiça [U+1F525]"));
  assert.ok(text.includes("48 unidades"));
});

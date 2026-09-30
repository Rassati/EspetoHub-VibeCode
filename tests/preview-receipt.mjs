// Local-only PDF fixtures. No connection to production or real customer data.
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { loadTs } from "./load-ts.mjs";
import { receiptFixture } from "./receipt-pdf-fixture.mjs";

const { createReceiptPdf } = loadTs("lib/receipt-pdf.ts");
if (process.argv.includes("--write")) {
  await mkdir("output/pdf", { recursive: true });
  await mkdir("tmp/pdfs", { recursive: true });
  for (const [count, longNames, path] of [
    [60, false, "output/pdf/comanda-60-itens.pdf"],
    [4, false, "tmp/pdfs/comanda-4-itens.pdf"],
    [200, true, "tmp/pdfs/comanda-200-itens.pdf"],
  ]) {
    await writeFile(path, await createReceiptPdf(receiptFixture(count, longNames)));
    console.log(path);
  }
} else {
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1:3002");
      const count = Math.min(200, Math.max(1, Number(url.searchParams.get("items")) || 60));
      const pdf = await createReceiptPdf(receiptFixture(count, url.searchParams.has("long")));
      res.writeHead(200, { "content-type": "application/pdf", "cache-control": "no-store" });
      res.end(pdf);
    } catch (error) {
      res.writeHead(500); res.end(String(error));
    }
  }).listen(3002, "127.0.0.1", () => console.log("Receipt PDF: http://127.0.0.1:3002/?items=60"));
}

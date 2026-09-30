import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { orderItemLabel } from "@/lib/product-entry";
import { orderStatus } from "@/lib/constants";
import type { Order, OrderItem } from "@/types/app";

export type ReceiptPdfData = {
  companyName: string;
  order: Order & { customers: { name: string; phone: string | null } | null };
  items: OrderItem[];
};

// These areas are reserved in PDF coordinates, not in browser/CSS pixels.
const MARGIN = 32;
const FOOTER_TOP = 122;
const COLUMN_GAP = 16;

function money(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Valor inválido na comanda.");
  return formatCurrency(value).replace(/\u00a0/g, " ");
}

/** Accents remain intact. Unsupported symbols get an explicit Unicode label, never disappear. */
function printable(value: string, font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  return Array.from(value.normalize("NFC").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, " ").trim())
    .map(character => supported.has(character.codePointAt(0)!) ? character : `[U+${character.codePointAt(0)!.toString(16).toUpperCase()}]`).join("");
}

/** Wraps by measured glyph width, including long strings without spaces. */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, size) <= width) {
      line = line ? `${line} ${word}` : word;
      continue;
    }
    if (line) { lines.push(line); line = ""; }
    for (const character of word) {
      if (line && font.widthOfTextAtSize(line + character, size) > width) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createReceiptPdf({ companyName, order, items }: ReceiptPdfData) {
  // Validate the authoritative saved totals before generating any document.
  const subtotal = money(order.subtotal_cents);
  const discount = money(order.discount_cents);
  const total = money(order.total_cents);
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage(PageSizes.A4); // The only addPage call. Never paginate.
  const { width, height } = page.getSize();
  const innerWidth = width - MARGIN * 2;
  document.setTitle(`Comanda #${order.order_number}`);
  document.setLanguage("pt-BR");
  document.setCreator("Espeto Hub - comanda de uma página");

  const text = (value: string, font: PDFFont = regular) => printable(value, font);
  function draw(value: string, x: number, top: number, size: number, font = regular) {
    page.drawText(value, { x, y: top - size, size, font, color: rgb(0, 0, 0) });
  }
  let cursor = height - MARGIN;
  function header(value: string, size: number, font = regular) {
    for (const line of wrap(text(value, font), font, size, innerWidth)) {
      draw(line, MARGIN, cursor, size, font); cursor -= size * 1.25;
    }
    cursor -= 4;
  }
  header(companyName, 12, bold);
  header(`COMANDA #${order.order_number}`, 17, bold);
  header(`Recebido em ${formatDate(order.created_at)}`, 9);
  header(`Cliente: ${order.customers?.name || "Não informado"}`, 10, bold);
  if (order.customers?.phone) header(`Telefone: ${order.customers.phone}`, 10);
  header(`Status: ${orderStatus[order.status]}${order.delivered_at ? ` | Entregue em ${formatDate(order.delivered_at)}` : ""}`, 9);
  cursor -= 2;
  page.drawLine({ start: { x: MARGIN, y: cursor }, end: { x: width - MARGIN, y: cursor }, thickness: 0.7 });
  cursor -= 10;
  draw(`ITENS DO PEDIDO (${items.length})`, MARGIN, cursor, 10, bold);
  const bodyTop = cursor - 20;
  const availableHeight = bodyTop - FOOTER_TOP - 12;
  if (availableHeight < 100) throw new Error("Cabeçalho muito grande para a comanda.");

  const entries = items.map(item => ({
    title: text(`${item.quantity} x ${orderItemLabel(item.product_name, item.variant_name)}`, bold),
    detail: text(`${money(item.unit_price_cents)} cada${item.total_units ? ` | ${item.total_units} unidades` : ""}`),
    amount: money(item.line_total_cents),
  }));
  if (order.notes?.trim()) entries.push({ title: "OBSERVAÇÕES", detail: text(order.notes), amount: "" });
  if (!entries.length) entries.push({ title: "Sem itens", detail: "", amount: "" });

  function layout(size: number, columns: number) {
    const columnWidth = (innerWidth - COLUMN_GAP * (columns - 1)) / columns;
    let column = 0, used = 0;
    const rows = [];
    for (const entry of entries) {
      const amountWidth = entry.amount ? bold.widthOfTextAtSize(entry.amount, size) + size : 0;
      const titleWidth = columnWidth - amountWidth;
      if (titleWidth < size * 4) return null;
      const title = wrap(entry.title, bold, size, titleWidth);
      const detail = wrap(entry.detail, regular, size * .85, columnWidth);
      const rowHeight = (title.length * 1.2 + detail.length * 1.05 + .7) * size;
      if (rowHeight > availableHeight) return null;
      if (used + rowHeight > availableHeight) { column++; used = 0; }
      if (column >= columns) return null;
      rows.push({ title, detail, amount: entry.amount, column, top: bodyTop - used, columnWidth });
      used += rowHeight;
    }
    return { size, columns, rows };
  }
  let best: ReturnType<typeof layout> = null;
  for (const columns of [1, 2, 3]) {
    let low = .25, high = 10;
    if (!layout(low, columns)) continue;
    for (let iteration = 0; iteration < 24; iteration++) {
      const mid = (low + high) / 2;
      if (layout(mid, columns)) low = mid; else high = mid;
    }
    const candidate = layout(low, columns)!;
    if (!best || candidate.size > best.size + .05) best = candidate;
  }
  if (!best) throw new Error("Não foi possível acomodar todos os itens na comanda.");
  for (const row of best.rows) {
    const x = MARGIN + row.column * (row.columnWidth + COLUMN_GAP);
    let top = row.top;
    for (const line of row.title) { draw(line, x, top, best.size, bold); top -= best.size * 1.2; }
    if (row.amount) draw(row.amount, x + row.columnWidth - bold.widthOfTextAtSize(row.amount, best.size), row.top, best.size, bold);
    for (const line of row.detail) { draw(line, x, top, best.size * .85); top -= best.size * 1.05; }
  }

  // Totals are outside the adaptive item area, so even 200 items cannot push them away.
  page.drawLine({ start: { x: MARGIN, y: FOOTER_TOP }, end: { x: width - MARGIN, y: FOOTER_TOP }, thickness: 1 });
  function totalRow(label: string, value: string, top: number, size: number, font = regular) {
    draw(label, MARGIN + 10, top, size, font);
    draw(value, width - MARGIN - 10 - font.widthOfTextAtSize(value, size), top, size, font);
  }
  totalRow("Subtotal", subtotal, 112, 10);
  totalRow("Desconto", `- ${discount}`, 96, 10);
  page.drawRectangle({ x: MARGIN, y: 36, width: innerWidth, height: 38, color: rgb(.94, .94, .94) });
  totalRow("TOTAL", total, 66, 18, bold);
  draw("Obrigado pela preferência!", MARGIN, 25, 8);
  draw("1 / 1", width - MARGIN - 18, 25, 8);
  return document.save();
}

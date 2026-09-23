import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

const { receiptPrintScale, fitReceiptToPage } = loadTs("lib/receipt-print.ts");

test("print: short receipts retain their size and long receipts fit in one A4 sheet", () => {
  assert.equal(receiptPrintScale(718, 400, 720, 1043), 1);
  for (const height of [1043, 1600, 8000, 40000, 100000]) {
    const scale = receiptPrintScale(718, height, 720, 1043);
    assert.ok(scale > 0 && scale <= 1);
    assert.ok(height * scale <= 1041 + 0.000001);
    assert.ok(718 * scale <= 718 + 0.000001);
  }
  assert.ok(900 * receiptPrintScale(900, 400, 720, 1043) <= 718);
});

test("print: invalid measurements cannot produce a silently clipped receipt", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => receiptPrintScale(718, value, 720, 1043));
  }
});

test("print: measures using print styles and recalculates without compounding the scale", () => {
  const stylesheet = { media: "print", sheet: {} };
  let storedScale;
  const attributes = new Set();
  const sheet = {
    clientWidth: 718, clientHeight: 1043,
    setAttribute(name) { attributes.add(name); },
    removeAttribute(name) { attributes.delete(name); },
    style: {
      setProperty(_name, value) { storedScale = value; },
      removeProperty() { storedScale = undefined; },
    },
  };
  const card = { offsetWidth: 718, offsetHeight: 3000, scrollWidth: 718, get scrollHeight() {
    assert.equal(stylesheet.media, "all");
    assert.equal(storedScale, "1");
    return 3000;
  } };
  const root = { querySelector(selector) { return selector.startsWith("link") ? stylesheet : selector === ".receipt-sheet" ? sheet : card; } };
  const first = fitReceiptToPage(root);
  assert.equal(stylesheet.media, "print");
  assert.equal(Number(storedScale), first);
  assert.ok(attributes.has("data-print-fitted"));
  assert.ok(!attributes.has("data-print-fitting"));
  assert.equal(fitReceiptToPage(root), first);
  card.offsetWidth = 0;
  card.scrollWidth = 0;
  assert.throws(() => fitReceiptToPage(root));
  assert.equal(stylesheet.media, "print");
  assert.ok(!attributes.has("data-print-fitted"));
  assert.ok(!attributes.has("data-print-fitting"));
  assert.equal(storedScale, undefined);
});

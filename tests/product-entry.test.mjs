import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

const { orderItemLabel, catalogSearchText } = loadTs("lib/product-entry.ts");
const id = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const form = (values) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
function actions(client) {
  return loadTs("app/(app)/products/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect() { throw new Error("Unexpected redirect"); } },
    "@/lib/auth": { getCompanyContext: async () => ({ company: { id: companyId } }) },
    "@/lib/supabase/server": { createClient: async () => client },
  });
}

test("order labels give variations equal prominence without redundant defaults", () => {
  assert.equal(orderItemLabel("LINGUIÇAS", "Toscana"), "LINGUIÇAS — Toscana");
  assert.equal(orderItemLabel("Linguiças", "Apimentada"), "Linguiças — Apimentada");
  assert.equal(orderItemLabel("Pão de alho", "Padrão"), "Pão de alho");
  assert.equal(orderItemLabel("Carne", "CARNE"), "Carne");
  assert.equal(orderItemLabel("Espeto", "Pacote com 10"), "Espeto — Pacote com 10");
  assert.equal(catalogSearchText(" LINGUIÇAS "), "linguicas");
});

test("product creation returns an inline success instead of redirecting to detail", async () => {
  let submitted;
  const { createProductAction } = actions({ rpc: async (name, args) => { submitted = { name, args }; return { data: id, error: null }; } });
  const result = await createProductAction(form({ name: "Pão de alho", price: "7,50" }));
  assert.deepEqual(result, { productId: id, productName: "Pão de alho", variantName: "Padrão" });
  assert.equal(submitted.args.p_company_id, companyId);
  assert.equal(submitted.args.p_price_cents, 750);
  assert.equal(submitted.args.p_variant_name, "Padrão");
});

test("invalid products return actionable errors without writes or redirects", async () => {
  const { createProductAction } = actions({ rpc() { throw new Error("Must not write"); } });
  for (const values of [{ name: "", price: "5" }, { name: "Linguiças", price: "abc" }, { name: "Linguiças", price: "5", units_per_package: "-1" }]) {
    const result = await createProductAction(form(values));
    assert.ok(result.error); assert.ok(!result.productId);
  }
});

test("uncertain or duplicate writes are not retried", async () => {
  let calls = 0;
  const { createProductAction } = actions({ rpc: async () => { calls++; return { error: { code: "23505" } }; }, from() { throw new Error("Must not retry"); } });
  const result = await createProductAction(form({ name: "Linguiças", variant_name: "Toscana", price: "15" }));
  assert.ok(result.error); assert.equal(calls, 1);
});

test("adding an inline variation verifies the company's product before inserting", async () => {
  const filters = []; let inserted;
  const client = { from(table) {
    if (table === "product_variants") return { insert: async value => { inserted = value; return { error: null }; } };
    const query = { select() { return query; }, eq(key, value) { filters.push([key, value]); return query; }, maybeSingle: async () => ({ data: { id, name: "Linguiças" }, error: null }) };
    return query;
  } };
  const result = await actions(client).quickAddVariantAction(form({ product_id: id, variant_name: "Apimentada", price: "19,90" }));
  assert.ok(filters.some(([key, value]) => key === "company_id" && value === companyId));
  assert.equal(inserted.company_id, companyId); assert.equal(inserted.product_id, id);
  assert.equal(inserted.price_cents, 1990); assert.equal(result.variantName, "Apimentada");
});

test("inline variation cannot target a missing or foreign product", async () => {
  const client = { from(table) {
    assert.equal(table, "products");
    const query = { select() { return query; }, eq() { return query; }, maybeSingle: async () => ({ data: null, error: null }) };
    return query;
  } };
  const result = await actions(client).quickAddVariantAction(form({ product_id: id, variant_name: "Toscana", price: "15" }));
  assert.ok(result.error); assert.ok(!result.productId);
});

test("legacy database compatibility reports a partially created product without inviting a duplicate", async () => {
  let inserts = 0;
  const client = {
    rpc: async () => ({ error: { code: "PGRST202" } }),
    from(table) {
      if (table === "products") return { insert() { inserts++; return { select() { return { single: async () => ({ data: { id }, error: null }) }; } }; } };
      return { insert: async () => ({ error: { code: "23505" } }) };
    },
  };
  const result = await actions(client).createProductAction(form({ name: "Linguiças", variant_name: "Toscana", price: "15" }));
  assert.equal(result.productId, id); assert.ok(result.warning); assert.equal(inserts, 1);
});

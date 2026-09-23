import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const companyId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";

function dataWithQueryMock(respond) {
  const queries = [];
  const client = { from(table) {
    const query = { table, filters: [], orders: [] };
    queries.push(query);
    const builder = {
      select(fields, options) { query.fields = fields; query.options = options; return builder; },
      eq(...args) { query.filters.push(["eq", ...args]); return builder; },
      neq(...args) { query.filters.push(["neq", ...args]); return builder; },
      gte(...args) { query.filters.push(["gte", ...args]); return builder; },
      lt(...args) { query.filters.push(["lt", ...args]); return builder; },
      in(...args) { query.filters.push(["in", ...args]); return builder; },
      order(...args) { query.orders.push(args); return builder; },
      range(start, end) { query.range = [start, end]; return builder; },
      maybeSingle() { return builder; },
      then(resolve, reject) { return Promise.resolve(respond(query)).then(resolve, reject); },
    };
    return builder;
  } };
  return {
    queries,
    data: loadTs("lib/data.ts", {
      "@/lib/supabase/server": { createClient: async () => client },
      "next/navigation": { notFound() { throw new Error("NOT_FOUND"); } },
    }),
  };
}

test("receipt query does not request the customer address; internal detail still does", async () => {
  const { data, queries } = dataWithQueryMock(query => ({
    error: null, data: query.table === "orders" ? { id: orderId } : [],
  }));
  await data.getReceiptOrder(companyId, orderId);
  assert.equal(queries[0].fields, "*, customers(name, phone)");
  assert.ok(queries.every(query => query.filters.some(filter => filter[1] === "company_id" && filter[2] === companyId)));
  await data.getOrder(companyId, orderId);
  assert.equal(queries[2].fields, "*, customers(name, phone, address)");
  await assert.rejects(data.getReceiptOrder(companyId, "invalid"), /NOT_FOUND/);
});

test("dashboard aggregates more than 1000 rows and uses the selected Sao Paulo day", async () => {
  const delivered = Array.from({ length: 1101 }, () => ({ total_cents: 100 }));
  const items = Array.from({ length: 1201 }, () => ({ product_name: "Carne", quantity: 2 }));
  const { data, queries } = dataWithQueryMock(query => {
    if (query.options?.head) return { error: null, count: query.filters.some(filter => filter[0] === "in") ? 7 : 1400 };
    const rows = query.table === "order_items" ? items : delivered;
    return { error: null, data: rows.slice(query.range[0], query.range[1] + 1) };
  });
  const result = await data.getDashboardData(companyId, "2026-09-22");
  assert.equal(result.orderCount, 1400);
  assert.equal(result.awaiting, 7);
  assert.equal(result.completed, 1101);
  assert.equal(result.revenue, 110100);
  assert.deepEqual(result.bestSellers, [{ name: "Carne", quantity: 2402 }]);
  const itemQueries = queries.filter(query => query.table === "order_items");
  assert.equal(itemQueries.length, 3);
  for (const query of itemQueries) {
    assert.match(query.fields, /orders!inner/);
    assert.ok(query.filters.some(filter => filter[1] === "orders.company_id" && filter[2] === companyId));
    assert.ok(query.filters.some(filter => filter[1] === "orders.delivered_at" && filter[2] === "2026-09-22T03:00:00.000Z"));
  }
});

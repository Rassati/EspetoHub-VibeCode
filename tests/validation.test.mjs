import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

const { moneyToCents, formatCurrency } = loadTs("lib/formatters.ts");
const { normalizeDate, dayBoundaries, saoPauloDate } = loadTs("lib/dates.ts");
const { safeRedirect, formText, validateOrder } = loadTs("lib/validation.ts");
const { readAllRows } = loadTs("lib/pagination.ts");
const id = "a0000000-0000-4000-8000-000000000001";

test("money: decimal and grouped prices retain exact cents", () => {
  for (const [input, expected] of [["12,50",1250],["12.50",1250],["R$ 1.234,56",123456],["1,234.56",123456],["1.234",123400],["0",0],["0,29",29],["-2,50",-250]]) assert.equal(moneyToCents(input),expected,input);
  assert.match(formatCurrency(29), /0,29/);
});

test("money: rejects blank, exponent, hex, malformed and unsafe amounts", () => {
  for (const input of ["", " ", "R$", "1e3", "0x10", "1 2", "NaN", "1,2,3", "1234.567", "99999999999999999999"]) assert.ok(Number.isNaN(moneyToCents(input)),input);
});

test("dates: validates the actual calendar and Brasília midnight", () => {
  for (const date of ["2026-02-30","2026-13-01","2026-00-12","2025-02-29","invalid",["2026-01-01"]]) assert.equal(normalizeDate(date,"2026-09-22"),"2026-09-22");
  assert.equal(normalizeDate("2024-02-29"),"2024-02-29");
  assert.deepEqual(dayBoundaries("2026-12-31"),{date:"2026-12-31",start:"2026-12-31T03:00:00.000Z",end:"2027-01-01T03:00:00.000Z"});
  assert.equal(saoPauloDate(new Date("2026-09-22T01:00:00Z")),"2026-09-21");
});

test("redirects: blocks external, encoded and backslash destinations", () => {
  for (const path of ["https://example.com","//example.com","/\\example.com","/%2fexample.com","/%252fexample.com","/\n/example.com","/safe/..//external.example","/%2e%2e//external.example",null]) assert.equal(safeRedirect(path),"/dashboard");
  assert.equal(safeRedirect("/orders?page=2"),"/orders?page=2");
});

test("password values are preserved exactly", () => {
  const form = new FormData(); form.set("password", "  secret  "); form.set("email", " user@example.com ");
  assert.equal(formText(form,"password",false),"  secret  ");
  assert.equal(formText(form,"email"),"user@example.com");
});

test("order input: rejects malformed, duplicated and oversized payloads", () => {
  const valid={customerId:id,discountCents:0,items:[{variationId:id,quantity:1}]};
  assert.ok(validateOrder(valid));
  for (const input of [null,{}, {...valid,items:null},{...valid,discountCents:-1},{...valid,items:[...valid.items,...valid.items]},{...valid,notes:"x".repeat(2001)},{...valid,items:[{variationId:id,quantity:10001}]}]) assert.equal(validateOrder(input),false);
});

test("pagination: retrieves all 1,201 rows rather than silently truncating", async () => {
  const rows=Array.from({length:1201},(_,id)=>({id}));
  const calls=[];
  const result=await readAllRows(async(start,end)=>{calls.push([start,end]);return {data:rows.slice(start,end+1),error:null};});
  assert.deepEqual(result,rows); assert.equal(calls.length,3);
  await assert.rejects(readAllRows(async()=>({data:null,error:new Error("offline")})),/offline/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const redirect = (url) => { throw new Error(`redirect:${url}`); };

test("login: preserves password and blocks an external next parameter", async () => {
  let submitted;
  const { signInAction } = loadTs("app/auth/actions.ts", {
    "next/navigation": { redirect }, "next/headers": {},
    "@/lib/supabase/server": { createClient: async()=>({auth:{signInWithPassword:async(input)=>{submitted=input;return {error:null};}}}) },
  });
  const form=new FormData(); form.set("email","user@example.com"); form.set("password","  secret  "); form.set("next","//external.example");
  await assert.rejects(signInAction(form),/redirect:\/dashboard$/);
  assert.equal(submitted.password,"  secret  ");
});

test("middleware: redirects retain refreshed cookies and destination query", async () => {
  const { updateSession } = loadTs("lib/supabase/middleware.ts", {
    "@supabase/ssr": { createServerClient:(_url,_key,options)=>({auth:{getUser:async()=>{
      options.cookies.setAll([{name:"session-test",value:"refreshed",options:{path:"/",sameSite:"lax"}}]);
      return {data:{user:null}};
    }}}) },
  });
  const response=await updateSession(new NextRequest("http://localhost/orders?page=2"));
  assert.equal(response.cookies.get("session-test").value,"refreshed");
  assert.equal(new URL(response.headers.get("location")).searchParams.get("next"),"/orders?page=2");
  const publicResponse=await updateSession(new NextRequest("http://localhost/"));
  assert.equal(publicResponse.status,200);
});

test("callback: an expired code returns an actionable login error", async () => {
  const { GET } = loadTs("app/auth/callback/route.ts", {
    "@supabase/ssr": {createServerClient:()=>({auth:{exchangeCodeForSession:async()=>({error:{message:"expired"}})}})},
  });
  const response=await GET(new NextRequest("http://localhost/auth/callback?code=expired"));
  const url=new URL(response.headers.get("location"));
  assert.equal(url.pathname,"/login"); assert.ok(url.searchParams.get("error")); assert.equal(url.searchParams.has("code"),false);
});

test("printed receipt includes customer name/phone, items and total, never address", async () => {
  const order={id:"test",order_number:42,status:"new",created_at:"2026-09-22T12:00:00Z",delivered_at:null,notes:null,subtotal_cents:12500,discount_cents:500,total_cents:12000,customers:{name:"Cliente Exemplo",phone:"11999990000",address:"ENDERECO_CONFIDENCIAL"}};
  const {default:Page}=loadTs("app/(receipt)/orders/[id]/print/page.tsx", {
    "@/components/receipt-print-controls":{ReceiptPrintControls:()=>null},
    "@/lib/auth":{getCompanyContext:async()=>({company:{id:"test",name:"Empresa Exemplo"}})},
    "@/lib/data":{getReceiptOrder:async()=>({order,items:[{id:"item",quantity:2,product_name:"Espeto",variant_name:"Pacote",total_units:20,unit_price_cents:6250,line_total_cents:12500}]})},
  });
  const html=renderToStaticMarkup(await Page({params:Promise.resolve({id:"test"})}));
  for(const value of ["Cliente Exemplo","11999990000","COMANDA #42","Espeto","120,00"]) assert.ok(html.includes(value),value);
  assert.ok(!html.includes("ENDERECO_CONFIDENCIAL")); assert.ok(!html.includes("Endereço"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

test("SQL migrations: discounts, rollback, tenant isolation and storage", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto, unaccent } });
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
  `);
  const migration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
  await db.exec(await migration("0001_initial_schema.sql"));
  await db.exec(await migration("0003_delivery_date_and_dashboard.sql"));
  await db.exec(await migration("0004_customer_management_and_product_images.sql"));
  const userA="a0000000-0000-4000-8000-000000000001";
  const userB="b0000000-0000-4000-8000-000000000001";
  await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $3::jsonb), ($2, $4::jsonb)",[userA,userB,JSON.stringify({company_name:"Empresa A"}),JSON.stringify({company_name:"Empresa B"})]);
  const companyA=(await db.query("select company_id from company_members where user_id=$1",[userA])).rows[0].company_id;
  const companyB=(await db.query("select company_id from company_members where user_id=$1",[userB])).rows[0].company_id;
  const customerA=(await db.query("insert into customers(company_id,name) values($1,'Cliente A') returning id",[companyA])).rows[0].id;
  const customerB=(await db.query("insert into customers(company_id,name) values($1,'Cliente B') returning id",[companyB])).rows[0].id;
  const productA=(await db.query("insert into products(company_id,name) values($1,'Carne') returning id",[companyA])).rows[0].id;
  const productB=(await db.query("insert into products(company_id,name) values($1,'Frango') returning id",[companyB])).rows[0].id;
  const variantA=(await db.query("insert into product_variants(company_id,product_id,name,price_cents,units_per_package) values($1,$2,'Pacote',4500,10) returning id",[companyA,productA])).rows[0].id;
  const variantB=(await db.query("insert into product_variants(company_id,product_id,name,price_cents) values($1,$2,'Pacote',3500) returning id",[companyB,productB])).rows[0].id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[userA]);
  const createOrder=(customer,discount,items)=>db.query("select public.create_order($1,$2,null,$3::jsonb) as id",[customer,discount,JSON.stringify(items)]);
  const items=[{variation_id:variantA,quantity:2}];

  await t.test("reproduces the original positive-discount failure", async()=> {
    await assert.rejects(createOrder(customerA,500,items),/check constraint/);
    assert.equal((await db.query("select count(*)::int n from orders")).rows[0].n,0);
  });

  const patch=await migration("0005_order_validation_and_storage.sql");
  await db.exec(patch);
  await db.exec(patch); // Reapplication must be safe.
  await db.exec("set role authenticated");

  let orderId;
  await t.test("creates discounted orders atomically with correct totals", async()=> {
    orderId=(await createOrder(customerA,500,items)).rows[0].id;
    const row=(await db.query("select subtotal_cents,discount_cents,total_cents from orders where id=$1",[orderId])).rows[0];
    assert.equal(Number(row.subtotal_cents),9000); assert.equal(Number(row.discount_cents),500); assert.equal(Number(row.total_cents),8500);
  });
  await t.test("rejects invalid orders without leaving partial headers/items", async()=> {
    for(const [discount,input] of [[9500,items],[-1,items],[0,[...items,...items]],[0,[{variation_id:variantA,quantity:0}]],[0,null],[0,[]]]) {
      await assert.rejects(createOrder(customerA,discount,input));
    }
    assert.equal((await db.query("select count(*)::int n from orders")).rows[0].n,1);
    assert.equal((await db.query("select count(*)::int n from order_items")).rows[0].n,1);
  });
  await t.test("cannot use another company's customer or variation", async()=> {
    await assert.rejects(createOrder(customerB,0,items),/access denied/);
    await assert.rejects(createOrder(customerA,0,[{variation_id:variantB,quantity:1}]),/not found/);
    assert.equal((await db.query("select count(*)::int n from customers where company_id=$1",[companyB])).rows[0].n,0);
    await assert.rejects(db.query("insert into products(company_id,name) values($1,'Unauthorized')",[companyB]),/row-level security/);
  });
  await t.test("delivery timestamps are stable and removed when reopened", async()=> {
    await db.query("select update_order_status($1,'delivered')",[orderId]);
    const first=(await db.query("select delivered_at from orders where id=$1",[orderId])).rows[0].delivered_at;
    await db.query("select update_order_status($1,'delivered')",[orderId]);
    const second=(await db.query("select delivered_at from orders where id=$1",[orderId])).rows[0].delivered_at;
    assert.equal(new Date(first).getTime(),new Date(second).getTime());
    await db.query("select update_order_status($1,'preparing')",[orderId]);
    assert.equal((await db.query("select delivered_at from orders where id=$1",[orderId])).rows[0].delivered_at,null);
  });
  await t.test("product and first variation are created together", async()=> {
    const result=await db.query("select create_product_with_variant($1,'Queijo',null,'Pacote',5,2500) id",[companyA]);
    assert.equal((await db.query("select count(*)::int n from product_variants where product_id=$1",[result.rows[0].id])).rows[0].n,1);
    await assert.rejects(db.query("select create_product_with_variant($1,'Produto inválido',null,'Pacote',5,-1)",[companyA]),/invalid product/);
    assert.equal((await db.query("select count(*)::int n from products where name='Produto inválido'")).rows[0].n,0);
    await assert.rejects(db.query("select create_product_with_variant($1,'Cross tenant',null,'Pacote',5,100)",[companyB]),/access denied/);
  });
  await t.test("storage metadata and deletes stay within the tenant", async()=> {
    await db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)",[`${companyA}/${productA}/photo.jpg`]);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('product-images',$1)",[`${companyB}/${productB}/photo.jpg`]),/row-level security/);
    const deleted=await db.query("delete from storage.objects where name=$1 returning id",[`${companyA}/${productA}/photo.jpg`]);
    assert.equal(deleted.rows.length,1);
  });
  await t.test("anonymous callers cannot execute order mutations", async()=> {
    await db.exec("reset role; set role anon");
    await assert.rejects(createOrder(customerA,0,items),/permission denied/);
    await db.exec("reset role");
    const bucket=(await db.query("select file_size_limit,allowed_mime_types from storage.buckets where id='product-images'")).rows[0];
    assert.equal(Number(bucket.file_size_limit),5242880);
    assert.deepEqual(bucket.allowed_mime_types,["image/jpeg","image/png","image/webp"]);
  });
});

-- Apply after 0003 and 0004. Safe to re-run; no existing rows are deleted.
begin;

create or replace function public.create_order(
  p_customer_id uuid,
  p_discount_cents bigint default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_company_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_variation_id uuid;
  v_quantity integer;
  v_variant record;
  v_subtotal bigint := 0;
  v_seen uuid[] := '{}';
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid items'; end if;
  if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'invalid item count'; end if;
  if p_discount_cents is null or p_discount_cents < 0 or p_discount_cents > 9007199254740991 then
    raise exception 'invalid discount';
  end if;
  if char_length(coalesce(p_notes, '')) > 2000 then raise exception 'notes too long'; end if;

  select company_id into v_company_id from public.customers where id = p_customer_id;
  if v_company_id is null or not public.is_company_member(v_company_id) then
    raise exception 'customer not found or access denied';
  end if;

  -- Insert a valid zero-total header, then set subtotal, discount and total together.
  -- Previously a positive discount violated the CHECK while subtotal was still zero.
  insert into public.orders (company_id, customer_id, order_number, notes, created_by)
  values (v_company_id, p_customer_id, 0, nullif(trim(p_notes), ''), auth.uid())
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variation_id := (v_item ->> 'variation_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_variation_id is null or v_quantity is null or v_quantity not between 1 and 10000 then
      raise exception 'invalid order item';
    end if;
    if v_variation_id = any(v_seen) then raise exception 'duplicate order item'; end if;
    v_seen := array_append(v_seen, v_variation_id);

    select pv.id, pv.product_id, pv.name as variant_name, pv.units_per_package, pv.price_cents, p.name as product_name
      into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id and p.company_id = pv.company_id
     where pv.id = v_variation_id and pv.company_id = v_company_id
       and pv.is_active and p.is_active;
    if not found then raise exception 'product variation not found or inactive'; end if;
    if v_variant.price_cents > 9007199254740991 / v_quantity then raise exception 'amount too large'; end if;
    if v_variant.units_per_package::bigint * v_quantity > 2147483647 then raise exception 'unit count too large'; end if;

    insert into public.order_items (
      company_id, order_id, product_id, product_variant_id, product_name, variant_name,
      quantity, units_per_package, unit_price_cents, line_total_cents
    ) values (
      v_company_id, v_order_id, v_variant.product_id, v_variant.id, v_variant.product_name,
      v_variant.variant_name, v_quantity, v_variant.units_per_package, v_variant.price_cents,
      v_quantity * v_variant.price_cents
    );
    v_subtotal := v_subtotal + v_quantity * v_variant.price_cents;
    if v_subtotal > 9007199254740991 then raise exception 'amount too large'; end if;
  end loop;

  if p_discount_cents > v_subtotal then raise exception 'discount cannot exceed subtotal'; end if;
  update public.orders
     set subtotal_cents = v_subtotal,
         discount_cents = p_discount_cents,
         total_cents = v_subtotal - p_discount_cents
   where id = v_order_id;
  return v_order_id;
end;
$$;

-- Product + first variation succeed or roll back together. RLS remains active.
create or replace function public.create_product_with_variant(
  p_company_id uuid, p_name text, p_description text,
  p_variant_name text, p_units integer, p_price_cents bigint
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare v_product_id uuid;
begin
  if auth.uid() is null or not public.is_company_member(p_company_id) then raise exception 'access denied'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 140 or
     p_variant_name is null or char_length(trim(p_variant_name)) not between 1 and 100 or
     p_price_cents is null or p_price_cents < 0 or p_price_cents > 9007199254740991 or
     (p_units is not null and p_units not between 1 and 100000) or
     char_length(coalesce(p_description, '')) > 2000 then raise exception 'invalid product'; end if;
  insert into public.products(company_id, name, description)
    values(p_company_id, trim(p_name), nullif(trim(p_description), '')) returning id into v_product_id;
  insert into public.product_variants(company_id, product_id, name, units_per_package, price_cents)
    values(p_company_id, v_product_id, trim(p_variant_name), p_units, p_price_cents);
  return v_product_id;
end;
$$;

-- Function execution is explicit; anonymous callers cannot invoke these RPCs.
revoke all on function public.create_order(uuid, bigint, text, jsonb) from public, anon;
revoke all on function public.update_order_status(uuid, public.order_status) from public, anon;
revoke all on function public.create_product_with_variant(uuid, text, text, text, integer, bigint) from public, anon;
grant execute on function public.create_order(uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.create_product_with_variant(uuid, text, text, text, integer, bigint) to authenticated;

-- Enforce upload restrictions on the server, including direct API uploads.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'product-images';

-- SELECT is also needed when deleting/replacing an object through Storage.
drop policy if exists "members can read own product photo metadata" on storage.objects;
create policy "members can read own product photo metadata" on storage.objects
for select to authenticated
using (bucket_id = 'product-images' and public.can_access_product_image(name));

create index if not exists order_items_company_order_idx on public.order_items(company_id, order_id);
notify pgrst, 'reload schema';
commit;

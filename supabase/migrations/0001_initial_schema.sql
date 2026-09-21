-- Espeto Hub: schema inicial para Supabase/PostgreSQL.
-- Rode este arquivo inteiro no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

create type public.member_role as enum ('owner', 'manager', 'seller', 'stock');
create type public.order_status as enum ('new', 'preparing', 'ready', 'delivered', 'cancelled');
create type public.inventory_movement_type as enum ('inbound', 'sale', 'adjustment', 'waste', 'return');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  currency_code char(3) not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id),
  unique (user_id, company_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 140),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique nulls not distinct (company_id, name)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  product_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  units_per_package integer check (units_per_package is null or units_per_package > 0),
  price_cents bigint not null check (price_cents >= 0),
  is_active boolean not null default true,
  track_inventory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, product_id) references public.products(company_id, id) on delete cascade,
  unique (company_id, id),
  unique (product_id, name)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 140),
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null,
  order_number bigint not null,
  status public.order_status not null default 'new',
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, customer_id) references public.customers(company_id, id) on delete restrict,
  unique (company_id, id),
  unique (company_id, order_number),
  check (discount_cents <= subtotal_cents),
  check (total_cents = subtotal_cents - discount_cents)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text not null,
  quantity integer not null check (quantity > 0),
  units_per_package integer check (units_per_package is null or units_per_package > 0),
  total_units integer generated always as (
    case when units_per_package is null then null else quantity * units_per_package end
  ) stored,
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  line_total_cents bigint not null check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  foreign key (company_id, order_id) references public.orders(company_id, id) on delete cascade,
  check (line_total_cents = quantity * unit_price_cents)
);

-- These tables are intentionally not wired into checkout yet. They reserve a
-- clean ledger model for stock, lots and expiry without complicating the MVP.
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  product_variant_id uuid not null,
  quantity numeric(14, 3) not null default 0,
  updated_at timestamptz not null default now(),
  foreign key (company_id, product_variant_id) references public.product_variants(company_id, id) on delete cascade,
  unique (company_id, product_variant_id),
  unique (company_id, id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  type public.inventory_movement_type not null,
  quantity_delta numeric(14, 3) not null check (quantity_delta <> 0),
  reference_type text,
  reference_id uuid,
  notes text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  foreign key (company_id, inventory_item_id) references public.inventory_items(company_id, id) on delete restrict
);

create index company_members_user_id_idx on public.company_members(user_id);
create index products_company_active_idx on public.products(company_id, is_active, name);
create index product_variants_company_product_idx on public.product_variants(company_id, product_id, is_active);
create index customers_company_name_idx on public.customers(company_id, name);
create index customers_company_phone_idx on public.customers(company_id, phone) where phone is not null;
create index orders_company_created_at_idx on public.orders(company_id, created_at desc);
create index orders_company_status_created_at_idx on public.orders(company_id, status, created_at desc);
create index orders_customer_created_at_idx on public.orders(customer_id, created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);
create index inventory_movements_item_occurred_at_idx on public.inventory_movements(inventory_item_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();

-- Avoid a user who belongs to two businesses accidentally moving a record
-- between tenants via a direct update.
create or replace function public.prevent_company_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger products_prevent_company_change before update on public.products
for each row execute function public.prevent_company_change();
create trigger variants_prevent_company_change before update on public.product_variants
for each row execute function public.prevent_company_change();
create trigger customers_prevent_company_change before update on public.customers
for each row execute function public.prevent_company_change();
create trigger orders_prevent_company_change before update on public.orders
for each row execute function public.prevent_company_change();
create trigger order_items_prevent_company_change before update on public.order_items
for each row execute function public.prevent_company_change();
create trigger inventory_items_prevent_company_change before update on public.inventory_items
for each row execute function public.prevent_company_change();
create trigger inventory_movements_prevent_company_change before update on public.inventory_movements
for each row execute function public.prevent_company_change();

-- Human-friendly order numbers, sequential only inside each company.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = 0 then
    perform pg_advisory_xact_lock(hashtext(new.company_id::text));
    select coalesce(max(order_number), 0) + 1
      into new.order_number
      from public.orders
     where company_id = new.company_id;
  end if;
  return new;
end;
$$;

alter table public.orders alter column order_number drop default;
create trigger orders_assign_number before insert on public.orders
for each row execute function public.assign_order_number();

-- The membership lookup is SECURITY DEFINER so RLS policies can safely use it
-- without recursively evaluating company_members policies.
create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
  );
$$;

-- One personal company is created as soon as a person signs up. Later, an owner
-- can invite users by inserting memberships from a controlled server action.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  company_name text;
  base_slug text;
begin
  company_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Minha empresa');
  base_slug := lower(regexp_replace(unaccent(company_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'empresa'; end if;

  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));

  insert into public.companies (name, slug)
  values (company_name, base_slug || '-' || substring(new.id::text from 1 for 8))
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Checkout runs in a single database transaction. Prices are read from the
-- current variation server-side: the browser never chooses a price to persist.
create or replace function public.create_order(
  p_customer_id uuid,
  p_discount_cents bigint default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_variation_id uuid;
  v_quantity integer;
  v_variant record;
  v_subtotal bigint := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item is required';
  end if;
  if p_discount_cents < 0 then
    raise exception 'discount cannot be negative';
  end if;

  select company_id into v_company_id from public.customers where id = p_customer_id;
  if v_company_id is null or not public.is_company_member(v_company_id) then
    raise exception 'customer not found or access denied';
  end if;

  insert into public.orders (company_id, customer_id, order_number, discount_cents, notes, created_by)
  values (v_company_id, p_customer_id, 0, p_discount_cents, nullif(trim(p_notes), ''), auth.uid())
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_variation_id := (v_item ->> 'variation_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'invalid order item';
    end;
    if v_quantity is null or v_quantity < 1 then
      raise exception 'item quantity must be at least one';
    end if;

    select pv.id, pv.product_id, pv.name as variant_name, pv.units_per_package, pv.price_cents, p.name as product_name
      into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id and p.company_id = pv.company_id
     where pv.id = v_variation_id
       and pv.company_id = v_company_id
       and pv.is_active = true
       and p.is_active = true;

    if not found then
      raise exception 'product variation not found or inactive';
    end if;

    insert into public.order_items (
      company_id, order_id, product_id, product_variant_id, product_name, variant_name,
      quantity, units_per_package, unit_price_cents, line_total_cents
    ) values (
      v_company_id, v_order_id, v_variant.product_id, v_variant.id, v_variant.product_name,
      v_variant.variant_name, v_quantity, v_variant.units_per_package, v_variant.price_cents,
      v_quantity * v_variant.price_cents
    );
    v_subtotal := v_subtotal + (v_quantity * v_variant.price_cents);
  end loop;

  if p_discount_cents > v_subtotal then
    raise exception 'discount cannot exceed subtotal';
  end if;

  update public.orders
     set subtotal_cents = v_subtotal,
         total_cents = v_subtotal - p_discount_cents
   where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.update_order_status(p_order_id uuid, p_status public.order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_company_id uuid;
begin
  select company_id into v_company_id from public.orders where id = p_order_id;
  if v_company_id is null or not public.is_company_member(v_company_id) then
    raise exception 'order not found or access denied';
  end if;
  update public.orders set status = p_status where id = p_order_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.create_order(uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy "members can view their company" on public.companies
for select to authenticated using (public.is_company_member(id));
create policy "users can view their profile" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "users can update their profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members can view company memberships" on public.company_members
for select to authenticated using (public.is_company_member(company_id));

create policy "members can select products" on public.products
for select to authenticated using (public.is_company_member(company_id));
create policy "members can insert products" on public.products
for insert to authenticated with check (public.is_company_member(company_id));
create policy "members can update products" on public.products
for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can select variants" on public.product_variants
for select to authenticated using (public.is_company_member(company_id));
create policy "members can insert variants" on public.product_variants
for insert to authenticated with check (public.is_company_member(company_id));
create policy "members can update variants" on public.product_variants
for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can select customers" on public.customers
for select to authenticated using (public.is_company_member(company_id));
create policy "members can insert customers" on public.customers
for insert to authenticated with check (public.is_company_member(company_id));
create policy "members can update customers" on public.customers
for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- Orders and their items are deliberately write-only through the two RPCs above.
create policy "members can select orders" on public.orders
for select to authenticated using (public.is_company_member(company_id));
create policy "members can select order items" on public.order_items
for select to authenticated using (public.is_company_member(company_id));

create policy "members can select inventory items" on public.inventory_items
for select to authenticated using (public.is_company_member(company_id));
create policy "members can manage inventory items" on public.inventory_items
for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can select inventory movements" on public.inventory_movements
for select to authenticated using (public.is_company_member(company_id));
create policy "members can manage inventory movements" on public.inventory_movements
for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

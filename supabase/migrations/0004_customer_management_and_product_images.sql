-- Apply after 0002 and 0003. It enables customer deletion and product photos.
-- Every policy is recreated so this script is safe to re-run from the SQL Editor.

alter table public.products
  add column if not exists image_path text;

drop policy if exists "members can delete customers" on public.customers;
create policy "members can delete customers" on public.customers
for delete to authenticated using (public.is_company_member(company_id));

-- Product photos are intentionally public: catalog images are not sensitive,
-- and public URLs load quickly on mobile devices. Upload, replacement, and
-- deletion remain restricted to a member's own company folder.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

create or replace function public.can_access_product_image(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  object_company_id uuid;
begin
  object_company_id := split_part(object_name, '/', 1)::uuid;
  return public.is_company_member(object_company_id);
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.can_access_product_image(text) from public;
grant execute on function public.can_access_product_image(text) to authenticated;

drop policy if exists "members can upload own product photos" on storage.objects;
create policy "members can upload own product photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and public.can_access_product_image(name)
);

drop policy if exists "members can update own product photos" on storage.objects;
create policy "members can update own product photos" on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images'
  and public.can_access_product_image(name)
)
with check (
  bucket_id = 'product-images'
  and public.can_access_product_image(name)
);

drop policy if exists "members can delete own product photos" on storage.objects;
create policy "members can delete own product photos" on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and public.can_access_product_image(name)
);

-- Financial date follows delivery, while created_at remains the date the order
-- was received. Apply this after 0002 if the first migration stopped early.

alter table public.orders
  add column if not exists delivered_at timestamptz;

create index if not exists orders_company_delivered_at_idx
  on public.orders(company_id, delivered_at desc)
  where delivered_at is not null;

-- The first transition to delivered records the actual delivery timestamp.
-- Moving an order back to another status clears it, so financial totals stay
-- consistent while a mistaken status is being corrected.
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

  update public.orders
     set status = p_status,
         delivered_at = case
           when p_status = 'delivered' then coalesce(delivered_at, now())
           else null
         end
   where id = p_order_id;
end;
$$;

grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

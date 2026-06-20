-- VENUMAIS
-- Pedidos do catálogo (portal do cliente).

begin;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_code integer not null,
  status text not null default 'new',
  order_type text not null default 'order',
  source text not null default 'client',
  delivery_type text not null default 'pickup',
  notes text,
  coupon_code text,
  subtotal_amount numeric(12, 2),
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2),
  edited_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_orders_order_code_positive check (order_code > 0),
  constraint store_orders_subtotal_non_negative check (subtotal_amount is null or subtotal_amount >= 0),
  constraint store_orders_discount_non_negative check (discount_amount >= 0),
  constraint store_orders_total_non_negative check (total_amount is null or total_amount >= 0),
  constraint store_orders_status_check check (status in ('new', 'quote', 'cancelled', 'converted')),
  constraint store_orders_order_type_check check (order_type in ('order', 'quote', 'wholesale')),
  constraint store_orders_source_check check (source in ('client', 'vendor')),
  constraint store_orders_delivery_type_check check (delivery_type in ('pickup', 'delivery')),
  constraint store_orders_notes_length check (notes is null or char_length(notes) <= 500),
  constraint store_orders_coupon_code_length check (coupon_code is null or char_length(coupon_code) <= 40),
  constraint store_orders_store_order_code_unique unique (store_id, order_code)
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12, 2),
  created_at timestamptz not null default timezone('utc', now()),
  constraint store_order_items_quantity_positive check (quantity > 0),
  constraint store_order_items_unit_price_non_negative check (unit_price is null or unit_price >= 0),
  constraint store_order_items_product_name_length check (char_length(product_name) between 1 and 160)
);

create index if not exists store_orders_store_id_idx on public.store_orders (store_id);
create index if not exists store_orders_store_id_created_at_idx
  on public.store_orders (store_id, created_at desc);
create index if not exists store_orders_customer_id_idx on public.store_orders (customer_id);
create index if not exists store_order_items_order_id_idx on public.store_order_items (order_id);

drop trigger if exists store_orders_set_updated_at on public.store_orders;
create trigger store_orders_set_updated_at
before update on public.store_orders
for each row execute function public.set_updated_at();

create or replace function public.register_client_for_store(
  p_store_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_avatar_color text default '#22a06b'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if not exists (
    select 1
    from public.stores store
    where store.id = p_store_id
      and store.status in ('trial', 'active')
  ) then
    raise exception 'Loja indisponível.';
  end if;

  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if found then
    return v_customer_id;
  end if;

  insert into public.customers (
    store_id,
    user_id,
    full_name,
    phone,
    email,
    avatar_color
  )
  values (
    p_store_id,
    auth.uid(),
    trim(p_full_name),
    trim(p_phone),
    nullif(trim(p_email), ''),
    coalesce(nullif(trim(p_avatar_color), ''), '#22a06b')
  )
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;

revoke all on function public.register_client_for_store(uuid, text, text, text, text) from public;
grant execute on function public.register_client_for_store(uuid, text, text, text, text) to authenticated;

create or replace function public.create_client_order(
  p_store_id uuid,
  p_delivery_type text,
  p_notes text,
  p_coupon_code text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_code integer;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_has_hidden_price boolean := false;
  v_status text := 'new';
  v_order_type text := 'order';
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não vinculado à loja.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um item.';
  end if;

  select coalesce(max(order_row.order_code), 0) + 1
    into v_order_code
  from public.store_orders order_row
  where order_row.store_id = p_store_id;

  insert into public.store_orders (
    store_id,
    customer_id,
    order_code,
    status,
    order_type,
    source,
    delivery_type,
    notes,
    coupon_code
  )
  values (
    p_store_id,
    v_customer_id,
    v_order_code,
    v_status,
    v_order_type,
    'client',
    coalesce(nullif(trim(p_delivery_type), ''), 'pickup'),
    nullif(trim(p_notes), ''),
    nullif(trim(p_coupon_code), '')
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select product.*
      into v_product
    from public.products product
    where product.id = (v_item ->> 'product_id')::uuid
      and product.store_id = p_store_id
      and product.active = true;

    if not found then
      raise exception 'Produto indisponível.';
    end if;

    if coalesce(v_product.price_visible, false) then
      v_unit_price := coalesce(v_product.promo_price, v_product.price);
      v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    else
      v_unit_price := null;
      v_has_hidden_price := true;
    end if;

    insert into public.store_order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price
    );
  end loop;

  if v_has_hidden_price then
    v_status := 'quote';
    v_order_type := 'quote';
  end if;

  update public.store_orders
    set status = v_status,
        order_type = v_order_type,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end
  where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_client_order(uuid, text, text, text, jsonb) from public;
grant execute on function public.create_client_order(uuid, text, text, text, jsonb) to authenticated;

create or replace function public.list_store_orders_for_vendor(p_store_id uuid)
returns table (
  id uuid,
  order_code integer,
  status text,
  order_type text,
  source text,
  delivery_type text,
  notes text,
  subtotal_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  edited_at timestamptz,
  created_at timestamptz,
  customer_id uuid,
  customer_full_name text,
  customer_phone text,
  customer_avatar_color text,
  item_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    order_row.id,
    order_row.order_code,
    order_row.status,
    order_row.order_type,
    order_row.source,
    order_row.delivery_type,
    order_row.notes,
    order_row.subtotal_amount,
    order_row.discount_amount,
    order_row.total_amount,
    order_row.edited_at,
    order_row.created_at,
    customer.id,
    customer.full_name,
    customer.phone,
    customer.avatar_color,
    coalesce(sum(item.quantity), 0)::integer as item_count
  from public.store_orders order_row
  join public.customers customer on customer.id = order_row.customer_id
  left join public.store_order_items item on item.order_id = order_row.id
  where order_row.store_id = p_store_id
    and public.is_store_member(p_store_id)
    and order_row.status in ('new', 'quote')
  group by
    order_row.id,
    customer.id
  order by order_row.created_at desc;
$$;

revoke all on function public.list_store_orders_for_vendor(uuid) from public;
grant execute on function public.list_store_orders_for_vendor(uuid) to authenticated;

create or replace function public.list_customer_orders_for_portal(p_store_id uuid)
returns table (
  id uuid,
  order_code integer,
  status text,
  order_type text,
  delivery_type text,
  notes text,
  subtotal_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  edited_at timestamptz,
  created_at timestamptz,
  item_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    order_row.id,
    order_row.order_code,
    order_row.status,
    order_row.order_type,
    order_row.delivery_type,
    order_row.notes,
    order_row.subtotal_amount,
    order_row.discount_amount,
    order_row.total_amount,
    order_row.edited_at,
    order_row.created_at,
    coalesce(sum(item.quantity), 0)::integer as item_count
  from public.store_orders order_row
  join public.customers customer on customer.id = order_row.customer_id
  left join public.store_order_items item on item.order_id = order_row.id
  where order_row.store_id = p_store_id
    and customer.user_id = auth.uid()
    and order_row.status in ('new', 'quote')
  group by order_row.id
  order by order_row.created_at desc;
$$;

revoke all on function public.list_customer_orders_for_portal(uuid) from public;
grant execute on function public.list_customer_orders_for_portal(uuid) to authenticated;

drop policy if exists "customers_select_self" on public.customers;
create policy "customers_select_self"
on public.customers
for select
to authenticated
using (user_id = auth.uid());

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "store_orders_select_members" on public.store_orders;
create policy "store_orders_select_members"
on public.store_orders
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "store_order_items_select_members" on public.store_order_items;
create policy "store_order_items_select_members"
on public.store_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.store_orders order_row
    where order_row.id = order_id
      and public.is_store_member(order_row.store_id)
  )
);

revoke all on table public.store_orders from anon;
revoke all on table public.store_order_items from anon;
grant select on table public.store_orders to authenticated;
grant select on table public.store_order_items to authenticated;

commit;

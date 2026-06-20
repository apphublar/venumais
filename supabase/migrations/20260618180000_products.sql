-- VENUMAIS
-- Produtos e estoque por loja com políticas de acesso multiempresa.

begin;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  category text not null default 'Geral',
  sku text not null default '',
  description text,
  cost numeric(12, 2) not null default 0,
  price numeric(12, 2) not null default 0,
  promo_price numeric(12, 2),
  wholesale_price numeric(12, 2),
  wholesale_min_qty integer,
  stock_qty integer not null default 0,
  min_stock_qty integer not null default 0,
  price_visible boolean not null default true,
  featured boolean not null default false,
  active boolean not null default true,
  thumb_color text not null default '#e9d5ff',
  image_url text,
  barcode text,
  variations jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_name_length check (char_length(name) between 2 and 160),
  constraint products_category_length check (char_length(category) between 1 and 80),
  constraint products_sku_length check (char_length(sku) <= 40),
  constraint products_description_length check (
    description is null or char_length(description) <= 1000
  ),
  constraint products_cost_non_negative check (cost >= 0),
  constraint products_price_non_negative check (price >= 0),
  constraint products_promo_price_non_negative check (
    promo_price is null or promo_price >= 0
  ),
  constraint products_wholesale_price_non_negative check (
    wholesale_price is null or wholesale_price >= 0
  ),
  constraint products_wholesale_min_qty_non_negative check (
    wholesale_min_qty is null or wholesale_min_qty >= 0
  ),
  constraint products_stock_qty_non_negative check (stock_qty >= 0),
  constraint products_min_stock_qty_non_negative check (min_stock_qty >= 0),
  constraint products_thumb_color_format check (thumb_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint products_variations_array check (jsonb_typeof(variations) = 'array')
);

create index if not exists products_store_id_idx
  on public.products (store_id);

create index if not exists products_store_id_name_idx
  on public.products (store_id, lower(name));

create index if not exists products_store_id_category_idx
  on public.products (store_id, lower(category));

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.can_manage_products(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members member
    where member.store_id = target_store_id
      and member.user_id = auth.uid()
      and member.status = 'active'
      and coalesce((member.permissions ->> 'manage_products')::boolean, false)
  );
$$;

revoke all on function public.can_manage_products(uuid) from public;
grant execute on function public.can_manage_products(uuid) to authenticated;

alter table public.products enable row level security;

drop policy if exists "products_select_members" on public.products;
create policy "products_select_members"
on public.products
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "products_insert_manage" on public.products;
create policy "products_insert_manage"
on public.products
for insert
to authenticated
with check (public.can_manage_products(store_id));

drop policy if exists "products_update_manage" on public.products;
create policy "products_update_manage"
on public.products
for update
to authenticated
using (public.can_manage_products(store_id))
with check (public.can_manage_products(store_id));

drop policy if exists "products_delete_manage" on public.products;
create policy "products_delete_manage"
on public.products
for delete
to authenticated
using (public.can_manage_products(store_id));

revoke all on table public.products from anon;
grant select, insert, update, delete on table public.products to authenticated;

commit;

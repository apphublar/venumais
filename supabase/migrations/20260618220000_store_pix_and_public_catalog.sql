-- VENUMAIS
-- PIX da loja, catálogo público e vínculo cliente ↔ usuário.

begin;

alter table public.stores
  add column if not exists pix_key text,
  add column if not exists pix_receiver_name text,
  add column if not exists catalog_tagline text not null default 'Catálogo online';

alter table public.stores
  add constraint stores_pix_key_length check (pix_key is null or char_length(pix_key) <= 120),
  add constraint stores_pix_receiver_name_length check (
    pix_receiver_name is null or char_length(pix_receiver_name) <= 120
  ),
  add constraint stores_catalog_tagline_length check (char_length(catalog_tagline) <= 160);

alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists customers_store_user_unique_idx
  on public.customers (store_id, user_id)
  where user_id is not null;

create or replace function public.get_public_store(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  brand_color text,
  catalog_tagline text,
  pix_key text,
  pix_receiver_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.slug,
    s.brand_color,
    s.catalog_tagline,
    s.pix_key,
    s.pix_receiver_name
  from public.stores s
  where lower(s.slug) = lower(trim(p_slug))
    and s.status in ('trial', 'active')
  limit 1;
$$;

revoke all on function public.get_public_store(text) from public;
grant execute on function public.get_public_store(text) to anon, authenticated;

create or replace function public.list_public_products(p_store_id uuid)
returns table (
  id uuid,
  name text,
  category text,
  price numeric,
  promo_price numeric,
  wholesale_price numeric,
  price_visible boolean,
  featured boolean,
  stock_qty integer,
  thumb_color text,
  image_url text,
  variations jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.category,
    p.price,
    p.promo_price,
    p.wholesale_price,
    p.price_visible,
    p.featured,
    p.stock_qty,
    p.thumb_color,
    p.image_url,
    p.variations
  from public.products p
  where p.store_id = p_store_id
    and p.active = true
    and p.stock_qty > 0
  order by p.featured desc, lower(p.name);
$$;

revoke all on function public.list_public_products(uuid) from public;
grant execute on function public.list_public_products(uuid) to anon, authenticated;

create or replace function public.get_customer_for_store(p_store_id uuid)
returns public.customers
language sql
stable
security definer
set search_path = ''
as $$
  select c.*
  from public.customers c
  where c.store_id = p_store_id
    and c.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_customer_for_store(uuid) from public;
grant execute on function public.get_customer_for_store(uuid) to authenticated;

create or replace function public.list_customer_sales_for_portal(p_store_id uuid, p_customer_id uuid)
returns setof public.sales
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.sales s
  join public.customers c on c.id = s.customer_id
  where s.store_id = p_store_id
    and s.customer_id = p_customer_id
    and c.user_id = auth.uid()
  order by s.sold_at desc;
$$;

revoke all on function public.list_customer_sales_for_portal(uuid, uuid) from public;
grant execute on function public.list_customer_sales_for_portal(uuid, uuid) to authenticated;

commit;

-- VENUMAIS
-- Flag de personalização de marca por loja (só aplica tema customizado quando true).

begin;

alter table public.stores
  add column if not exists brand_customized boolean not null default false;

-- Lojas que já tinham personalização antes da flag.
update public.stores
  set brand_customized = true
where logo_url is not null
   or lower(brand_color) <> '#11885b'
   or lower(brand_text_color) not in ('#ffffff')
   or (
     catalog_tagline is not null
     and btrim(catalog_tagline) <> ''
     and catalog_tagline <> 'Catálogo online'
   );

drop function if exists public.get_public_store(text);

create function public.get_public_store(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  brand_color text,
  brand_text_color text,
  brand_customized boolean,
  catalog_tagline text,
  logo_url text,
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
    s.brand_text_color,
    s.brand_customized,
    s.catalog_tagline,
    s.logo_url,
    s.pix_key,
    s.pix_receiver_name
  from public.stores s
  where lower(s.slug) = lower(trim(p_slug))
    and s.status in ('trial', 'active')
  limit 1;
$$;

revoke all on function public.get_public_store(text) from public;
grant execute on function public.get_public_store(text) to anon, authenticated;

drop function if exists public.list_customer_stores_for_portal();

create function public.list_customer_stores_for_portal()
returns table (
  id uuid,
  name text,
  slug text,
  brand_color text,
  brand_text_color text,
  brand_customized boolean,
  catalog_tagline text,
  logo_url text,
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
    s.brand_text_color,
    s.brand_customized,
    s.catalog_tagline,
    s.logo_url,
    s.pix_key,
    s.pix_receiver_name
  from public.stores s
  join public.customers c on c.store_id = s.id
  where c.user_id = auth.uid()
    and s.status in ('trial', 'active')
  order by lower(s.name);
$$;

revoke all on function public.list_customer_stores_for_portal() from public;
grant execute on function public.list_customer_stores_for_portal() to authenticated;

commit;

begin;

alter table public.stores
  add column if not exists brand_text_color text not null default '#FFFFFF';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_brand_text_color_hex'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_brand_text_color_hex
      check (brand_text_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

drop function if exists public.get_public_store(text);

create function public.get_public_store(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  brand_color text,
  brand_text_color text,
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
    s.brand_text_color,
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-logos',
  'store-logos',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "store_logos_select_public" on storage.objects;
create policy "store_logos_select_public"
on storage.objects
for select
to public
using (bucket_id = 'store-logos');

drop policy if exists "store_logos_insert_authenticated" on storage.objects;
create policy "store_logos_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "store_logos_update_own" on storage.objects;
create policy "store_logos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "store_logos_delete_own" on storage.objects;
create policy "store_logos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

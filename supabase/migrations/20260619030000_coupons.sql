-- VENUMAIS
-- Cupons de desconto por loja.

begin;

create table if not exists public.store_coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  type text not null default 'percent',
  value numeric(10, 2) not null,
  description text,
  uses_count int not null default 0,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_coupons_type_check check (type in ('percent', 'fixed')),
  constraint store_coupons_value_positive check (value > 0),
  constraint store_coupons_code_length check (char_length(code) >= 3 and char_length(code) <= 30),
  constraint store_coupons_unique_code unique (store_id, lower(code))
);

create index if not exists store_coupons_store_active_idx
  on public.store_coupons (store_id, active);

alter table public.store_coupons enable row level security;

drop policy if exists "store_coupons_select" on public.store_coupons;
create policy "store_coupons_select"
  on public.store_coupons for select
  using (public.is_store_member(store_id));

drop policy if exists "store_coupons_insert" on public.store_coupons;
create policy "store_coupons_insert"
  on public.store_coupons for insert
  with check (public.is_store_member(store_id));

drop policy if exists "store_coupons_update" on public.store_coupons;
create policy "store_coupons_update"
  on public.store_coupons for update
  using (public.is_store_member(store_id));

drop policy if exists "store_coupons_delete" on public.store_coupons;
create policy "store_coupons_delete"
  on public.store_coupons for delete
  using (public.is_store_member(store_id));

grant select, insert, update, delete on public.store_coupons to authenticated;

drop trigger if exists store_coupons_set_updated_at on public.store_coupons;
create trigger store_coupons_set_updated_at
  before update on public.store_coupons
  for each row execute function public.set_updated_at();

-- RPC: validate coupon code (used in the client portal)
create or replace function public.validate_store_coupon(
  p_store_id uuid,
  p_code text
)
returns table (
  id uuid,
  code text,
  type text,
  value numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.code,
    c.type,
    c.value
  from public.store_coupons c
  where c.store_id = p_store_id
    and lower(c.code) = lower(p_code)
    and c.active = true
  limit 1;
$$;

grant execute on function public.validate_store_coupon(uuid, text) to authenticated, anon;

commit;

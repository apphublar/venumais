-- VENUMAIS
-- Clientes por loja com políticas de acesso multiempresa.

begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  address text,
  birth_date date,
  notes text,
  avatar_color text not null default '#22a06b',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_full_name_length check (char_length(full_name) between 2 and 120),
  constraint customers_phone_length check (char_length(phone) between 8 and 30),
  constraint customers_email_length check (email is null or char_length(email) <= 120),
  constraint customers_address_length check (address is null or char_length(address) <= 240),
  constraint customers_notes_length check (notes is null or char_length(notes) <= 500),
  constraint customers_avatar_color_format check (avatar_color ~ '^#[0-9a-fA-F]{6}$')
);

create index if not exists customers_store_id_idx
  on public.customers (store_id);

create index if not exists customers_store_id_full_name_idx
  on public.customers (store_id, lower(full_name));

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create or replace function public.can_manage_customers(target_store_id uuid)
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
      and coalesce((member.permissions ->> 'manage_customers')::boolean, false)
  );
$$;

revoke all on function public.can_manage_customers(uuid) from public;
grant execute on function public.can_manage_customers(uuid) to authenticated;

alter table public.customers enable row level security;

drop policy if exists "customers_select_members" on public.customers;
create policy "customers_select_members"
on public.customers
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "customers_insert_manage" on public.customers;
create policy "customers_insert_manage"
on public.customers
for insert
to authenticated
with check (public.can_manage_customers(store_id));

drop policy if exists "customers_update_manage" on public.customers;
create policy "customers_update_manage"
on public.customers
for update
to authenticated
using (public.can_manage_customers(store_id))
with check (public.can_manage_customers(store_id));

drop policy if exists "customers_delete_manage" on public.customers;
create policy "customers_delete_manage"
on public.customers
for delete
to authenticated
using (public.can_manage_customers(store_id));

revoke all on table public.customers from anon;
grant select, insert, update, delete on table public.customers to authenticated;

commit;

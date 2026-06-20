-- VENUMAIS
-- Fundação multiempresa: perfis, lojas, membros e políticas de acesso.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_full_name_length check (char_length(full_name) <= 120),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 30)
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null,
  status text not null default 'trial',
  logo_url text,
  brand_color text not null default '#11885b',
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL',
  trial_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint stores_name_length check (char_length(name) between 2 and 120),
  constraint stores_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint stores_status_check check (
    status in ('trial', 'active', 'past_due', 'suspended', 'cancelled')
  ),
  constraint stores_brand_color_format check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint stores_currency_format check (currency ~ '^[A-Z]{3}$')
);

create unique index if not exists stores_slug_unique_idx
  on public.stores (lower(slug));

create index if not exists stores_owner_user_id_idx
  on public.stores (owner_user_id);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'seller',
  status text not null default 'active',
  permissions jsonb not null default '{
    "manage_customers": true,
    "manage_products": true,
    "manage_orders": true,
    "manage_sales": true,
    "manage_payments": true,
    "manage_team": false,
    "manage_store": false
  }'::jsonb,
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_members_unique_user unique (store_id, user_id),
  constraint store_members_role_check check (role in ('owner', 'admin', 'seller')),
  constraint store_members_status_check check (
    status in ('invited', 'active', 'disabled')
  ),
  constraint store_members_permissions_object check (
    jsonb_typeof(permissions) = 'object'
  )
);

create index if not exists store_members_user_id_idx
  on public.store_members (user_id);

create index if not exists store_members_store_id_status_idx
  on public.store_members (store_id, status);

create or replace function public.prevent_store_owner_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_user_id <> old.owner_user_id then
    raise exception 'A transferência de propriedade exige um fluxo dedicado.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists stores_prevent_owner_change on public.stores;
create trigger stores_prevent_owner_change
before update on public.stores
for each row execute function public.prevent_store_owner_change();

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists store_members_set_updated_at on public.store_members;
create trigger store_members_set_updated_at
before update on public.store_members
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_store_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.store_members (
    store_id,
    user_id,
    role,
    status,
    permissions
  )
  values (
    new.id,
    new.owner_user_id,
    'owner',
    'active',
    '{
      "manage_customers": true,
      "manage_products": true,
      "manage_orders": true,
      "manage_sales": true,
      "manage_payments": true,
      "manage_team": true,
      "manage_store": true
    }'::jsonb
  )
  on conflict (store_id, user_id) do update
    set role = 'owner',
        status = 'active',
        permissions = excluded.permissions,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_store_created_add_owner on public.stores;
create trigger on_store_created_add_owner
after insert on public.stores
for each row execute function public.add_store_owner_membership();

create or replace function public.is_store_member(target_store_id uuid)
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
  );
$$;

create or replace function public.has_store_role(
  target_store_id uuid,
  allowed_roles text[]
)
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
      and member.role = any(allowed_roles)
  );
$$;

create or replace function public.shares_store_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.store_members mine
      join public.store_members theirs
        on theirs.store_id = mine.store_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = target_user_id
        and theirs.status = 'active'
    );
$$;

revoke all on function public.is_store_member(uuid) from public;
revoke all on function public.has_store_role(uuid, text[]) from public;
revoke all on function public.shares_store_with(uuid) from public;

grant execute on function public.is_store_member(uuid) to authenticated;
grant execute on function public.has_store_role(uuid, text[]) to authenticated;
grant execute on function public.shares_store_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;

drop policy if exists "profiles_select_shared_store" on public.profiles;
create policy "profiles_select_shared_store"
on public.profiles
for select
to authenticated
using (public.shares_store_with(id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "stores_select_members" on public.stores;
create policy "stores_select_members"
on public.stores
for select
to authenticated
using (public.is_store_member(id));

drop policy if exists "stores_insert_owner" on public.stores;
create policy "stores_insert_owner"
on public.stores
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "stores_update_management" on public.stores;
create policy "stores_update_management"
on public.stores
for update
to authenticated
using (public.has_store_role(id, array['owner', 'admin']))
with check (public.has_store_role(id, array['owner', 'admin']));

drop policy if exists "stores_delete_owner" on public.stores;
create policy "stores_delete_owner"
on public.stores
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "store_members_select_store_members" on public.store_members;
create policy "store_members_select_store_members"
on public.store_members
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "store_members_insert_management" on public.store_members;
create policy "store_members_insert_management"
on public.store_members
for insert
to authenticated
with check (
  public.has_store_role(store_id, array['owner', 'admin'])
  and role <> 'owner'
);

drop policy if exists "store_members_update_management" on public.store_members;
create policy "store_members_update_management"
on public.store_members
for update
to authenticated
using (
  public.has_store_role(store_id, array['owner', 'admin'])
  and role <> 'owner'
)
with check (
  public.has_store_role(store_id, array['owner', 'admin'])
  and role <> 'owner'
);

drop policy if exists "store_members_delete_management" on public.store_members;
create policy "store_members_delete_management"
on public.store_members
for delete
to authenticated
using (
  public.has_store_role(store_id, array['owner', 'admin'])
  and role <> 'owner'
);

revoke all on table public.profiles from anon;
revoke all on table public.stores from anon;
revoke all on table public.store_members from anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.stores to authenticated;
grant select, insert, update, delete on table public.store_members to authenticated;

commit;

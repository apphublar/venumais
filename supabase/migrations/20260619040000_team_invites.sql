-- VENUMAIS
-- Convites de equipe via token.

begin;

create table if not exists public.store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text,
  role text not null default 'seller',
  token text not null unique,
  status text not null default 'pending',
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint store_invites_role_check check (role in ('admin', 'seller')),
  constraint store_invites_status_check check (status in ('pending', 'accepted', 'expired', 'cancelled'))
);

create index if not exists store_invites_store_id_idx on public.store_invites (store_id);
create index if not exists store_invites_token_idx on public.store_invites (token);

alter table public.store_invites enable row level security;

drop policy if exists "store_invites_select" on public.store_invites;
create policy "store_invites_select"
  on public.store_invites for select
  using (public.is_store_member(store_id));

drop policy if exists "store_invites_insert" on public.store_invites;
create policy "store_invites_insert"
  on public.store_invites for insert
  with check (public.is_store_member(store_id));

drop policy if exists "store_invites_update" on public.store_invites;
create policy "store_invites_update"
  on public.store_invites for update
  using (public.is_store_member(store_id));

grant select, insert, update on public.store_invites to authenticated;

-- RPC: accept invite — callable by anyone who has the token and is authenticated
create or replace function public.accept_store_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.store_invites;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('error', 'Você precisa estar autenticado.');
  end if;

  select * into v_invite
  from public.store_invites
  where token = p_token
    and status = 'pending'
    and expires_at > timezone('utc', now())
  limit 1;

  if not found then
    return jsonb_build_object('error', 'Convite inválido ou expirado.');
  end if;

  -- Check if user is already a member
  if exists (
    select 1 from public.store_members
    where store_id = v_invite.store_id
      and user_id = v_user_id
      and status = 'active'
  ) then
    return jsonb_build_object('error', 'Você já faz parte desta equipe.');
  end if;

  -- Add to team
  insert into public.store_members (store_id, user_id, role, status, invited_by)
  values (v_invite.store_id, v_user_id, v_invite.role, 'active', v_invite.invited_by)
  on conflict (store_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        invited_by = excluded.invited_by,
        updated_at = timezone('utc', now());

  -- Mark invite as accepted
  update public.store_invites
  set status = 'accepted',
      used_by = v_user_id,
      used_at = timezone('utc', now())
  where id = v_invite.id;

  return jsonb_build_object(
    'store_id', v_invite.store_id,
    'role', v_invite.role
  );
end;
$$;

-- Allow any authenticated user to call accept_store_invite (they need the token)
grant execute on function public.accept_store_invite(text) to authenticated;

-- RPC: get invite details (public — for the invite landing page)
create or replace function public.get_store_invite(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'store_name', s.name,
    'store_slug', s.slug,
    'role', i.role,
    'expires_at', i.expires_at,
    'valid', (i.status = 'pending' and i.expires_at > timezone('utc', now()))
  )
  from public.store_invites i
  join public.stores s on s.id = i.store_id
  where i.token = p_token
  limit 1;
$$;

grant execute on function public.get_store_invite(text) to authenticated, anon;

commit;

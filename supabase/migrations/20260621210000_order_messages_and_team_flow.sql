-- VENUMAIS
-- Chat por pedido (vendedor ↔ cliente) e helpers de mensagens.

begin;

create table if not exists public.store_order_messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.store_orders(id) on delete cascade,
  sender_type text not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint store_order_messages_sender_type_check
    check (sender_type in ('vendor', 'client')),
  constraint store_order_messages_body_length
    check (char_length(trim(body)) between 1 and 2000)
);

create index if not exists store_order_messages_order_id_idx
  on public.store_order_messages (order_id, created_at asc);

create index if not exists store_order_messages_store_id_idx
  on public.store_order_messages (store_id, created_at desc);

alter table public.store_order_messages enable row level security;

create or replace function public.list_order_messages_for_vendor(
  p_store_id uuid,
  p_order_id uuid
)
returns table (
  id uuid,
  sender_type text,
  sender_user_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    message_row.id,
    message_row.sender_type,
    message_row.sender_user_id,
    message_row.body,
    message_row.read_at,
    message_row.created_at
  from public.store_order_messages message_row
  join public.store_orders order_row on order_row.id = message_row.order_id
  where message_row.store_id = p_store_id
    and message_row.order_id = p_order_id
    and public.can_manage_sales(p_store_id)
  order by message_row.created_at asc;
$$;

revoke all on function public.list_order_messages_for_vendor(uuid, uuid) from public;
grant execute on function public.list_order_messages_for_vendor(uuid, uuid) to authenticated;

create or replace function public.list_order_messages_for_portal(
  p_store_id uuid,
  p_order_id uuid
)
returns table (
  id uuid,
  sender_type text,
  sender_user_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    message_row.id,
    message_row.sender_type,
    message_row.sender_user_id,
    message_row.body,
    message_row.read_at,
    message_row.created_at
  from public.store_order_messages message_row
  join public.store_orders order_row on order_row.id = message_row.order_id
  join public.customers customer on customer.id = order_row.customer_id
  where message_row.store_id = p_store_id
    and message_row.order_id = p_order_id
    and customer.user_id = auth.uid()
    and order_row.source = 'client'
  order by message_row.created_at asc;
$$;

revoke all on function public.list_order_messages_for_portal(uuid, uuid) from public;
grant execute on function public.list_order_messages_for_portal(uuid, uuid) to authenticated;

create or replace function public.send_order_message_for_vendor(
  p_store_id uuid,
  p_order_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message_id uuid;
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para enviar mensagem.';
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'Digite uma mensagem.';
  end if;

  if char_length(trim(p_body)) > 2000 then
    raise exception 'Mensagem muito longa.';
  end if;

  if not exists (
    select 1
    from public.store_orders order_row
    where order_row.id = p_order_id
      and order_row.store_id = p_store_id
  ) then
    raise exception 'Pedido não encontrado.';
  end if;

  insert into public.store_order_messages (
    store_id,
    order_id,
    sender_type,
    sender_user_id,
    body
  )
  values (
    p_store_id,
    p_order_id,
    'vendor',
    auth.uid(),
    trim(p_body)
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_order_message_for_vendor(uuid, uuid, text) from public;
grant execute on function public.send_order_message_for_vendor(uuid, uuid, text) to authenticated;

create or replace function public.send_order_message_for_portal(
  p_store_id uuid,
  p_order_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message_id uuid;
  v_customer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'Digite uma mensagem.';
  end if;

  if char_length(trim(p_body)) > 2000 then
    raise exception 'Mensagem muito longa.';
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

  if not exists (
    select 1
    from public.store_orders order_row
    where order_row.id = p_order_id
      and order_row.store_id = p_store_id
      and order_row.customer_id = v_customer_id
      and order_row.source = 'client'
  ) then
    raise exception 'Pedido não encontrado.';
  end if;

  insert into public.store_order_messages (
    store_id,
    order_id,
    sender_type,
    sender_user_id,
    body
  )
  values (
    p_store_id,
    p_order_id,
    'client',
    auth.uid(),
    trim(p_body)
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_order_message_for_portal(uuid, uuid, text) from public;
grant execute on function public.send_order_message_for_portal(uuid, uuid, text) to authenticated;

create or replace function public.mark_order_messages_read_for_vendor(
  p_store_id uuid,
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão.';
  end if;

  update public.store_order_messages
    set read_at = timezone('utc', now())
  where store_id = p_store_id
    and order_id = p_order_id
    and sender_type = 'client'
    and read_at is null;
end;
$$;

revoke all on function public.mark_order_messages_read_for_vendor(uuid, uuid) from public;
grant execute on function public.mark_order_messages_read_for_vendor(uuid, uuid) to authenticated;

create or replace function public.mark_order_messages_read_for_portal(
  p_store_id uuid,
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não vinculado à loja.';
  end if;

  update public.store_order_messages message_row
    set read_at = timezone('utc', now())
  from public.store_orders order_row
  where message_row.order_id = p_order_id
    and message_row.store_id = p_store_id
    and message_row.sender_type = 'vendor'
    and message_row.read_at is null
    and order_row.id = message_row.order_id
    and order_row.customer_id = v_customer_id;
end;
$$;

revoke all on function public.mark_order_messages_read_for_portal(uuid, uuid) from public;
grant execute on function public.mark_order_messages_read_for_portal(uuid, uuid) to authenticated;

commit;

-- VENUMAIS
-- Portal do cliente: bloqueio de autoatendimento com débito em aberto
-- e solicitações de alteração para o vendedor.

begin;

create or replace function public.customer_portal_has_open_debt(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sale_installments installment
    join public.sales sale on sale.id = installment.sale_id
    join public.customers customer on customer.id = sale.customer_id
    where sale.store_id = p_store_id
      and customer.user_id = auth.uid()
      and installment.paid = false
  );
$$;

revoke all on function public.customer_portal_has_open_debt(uuid) from public;
grant execute on function public.customer_portal_has_open_debt(uuid) to authenticated;

create table if not exists public.customer_account_change_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  payload jsonb,
  message text,
  status text not null default 'pending',
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_account_change_requests_type_check
    check (request_type in ('profile', 'password', 'deletion', 'support')),
  constraint customer_account_change_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint customer_account_change_requests_message_length
    check (message is null or char_length(message) <= 2000)
);

create index if not exists customer_account_change_requests_store_status_idx
  on public.customer_account_change_requests (store_id, status, requested_at desc);

create unique index if not exists customer_account_change_requests_unique_pending_idx
  on public.customer_account_change_requests (store_id, customer_id, request_type)
  where status = 'pending';

drop trigger if exists customer_account_change_requests_set_updated_at
  on public.customer_account_change_requests;
create trigger customer_account_change_requests_set_updated_at
before update on public.customer_account_change_requests
for each row execute function public.set_updated_at();

alter table public.customer_account_change_requests enable row level security;

drop policy if exists "customer_account_change_requests_select_members"
  on public.customer_account_change_requests;
create policy "customer_account_change_requests_select_members"
on public.customer_account_change_requests
for select
to authenticated
using (
  public.is_store_member(store_id)
  or user_id = auth.uid()
);

drop policy if exists "customer_account_change_requests_insert_self"
  on public.customer_account_change_requests;
create policy "customer_account_change_requests_insert_self"
on public.customer_account_change_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "customer_account_change_requests_update_members"
  on public.customer_account_change_requests;
create policy "customer_account_change_requests_update_members"
on public.customer_account_change_requests
for update
to authenticated
using (public.is_store_member(store_id))
with check (public.is_store_member(store_id));

create or replace function public.request_customer_account_change_for_portal(
  p_store_id uuid,
  p_request_type text,
  p_message text default null,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if p_request_type not in ('profile', 'password', 'deletion', 'support') then
    raise exception 'Tipo de solicitação inválido.';
  end if;

  if not public.customer_portal_has_open_debt(p_store_id) then
    raise exception 'Solicitações ao vendedor só são necessárias com pagamentos em aberto.';
  end if;

  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não encontrado.';
  end if;

  if nullif(trim(p_message), '') is null
     and (p_payload is null or p_payload = '{}'::jsonb) then
    raise exception 'Descreva o que precisa alterar.';
  end if;

  select request.id
    into v_request_id
  from public.customer_account_change_requests request
  where request.store_id = p_store_id
    and request.customer_id = v_customer_id
    and request.request_type = p_request_type
    and request.status = 'pending'
  limit 1;

  if found then
    update public.customer_account_change_requests
      set message = nullif(trim(p_message), ''),
          payload = coalesce(p_payload, payload),
          requested_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
    where id = v_request_id;
  else
    insert into public.customer_account_change_requests (
      store_id,
      customer_id,
      user_id,
      request_type,
      payload,
      message,
      status
    )
    values (
      p_store_id,
      v_customer_id,
      auth.uid(),
      p_request_type,
      p_payload,
      nullif(trim(p_message), ''),
      'pending'
    )
    returning id into v_request_id;
  end if;

  return v_request_id;
end;
$$;

revoke all on function public.request_customer_account_change_for_portal(uuid, text, text, jsonb) from public;
grant execute on function public.request_customer_account_change_for_portal(uuid, text, text, jsonb) to authenticated;

create or replace function public.delete_customer_portal_access_for_portal(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if public.customer_portal_has_open_debt(p_store_id) then
    raise exception 'Quite suas parcelas para excluir a conta.';
  end if;

  update public.customers customer
    set user_id = null,
        updated_at = timezone('utc', now())
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid();

  if not found then
    raise exception 'Cliente não encontrado.';
  end if;
end;
$$;

revoke all on function public.delete_customer_portal_access_for_portal(uuid) from public;
grant execute on function public.delete_customer_portal_access_for_portal(uuid) to authenticated;

create or replace function public.update_customer_profile_for_portal(
  p_store_id uuid,
  p_email text default null,
  p_phone text default null,
  p_address_postal_code text default null,
  p_address_street text default null,
  p_address_number text default null,
  p_address_complement text default null,
  p_address_neighborhood text default null,
  p_address_city text default null,
  p_address_state text default null
)
returns public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers;
begin
  if public.customer_portal_has_open_debt(p_store_id) then
    raise exception 'Você possui pagamentos em aberto. Solicite a alteração pelo suporte da loja.';
  end if;

  update public.customers customer
    set email = nullif(trim(coalesce(p_email, customer.email)), ''),
        phone = nullif(trim(coalesce(p_phone, customer.phone)), ''),
        address_postal_code = nullif(trim(coalesce(p_address_postal_code, customer.address_postal_code)), ''),
        address_street = nullif(trim(coalesce(p_address_street, customer.address_street)), ''),
        address_number = nullif(trim(coalesce(p_address_number, customer.address_number)), ''),
        address_complement = nullif(trim(coalesce(p_address_complement, customer.address_complement)), ''),
        address_neighborhood = nullif(trim(coalesce(p_address_neighborhood, customer.address_neighborhood)), ''),
        address_city = nullif(trim(coalesce(p_address_city, customer.address_city)), ''),
        address_state = nullif(trim(coalesce(p_address_state, customer.address_state)), ''),
        updated_at = timezone('utc', now())
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  returning * into v_customer;

  if not found then
    raise exception 'Cliente não encontrado.';
  end if;

  return v_customer;
end;
$$;

create or replace function public.request_customer_deletion_for_portal(
  p_store_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if public.customer_portal_has_open_debt(p_store_id) then
    raise exception 'Quite suas parcelas para excluir a conta.';
  end if;

  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não encontrado.';
  end if;

  select request.id
    into v_request_id
  from public.customer_deletion_requests request
  where request.store_id = p_store_id
    and request.customer_id = v_customer_id
    and request.status = 'pending'
  limit 1;

  if found then
    update public.customer_deletion_requests
      set reason = nullif(trim(p_reason), ''),
          requested_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
    where id = v_request_id;
  else
    insert into public.customer_deletion_requests (
      store_id,
      customer_id,
      user_id,
      reason,
      status
    )
    values (
      p_store_id,
      v_customer_id,
      auth.uid(),
      nullif(trim(p_reason), ''),
      'pending'
    )
    returning id into v_request_id;
  end if;

  return v_request_id;
end;
$$;

create or replace function public.list_customer_account_change_requests_for_store(
  p_store_id uuid,
  p_customer_id uuid default null
)
returns table (
  id uuid,
  customer_id uuid,
  request_type text,
  payload jsonb,
  message text,
  status text,
  requested_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.customer_id,
    request.request_type,
    request.payload,
    request.message,
    request.status,
    request.requested_at
  from public.customer_account_change_requests request
  where request.store_id = p_store_id
    and request.status = 'pending'
    and (p_customer_id is null or request.customer_id = p_customer_id)
    and public.is_store_member(p_store_id)
  order by request.requested_at desc;
$$;

revoke all on function public.list_customer_account_change_requests_for_store(uuid, uuid) from public;
grant execute on function public.list_customer_account_change_requests_for_store(uuid, uuid) to authenticated;

-- ── Cancelamento pelo cliente enquanto pagamento não foi confirmado pela loja ──
create or replace function public.cancel_customer_order_for_portal(
  p_store_id uuid,
  p_order_id uuid
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

  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não vinculado à loja.';
  end if;

  update public.store_orders
    set status = 'cancelled',
        cancelled_at = timezone('utc', now()),
        edited_at = timezone('utc', now())
  where id = p_order_id
    and store_id = p_store_id
    and customer_id = v_customer_id
    and source = 'client'
    and status in (
      'new',
      'quote',
      'quoted',
      'quote_answered',
      'awaiting_payment',
      'payment_review',
      'awaiting_card',
      'cash_on_delivery'
    );

  if not found then
    raise exception 'Pedido não pode ser cancelado.';
  end if;

  return p_order_id;
end;
$$;

commit;

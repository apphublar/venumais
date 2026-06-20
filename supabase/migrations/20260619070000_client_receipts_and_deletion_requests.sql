-- VENUMAIS
-- Portal do cliente: comprovante real de pagamento e solicitação de exclusão de conta.

begin;

alter table public.sale_installments
  add column if not exists payment_receipt_url text,
  add column if not exists payment_receipt_name text;

create table if not exists public.customer_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending',
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_deletion_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint customer_deletion_requests_reason_length check (reason is null or char_length(reason) <= 1000)
);

create index if not exists customer_deletion_requests_store_status_idx
  on public.customer_deletion_requests (store_id, status, requested_at desc);
create unique index if not exists customer_deletion_requests_unique_pending_idx
  on public.customer_deletion_requests (store_id, customer_id)
  where status = 'pending';

drop trigger if exists customer_deletion_requests_set_updated_at on public.customer_deletion_requests;
create trigger customer_deletion_requests_set_updated_at
before update on public.customer_deletion_requests
for each row execute function public.set_updated_at();

create or replace function public.report_installment_payment(
  p_store_id uuid,
  p_installment_id uuid,
  p_receipt_url text default null,
  p_receipt_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sale_installments installment
    set payment_reported_at = timezone('utc', now()),
        payment_receipt_url = nullif(trim(p_receipt_url), ''),
        payment_receipt_name = nullif(trim(p_receipt_name), ''),
        updated_at = timezone('utc', now())
  from public.sales sale
  join public.customers customer on customer.id = sale.customer_id
  where installment.id = p_installment_id
    and installment.sale_id = sale.id
    and sale.store_id = p_store_id
    and customer.user_id = auth.uid()
    and installment.paid = false;

  if not found then
    raise exception 'Parcela não encontrada ou já quitada.';
  end if;
end;
$$;

revoke all on function public.report_installment_payment(uuid, uuid, text, text) from public;
grant execute on function public.report_installment_payment(uuid, uuid, text, text) to authenticated;

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

revoke all on function public.request_customer_deletion_for_portal(uuid, text) from public;
grant execute on function public.request_customer_deletion_for_portal(uuid, text) to authenticated;

alter table public.customer_deletion_requests enable row level security;

drop policy if exists "customer_deletion_requests_select_members" on public.customer_deletion_requests;
create policy "customer_deletion_requests_select_members"
on public.customer_deletion_requests
for select
to authenticated
using (
  public.is_store_member(store_id)
  or user_id = auth.uid()
);

drop policy if exists "customer_deletion_requests_insert_self" on public.customer_deletion_requests;
create policy "customer_deletion_requests_insert_self"
on public.customer_deletion_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "customer_deletion_requests_update_members" on public.customer_deletion_requests;
create policy "customer_deletion_requests_update_members"
on public.customer_deletion_requests
for update
to authenticated
using (public.is_store_member(store_id))
with check (public.is_store_member(store_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "payment_receipts_select_authenticated" on storage.objects;
create policy "payment_receipts_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'payment-receipts');

drop policy if exists "payment_receipts_insert_authenticated" on storage.objects;
create policy "payment_receipts_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "payment_receipts_update_own" on storage.objects;
create policy "payment_receipts_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "payment_receipts_delete_own" on storage.objects;
create policy "payment_receipts_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

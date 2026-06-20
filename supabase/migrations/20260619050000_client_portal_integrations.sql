-- VENUMAIS
-- Integrações do portal do cliente: perfil, aviso de pagamento.

begin;

alter table public.sale_installments
  add column if not exists payment_reported_at timestamptz;

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

revoke all on function public.update_customer_profile_for_portal(
  uuid, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.update_customer_profile_for_portal(
  uuid, text, text, text, text, text, text, text, text, text
) to authenticated;

create or replace function public.report_installment_payment(
  p_store_id uuid,
  p_installment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sale_installments installment
    set payment_reported_at = timezone('utc', now()),
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

revoke all on function public.report_installment_payment(uuid, uuid) from public;
grant execute on function public.report_installment_payment(uuid, uuid) to authenticated;

drop policy if exists "customers_update_self" on public.customers;
create policy "customers_update_self"
on public.customers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;

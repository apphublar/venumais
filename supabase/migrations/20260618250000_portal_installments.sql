-- VENUMAIS
-- RPCs do portal do cliente: parcelas, resumo de vendas e confirmação.

begin;

create or replace function public.list_customer_installments_for_portal(p_store_id uuid)
returns table (
  id uuid,
  sale_id uuid,
  sale_code integer,
  installment_number integer,
  due_date date,
  amount numeric,
  paid boolean,
  paid_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    installment.id,
    installment.sale_id,
    sale.sale_code,
    installment.installment_number,
    installment.due_date,
    installment.amount,
    installment.paid,
    installment.paid_at
  from public.sale_installments installment
  join public.sales sale on sale.id = installment.sale_id
  join public.customers customer on customer.id = sale.customer_id
  where sale.store_id = p_store_id
    and customer.user_id = auth.uid()
  order by installment.due_date asc, installment.installment_number asc;
$$;

revoke all on function public.list_customer_installments_for_portal(uuid) from public;
grant execute on function public.list_customer_installments_for_portal(uuid) to authenticated;

create or replace function public.list_customer_sales_summary_for_portal(p_store_id uuid)
returns table (
  id uuid,
  sale_code integer,
  sold_at timestamptz,
  total_amount numeric,
  payment_mode text,
  confirmation_status text,
  confirmed_at timestamptz,
  item_count integer,
  open_amount numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    sale.id,
    sale.sale_code,
    sale.sold_at,
    sale.total_amount,
    sale.payment_mode,
    sale.confirmation_status,
    sale.confirmed_at,
    coalesce(items.item_count, 0)::integer as item_count,
    coalesce(open_installments.open_amount, 0)::numeric as open_amount
  from public.sales sale
  join public.customers customer on customer.id = sale.customer_id
  left join lateral (
    select count(*)::integer as item_count
    from public.sale_items item
    where item.sale_id = sale.id
  ) items on true
  left join lateral (
    select coalesce(sum(installment.amount), 0)::numeric as open_amount
    from public.sale_installments installment
    where installment.sale_id = sale.id
      and installment.paid = false
  ) open_installments on true
  where sale.store_id = p_store_id
    and customer.user_id = auth.uid()
  order by sale.sold_at desc;
$$;

revoke all on function public.list_customer_sales_summary_for_portal(uuid) from public;
grant execute on function public.list_customer_sales_summary_for_portal(uuid) to authenticated;

create or replace function public.get_customer_sale_for_portal(p_store_id uuid, p_sale_id uuid)
returns table (
  id uuid,
  sale_code integer,
  sold_at timestamptz,
  total_amount numeric,
  payment_mode text,
  confirmation_status text,
  confirmed_at timestamptz,
  items jsonb,
  installments jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    sale.id,
    sale.sale_code,
    sale.sold_at,
    sale.total_amount,
    sale.payment_mode,
    sale.confirmation_status,
    sale.confirmed_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'product_id', item.product_id,
            'product_name', item.product_name,
            'quantity', item.quantity,
            'unit_price', item.unit_price
          )
          order by item.created_at
        )
        from public.sale_items item
        where item.sale_id = sale.id
      ),
      '[]'::jsonb
    ) as items,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', installment.id,
            'installment_number', installment.installment_number,
            'due_date', installment.due_date,
            'amount', installment.amount,
            'paid', installment.paid
          )
          order by installment.installment_number
        )
        from public.sale_installments installment
        where installment.sale_id = sale.id
      ),
      '[]'::jsonb
    ) as installments
  from public.sales sale
  join public.customers customer on customer.id = sale.customer_id
  where sale.store_id = p_store_id
    and sale.id = p_sale_id
    and customer.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_customer_sale_for_portal(uuid, uuid) from public;
grant execute on function public.get_customer_sale_for_portal(uuid, uuid) to authenticated;

create or replace function public.confirm_customer_sale(p_store_id uuid, p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales sale
    set confirmation_status = 'confirmed',
        confirmed_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
  from public.customers customer
  where sale.id = p_sale_id
    and sale.store_id = p_store_id
    and sale.customer_id = customer.id
    and customer.user_id = auth.uid()
    and sale.confirmation_status = 'pending';

  if not found then
    raise exception 'Venda não encontrada ou já confirmada.';
  end if;
end;
$$;

revoke all on function public.confirm_customer_sale(uuid, uuid) from public;
grant execute on function public.confirm_customer_sale(uuid, uuid) to authenticated;

commit;

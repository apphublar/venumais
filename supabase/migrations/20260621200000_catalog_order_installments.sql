-- VENUMAIS
-- Parcelamento no catálogo, comprovantes por parcela e autorização do vendedor.

begin;

-- ── Colunas em store_orders ───────────────────────────────────────────────────
alter table public.store_orders
  add column if not exists payment_mode text not null default 'cash',
  add column if not exists installment_plan_status text not null default 'none',
  add column if not exists installment_card_mode text;

alter table public.store_orders
  drop constraint if exists store_orders_payment_mode_check;

alter table public.store_orders
  add constraint store_orders_payment_mode_check
  check (payment_mode in ('cash', 'installment'));

alter table public.store_orders
  drop constraint if exists store_orders_installment_plan_status_check;

alter table public.store_orders
  add constraint store_orders_installment_plan_status_check
  check (installment_plan_status in ('none', 'pending', 'approved', 'rejected'));

alter table public.store_orders
  drop constraint if exists store_orders_installment_card_mode_check;

alter table public.store_orders
  add constraint store_orders_installment_card_mode_check
  check (
    installment_card_mode is null
    or installment_card_mode in ('full', 'per_installment')
  );

alter table public.store_orders
  drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in (
    'quote',
    'quote_answered',
    'awaiting_installment_approval',
    'awaiting_payment',
    'awaiting_card',
    'cash_on_delivery',
    'paid',
    'cancelled',
    'new',
    'quoted',
    'payment_review',
    'delivering',
    'delivered',
    'converted'
  ));

-- ── Parcelas do pedido de catálogo ────────────────────────────────────────────
create table if not exists public.store_order_installments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  paid boolean not null default false,
  paid_at timestamptz,
  payment_informed boolean not null default false,
  payment_proof_url text,
  payment_proof_name text,
  payment_reported_at timestamptz,
  vendor_payment_link text,
  vendor_payment_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_order_installments_number_positive check (installment_number > 0),
  constraint store_order_installments_amount_non_negative check (amount >= 0),
  constraint store_order_installments_unique_number unique (order_id, installment_number)
);

create index if not exists store_order_installments_order_id_idx
  on public.store_order_installments (order_id);

create index if not exists store_order_installments_due_date_idx
  on public.store_order_installments (due_date);

drop trigger if exists store_order_installments_set_updated_at on public.store_order_installments;
create trigger store_order_installments_set_updated_at
before update on public.store_order_installments
for each row execute function public.set_updated_at();

-- ── Finalizar pedido (à vista ou parcelado) ────────────────────────────────────
create or replace function public.finalize_customer_order_for_portal(
  p_store_id uuid,
  p_order_id uuid,
  p_payment_method text,
  p_payment_note text,
  p_payment_mode text default 'cash',
  p_installments jsonb default null,
  p_installment_card_mode text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_new_status text;
  v_total numeric(12, 2);
  v_item jsonb;
  v_number integer;
  v_due_date date;
  v_amount numeric(12, 2);
  v_sum numeric(12, 2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if p_payment_method not in ('pix', 'cash', 'card') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if coalesce(p_payment_mode, 'cash') not in ('cash', 'installment') then
    raise exception 'Modo de pagamento inválido.';
  end if;

  if p_payment_mode = 'installment'
     and p_installment_card_mode is not null
     and p_installment_card_mode not in ('full', 'per_installment') then
    raise exception 'Modo de cartão parcelado inválido.';
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

  select order_row.total_amount
    into v_total
  from public.store_orders order_row
  where order_row.id = p_order_id
    and order_row.store_id = p_store_id
    and order_row.customer_id = v_customer_id
    and order_row.source = 'client'
    and order_row.status in ('new', 'quote', 'quoted', 'quote_answered')
    and order_row.total_amount is not null
    and order_row.total_amount > 0
  for update;

  if not found then
    raise exception 'Pedido não pode ser finalizado.';
  end if;

  if p_payment_mode = 'installment' then
    if p_installments is null
       or jsonb_typeof(p_installments) <> 'array'
       or jsonb_array_length(p_installments) < 2 then
      raise exception 'Informe ao menos 2 parcelas com datas.';
    end if;

    delete from public.store_order_installments
    where order_id = p_order_id;

    for v_item in select value from jsonb_array_elements(p_installments)
    loop
      v_number := (v_item ->> 'installment_number')::integer;
      v_due_date := (v_item ->> 'due_date')::date;
      v_amount := (v_item ->> 'amount')::numeric;

      if v_number is null or v_number <= 0 then
        raise exception 'Número da parcela inválido.';
      end if;

      if v_due_date is null then
        raise exception 'Informe a data de cada parcela.';
      end if;

      if v_amount is null or v_amount <= 0 then
        raise exception 'Valor da parcela inválido.';
      end if;

      insert into public.store_order_installments (
        order_id,
        installment_number,
        due_date,
        amount
      )
      values (
        p_order_id,
        v_number,
        v_due_date,
        v_amount
      );

      v_sum := v_sum + v_amount;
    end loop;

    if abs(v_sum - v_total) > 0.02 then
      raise exception 'A soma das parcelas deve ser igual ao total do pedido.';
    end if;

    update public.store_orders
      set status = 'awaiting_installment_approval',
          payment_mode = 'installment',
          installment_plan_status = 'pending',
          installment_card_mode = case
            when p_payment_method = 'card' then coalesce(p_installment_card_mode, 'per_installment')
            else null
          end,
          customer_payment_method = p_payment_method,
          customer_payment_note = nullif(trim(p_payment_note), ''),
          customer_confirmed_at = timezone('utc', now()),
          payment_informed = false,
          payment_proof_url = null,
          payment_proof_name = null,
          payment_reported_at = null,
          vendor_payment_link = null,
          vendor_payment_message = null
    where id = p_order_id;
  else
    v_new_status := case
      when p_payment_method = 'cash' then 'cash_on_delivery'
      else 'awaiting_payment'
    end;

    update public.store_orders
      set status = v_new_status,
          payment_mode = 'cash',
          installment_plan_status = 'none',
          installment_card_mode = null,
          customer_payment_method = p_payment_method,
          customer_payment_note = nullif(trim(p_payment_note), ''),
          customer_confirmed_at = timezone('utc', now())
    where id = p_order_id;

    delete from public.store_order_installments
    where order_id = p_order_id;
  end if;

  perform public.deduct_order_stock(p_order_id);

  return p_order_id;
end;
$$;

revoke all on function public.finalize_customer_order_for_portal(uuid, uuid, text, text, text, jsonb, text) from public;
grant execute on function public.finalize_customer_order_for_portal(uuid, uuid, text, text, text, jsonb, text) to authenticated;

-- ── Vendedor aprova plano parcelado ───────────────────────────────────────────
create or replace function public.approve_store_order_installment_plan(
  p_store_id uuid,
  p_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_new_status text;
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para aprovar parcelamento.';
  end if;

  select *
    into v_order
  from public.store_orders
  where id = p_order_id
    and store_id = p_store_id
    and payment_mode = 'installment'
    and installment_plan_status = 'pending'
    and status = 'awaiting_installment_approval'
  for update;

  if not found then
    raise exception 'Plano parcelado não encontrado ou já processado.';
  end if;

  v_new_status := case
    when v_order.customer_payment_method = 'cash' then 'cash_on_delivery'
    else 'awaiting_payment'
  end;

  update public.store_orders
    set installment_plan_status = 'approved',
        status = v_new_status,
        payment_informed = false
  where id = p_order_id;

  return p_order_id;
end;
$$;

revoke all on function public.approve_store_order_installment_plan(uuid, uuid) from public;
grant execute on function public.approve_store_order_installment_plan(uuid, uuid) to authenticated;

-- ── Vendedor recusa plano parcelado ───────────────────────────────────────────
create or replace function public.reject_store_order_installment_plan(
  p_store_id uuid,
  p_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para recusar parcelamento.';
  end if;

  perform public.restore_order_stock(p_order_id);

  update public.store_orders
    set installment_plan_status = 'rejected',
        status = 'cancelled',
        cancelled_at = timezone('utc', now())
  where id = p_order_id
    and store_id = p_store_id
    and payment_mode = 'installment'
    and installment_plan_status = 'pending'
    and status = 'awaiting_installment_approval';

  if not found then
    raise exception 'Plano parcelado não encontrado ou já processado.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.reject_store_order_installment_plan(uuid, uuid) from public;
grant execute on function public.reject_store_order_installment_plan(uuid, uuid) to authenticated;

-- ── Cliente informa pagamento de parcela ──────────────────────────────────────
create or replace function public.inform_order_installment_payment_for_portal(
  p_store_id uuid,
  p_order_id uuid,
  p_installment_id uuid,
  p_proof_url text default null,
  p_proof_name text default null
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

  select c.id
    into v_customer_id
  from public.customers c
  where c.store_id = p_store_id
    and c.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não vinculado à loja.';
  end if;

  update public.store_order_installments inst
    set payment_informed = true,
        payment_proof_url = coalesce(nullif(trim(p_proof_url), ''), inst.payment_proof_url),
        payment_proof_name = coalesce(nullif(trim(p_proof_name), ''), inst.payment_proof_name),
        payment_reported_at = case
          when p_proof_url is not null and trim(p_proof_url) <> ''
          then timezone('utc', now())
          else inst.payment_reported_at
        end
  from public.store_orders o
  where inst.id = p_installment_id
    and inst.order_id = p_order_id
    and o.id = inst.order_id
    and o.store_id = p_store_id
    and o.customer_id = v_customer_id
    and o.source = 'client'
    and o.payment_mode = 'installment'
    and o.installment_plan_status = 'approved'
    and o.status in ('awaiting_payment', 'awaiting_card', 'cash_on_delivery', 'payment_review')
    and inst.paid = false;

  if not found then
    raise exception 'Parcela não pode ser atualizada.';
  end if;

  return p_installment_id;
end;
$$;

revoke all on function public.inform_order_installment_payment_for_portal(uuid, uuid, uuid, text, text) from public;
grant execute on function public.inform_order_installment_payment_for_portal(uuid, uuid, uuid, text, text) to authenticated;

-- ── Vendedor confirma pagamento de parcela ────────────────────────────────────
create or replace function public.confirm_store_order_installment_payment(
  p_store_id uuid,
  p_order_id uuid,
  p_installment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open_count integer;
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para confirmar pagamento.';
  end if;

  update public.store_order_installments inst
    set paid = true,
        paid_at = timezone('utc', now()),
        payment_informed = false
  from public.store_orders o
  where inst.id = p_installment_id
    and inst.order_id = p_order_id
    and o.id = inst.order_id
    and o.store_id = p_store_id
    and o.payment_mode = 'installment'
    and o.installment_plan_status = 'approved'
    and inst.paid = false;

  if not found then
    raise exception 'Parcela não encontrada ou já paga.';
  end if;

  select count(*)
    into v_open_count
  from public.store_order_installments
  where order_id = p_order_id
    and paid = false;

  if v_open_count = 0 then
    update public.store_orders
      set status = 'paid',
          paid_at = timezone('utc', now()),
          payment_informed = false
    where id = p_order_id
      and store_id = p_store_id;
  end if;

  return p_installment_id;
end;
$$;

revoke all on function public.confirm_store_order_installment_payment(uuid, uuid, uuid) from public;
grant execute on function public.confirm_store_order_installment_payment(uuid, uuid, uuid) to authenticated;

-- ── Vendedor define link de cartão por parcela ────────────────────────────────
create or replace function public.set_store_order_installment_payment_link(
  p_store_id uuid,
  p_order_id uuid,
  p_installment_id uuid,
  p_payment_link text,
  p_payment_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para atualizar pagamento.';
  end if;

  update public.store_order_installments inst
    set vendor_payment_link = nullif(trim(p_payment_link), ''),
        vendor_payment_message = nullif(trim(p_payment_message), '')
  from public.store_orders o
  where inst.id = p_installment_id
    and inst.order_id = p_order_id
    and o.id = inst.order_id
    and o.store_id = p_store_id
    and o.payment_mode = 'installment'
    and o.installment_plan_status = 'approved'
    and o.customer_payment_method = 'card'
    and o.installment_card_mode = 'per_installment'
    and inst.paid = false;

  if not found then
    raise exception 'Parcela não pode ser atualizada.';
  end if;

  update public.store_orders
    set status = case
      when p_payment_link is not null and trim(p_payment_link) <> ''
      then 'awaiting_card'
      else status
    end
  where id = p_order_id
    and store_id = p_store_id;

  return p_installment_id;
end;
$$;

revoke all on function public.set_store_order_installment_payment_link(uuid, uuid, uuid, text, text) from public;
grant execute on function public.set_store_order_installment_payment_link(uuid, uuid, uuid, text, text) to authenticated;

-- ── Cancelamento inclui aguardando autorização ────────────────────────────────
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

  perform public.restore_order_stock(p_order_id);

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
      'awaiting_installment_approval',
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

-- ── Detalhe do pedido para o cliente ──────────────────────────────────────────
create or replace function public.get_customer_order_detail_for_portal(
  p_store_id uuid,
  p_order_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_code', o.order_code,
    'status', o.status,
    'order_type', o.order_type,
    'delivery_type', o.delivery_type,
    'customer_payment_method', o.customer_payment_method,
    'customer_payment_note', o.customer_payment_note,
    'vendor_payment_link', o.vendor_payment_link,
    'vendor_payment_message', o.vendor_payment_message,
    'payment_proof_url', o.payment_proof_url,
    'payment_proof_name', o.payment_proof_name,
    'payment_informed', o.payment_informed,
    'payment_mode', o.payment_mode,
    'installment_plan_status', o.installment_plan_status,
    'installment_card_mode', o.installment_card_mode,
    'paid_at', o.paid_at,
    'notes', o.notes,
    'coupon_code', o.coupon_code,
    'subtotal_amount', o.subtotal_amount,
    'discount_amount', o.discount_amount,
    'total_amount', o.total_amount,
    'quote_sent_at', o.quote_sent_at,
    'customer_confirmed_at', o.customer_confirmed_at,
    'edited_at', o.edited_at,
    'created_at', o.created_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item.id,
            'product_id', item.product_id,
            'product_name', item.product_name,
            'quantity', item.quantity,
            'unit_price', item.unit_price
          )
          order by item.created_at asc
        )
        from public.store_order_items item
        where item.order_id = o.id
      ),
      '[]'::jsonb
    ),
    'installments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', inst.id,
            'installment_number', inst.installment_number,
            'due_date', inst.due_date,
            'amount', inst.amount,
            'paid', inst.paid,
            'paid_at', inst.paid_at,
            'payment_informed', inst.payment_informed,
            'payment_proof_url', inst.payment_proof_url,
            'payment_proof_name', inst.payment_proof_name,
            'payment_reported_at', inst.payment_reported_at,
            'vendor_payment_link', inst.vendor_payment_link,
            'vendor_payment_message', inst.vendor_payment_message
          )
          order by inst.installment_number asc
        )
        from public.store_order_installments inst
        where inst.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  from public.store_orders o
  join public.customers c on c.id = o.customer_id
  where o.store_id = p_store_id
    and o.id = p_order_id
    and c.user_id = auth.uid()
    and o.source = 'client'
    and o.status not in ('converted')
  limit 1;
$$;

-- ── Lista de pedidos do cliente ─────────────────────────────────────────────────
drop function if exists public.list_customer_orders_for_portal(uuid);

create function public.list_customer_orders_for_portal(p_store_id uuid)
returns table (
  id uuid,
  order_code integer,
  status text,
  order_type text,
  delivery_type text,
  customer_payment_method text,
  vendor_payment_link text,
  vendor_payment_message text,
  payment_proof_url text,
  payment_informed boolean,
  payment_mode text,
  installment_plan_status text,
  paid_at timestamptz,
  expected_delivery_date date,
  delivered_at timestamptz,
  tracking_code text,
  tracking_url text,
  notes text,
  subtotal_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  edited_at timestamptz,
  created_at timestamptz,
  item_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    order_row.id,
    order_row.order_code,
    order_row.status,
    order_row.order_type,
    order_row.delivery_type,
    order_row.customer_payment_method,
    order_row.vendor_payment_link,
    order_row.vendor_payment_message,
    order_row.payment_proof_url,
    order_row.payment_informed,
    order_row.payment_mode,
    order_row.installment_plan_status,
    order_row.paid_at,
    order_row.expected_delivery_date,
    order_row.delivered_at,
    order_row.tracking_code,
    order_row.tracking_url,
    order_row.notes,
    order_row.subtotal_amount,
    order_row.discount_amount,
    order_row.total_amount,
    order_row.edited_at,
    order_row.created_at,
    coalesce(sum(item.quantity), 0)::integer as item_count
  from public.store_orders order_row
  join public.customers customer on customer.id = order_row.customer_id
  left join public.store_order_items item on item.order_id = order_row.id
  where order_row.store_id = p_store_id
    and customer.user_id = auth.uid()
    and order_row.status in (
      'quote',
      'quote_answered',
      'awaiting_installment_approval',
      'awaiting_payment',
      'awaiting_card',
      'cash_on_delivery',
      'paid',
      'cancelled',
      'new',
      'quoted',
      'payment_review',
      'delivering',
      'delivered'
    )
  group by order_row.id
  order by order_row.created_at desc;
$$;

revoke all on function public.list_customer_orders_for_portal(uuid) from public;
grant execute on function public.list_customer_orders_for_portal(uuid) to authenticated;

-- ── Lista de pedidos para o vendedor ────────────────────────────────────────────
drop function if exists public.list_store_orders_for_vendor(uuid);

create function public.list_store_orders_for_vendor(p_store_id uuid)
returns table (
  id uuid,
  order_code integer,
  status text,
  order_type text,
  source text,
  delivery_type text,
  customer_payment_method text,
  payment_proof_url text,
  payment_informed boolean,
  payment_mode text,
  installment_plan_status text,
  expected_delivery_date date,
  notes text,
  subtotal_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  edited_at timestamptz,
  created_at timestamptz,
  customer_id uuid,
  customer_full_name text,
  customer_phone text,
  customer_avatar_color text,
  item_count integer,
  installments jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    order_row.id,
    order_row.order_code,
    order_row.status,
    order_row.order_type,
    order_row.source,
    order_row.delivery_type,
    order_row.customer_payment_method,
    order_row.payment_proof_url,
    order_row.payment_informed,
    order_row.payment_mode,
    order_row.installment_plan_status,
    order_row.expected_delivery_date,
    order_row.notes,
    order_row.subtotal_amount,
    order_row.discount_amount,
    order_row.total_amount,
    order_row.edited_at,
    order_row.created_at,
    customer.id,
    customer.full_name,
    customer.phone,
    customer.avatar_color,
    coalesce(sum(item.quantity), 0)::integer as item_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', inst.id,
            'installment_number', inst.installment_number,
            'due_date', inst.due_date,
            'amount', inst.amount,
            'paid', inst.paid,
            'paid_at', inst.paid_at,
            'payment_informed', inst.payment_informed
          )
          order by inst.installment_number asc
        )
        from public.store_order_installments inst
        where inst.order_id = order_row.id
      ),
      '[]'::jsonb
    ) as installments
  from public.store_orders order_row
  join public.customers customer on customer.id = order_row.customer_id
  left join public.store_order_items item on item.order_id = order_row.id
  where order_row.store_id = p_store_id
    and public.is_store_member(p_store_id)
    and order_row.status in (
      'quote',
      'quote_answered',
      'awaiting_installment_approval',
      'awaiting_payment',
      'awaiting_card',
      'cash_on_delivery',
      'paid',
      'new',
      'quoted',
      'payment_review',
      'delivering',
      'delivered'
    )
  group by
    order_row.id,
    customer.id
  order by order_row.created_at desc;
$$;

revoke all on function public.list_store_orders_for_vendor(uuid) from public;
grant execute on function public.list_store_orders_for_vendor(uuid) to authenticated;

commit;

-- VENUMAIS
-- Fluxo completo de pedidos: orçamento, pagamento, comprovante e entrega.

begin;

alter table public.store_orders
  add column if not exists customer_payment_method text,
  add column if not exists customer_payment_note text,
  add column if not exists vendor_payment_link text,
  add column if not exists vendor_payment_message text,
  add column if not exists quote_sent_at timestamptz,
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists payment_proof_url text,
  add column if not exists payment_proof_name text,
  add column if not exists payment_reported_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists expected_delivery_date date,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists tracking_code text,
  add column if not exists tracking_url text;

alter table public.store_orders
  drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (
    status in (
      'new',
      'quoted',
      'awaiting_payment',
      'payment_review',
      'paid',
      'delivering',
      'delivered',
      'cancelled',
      'converted'
    )
  );

alter table public.store_orders
  drop constraint if exists store_orders_payment_method_check;

alter table public.store_orders
  add constraint store_orders_payment_method_check
  check (
    customer_payment_method is null
    or customer_payment_method in ('pix', 'cash', 'card')
  );

create or replace function public.create_client_order(
  p_store_id uuid,
  p_delivery_type text,
  p_notes text,
  p_coupon_code text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_code integer;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_has_hidden_price boolean := false;
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

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um item.';
  end if;

  select coalesce(max(order_row.order_code), 0) + 1
    into v_order_code
  from public.store_orders order_row
  where order_row.store_id = p_store_id;

  insert into public.store_orders (
    store_id,
    customer_id,
    order_code,
    status,
    order_type,
    source,
    delivery_type,
    notes,
    coupon_code
  )
  values (
    p_store_id,
    v_customer_id,
    v_order_code,
    'new',
    'order',
    'client',
    coalesce(nullif(trim(p_delivery_type), ''), 'pickup'),
    nullif(trim(p_notes), ''),
    nullif(trim(p_coupon_code), '')
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select product.*
      into v_product
    from public.products product
    where product.id = (v_item ->> 'product_id')::uuid
      and product.store_id = p_store_id
      and product.active = true;

    if not found then
      raise exception 'Produto indisponível.';
    end if;

    if coalesce(v_product.price_visible, false) then
      v_unit_price := coalesce(v_product.promo_price, v_product.price);
      v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    else
      v_unit_price := null;
      v_has_hidden_price := true;
    end if;

    insert into public.store_order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price
    );
  end loop;

  update public.store_orders
    set order_type = case when v_has_hidden_price then 'quote' else 'order' end,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end
  where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.update_customer_order_for_portal(
  p_store_id uuid,
  p_order_id uuid,
  p_delivery_type text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_has_hidden_price boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um item.';
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
      and order_row.status in ('new', 'quoted')
  ) then
    raise exception 'Pedido não pode ser editado.';
  end if;

  delete from public.store_order_items where order_id = p_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select product.*
      into v_product
    from public.products product
    where product.id = (v_item ->> 'product_id')::uuid
      and product.store_id = p_store_id
      and product.active = true;

    if not found then
      raise exception 'Produto indisponível.';
    end if;

    if v_quantity > coalesce(v_product.stock_qty, 0) then
      raise exception 'Quantidade maior que o estoque disponível.';
    end if;

    if coalesce(v_product.price_visible, false) then
      v_unit_price := coalesce(v_product.promo_price, v_product.price);
      v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    else
      v_unit_price := null;
      v_has_hidden_price := true;
    end if;

    insert into public.store_order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    )
    values (
      p_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price
    );
  end loop;

  update public.store_orders
    set delivery_type = coalesce(nullif(trim(p_delivery_type), ''), 'pickup'),
        notes = nullif(trim(p_notes), ''),
        order_type = case when v_has_hidden_price then 'quote' else 'order' end,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end,
        edited_at = timezone('utc', now())
  where id = p_order_id;

  return p_order_id;
end;
$$;

create or replace function public.get_customer_order_for_portal(
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
    'id', order_row.id,
    'order_code', order_row.order_code,
    'status', order_row.status,
    'order_type', order_row.order_type,
    'delivery_type', order_row.delivery_type,
    'notes', order_row.notes,
    'edited_at', order_row.edited_at,
    'created_at', order_row.created_at,
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
        where item.order_id = order_row.id
      ),
      '[]'::jsonb
    )
  )
  from public.store_orders order_row
  join public.customers customer on customer.id = order_row.customer_id
  where order_row.store_id = p_store_id
    and order_row.id = p_order_id
    and customer.user_id = auth.uid()
    and order_row.source = 'client'
    and order_row.status in ('new', 'quoted')
  limit 1;
$$;

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
    and status in ('new', 'quoted');

  if not found then
    raise exception 'Pedido não pode ser cancelado.';
  end if;

  return p_order_id;
end;
$$;

create or replace function public.approve_store_order(
  p_store_id uuid,
  p_order_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_item jsonb;
  v_item_id uuid;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para aprovar pedidos.';
  end if;

  select order_row.*
    into v_order
  from public.store_orders order_row
  where order_row.id = p_order_id
    and order_row.store_id = p_store_id
    and order_row.status in ('new', 'quoted')
  for update;

  if not found then
    raise exception 'Pedido não encontrado ou já finalizado.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe os preços dos itens.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'id')::uuid;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    if v_unit_price is null or v_unit_price <= 0 then
      raise exception 'Todos os itens precisam de preço válido.';
    end if;

    update public.store_order_items item
      set unit_price = v_unit_price
    where item.id = v_item_id
      and item.order_id = p_order_id;

    if not found then
      raise exception 'Item do pedido não encontrado.';
    end if;
  end loop;

  select coalesce(sum(item.unit_price * item.quantity), 0)
    into v_subtotal
  from public.store_order_items item
  where item.order_id = p_order_id;

  if v_subtotal <= 0 then
    raise exception 'Total inválido.';
  end if;

  update public.store_orders
    set status = 'quoted',
        order_type = 'order',
        quote_sent_at = timezone('utc', now()),
        subtotal_amount = v_subtotal,
        discount_amount = coalesce(discount_amount, 0),
        total_amount = v_subtotal - coalesce(discount_amount, 0)
  where id = p_order_id;
end;
$$;

create or replace function public.finalize_customer_order_for_portal(
  p_store_id uuid,
  p_order_id uuid,
  p_payment_method text,
  p_payment_note text
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

  if p_payment_method not in ('pix', 'cash', 'card') then
    raise exception 'Forma de pagamento inválida.';
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
    set status = 'awaiting_payment',
        customer_payment_method = p_payment_method,
        customer_payment_note = nullif(trim(p_payment_note), ''),
        customer_confirmed_at = timezone('utc', now())
  where id = p_order_id
    and store_id = p_store_id
    and customer_id = v_customer_id
    and source = 'client'
    and status in ('new', 'quoted')
    and total_amount is not null
    and total_amount > 0;

  if not found then
    raise exception 'Pedido não pode ser finalizado.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.finalize_customer_order_for_portal(uuid, uuid, text, text) from public;
grant execute on function public.finalize_customer_order_for_portal(uuid, uuid, text, text) to authenticated;

create or replace function public.report_order_payment_for_portal(
  p_store_id uuid,
  p_order_id uuid,
  p_proof_url text,
  p_proof_name text
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
    set status = 'payment_review',
        payment_proof_url = nullif(trim(p_proof_url), ''),
        payment_proof_name = nullif(trim(p_proof_name), ''),
        payment_reported_at = timezone('utc', now())
  where id = p_order_id
    and store_id = p_store_id
    and customer_id = v_customer_id
    and source = 'client'
    and status = 'awaiting_payment';

  if not found then
    raise exception 'Pedido não está aguardando comprovante.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.report_order_payment_for_portal(uuid, uuid, text, text) from public;
grant execute on function public.report_order_payment_for_portal(uuid, uuid, text, text) to authenticated;

create or replace function public.confirm_store_order_payment(
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
    raise exception 'Sem permissão para confirmar pagamento.';
  end if;

  update public.store_orders
    set status = 'paid',
        paid_at = timezone('utc', now())
  where id = p_order_id
    and store_id = p_store_id
    and status in ('awaiting_payment', 'payment_review');

  if not found then
    raise exception 'Pedido não pode ser marcado como pago.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.confirm_store_order_payment(uuid, uuid) from public;
grant execute on function public.confirm_store_order_payment(uuid, uuid) to authenticated;

create or replace function public.set_store_order_payment_link(
  p_store_id uuid,
  p_order_id uuid,
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

  update public.store_orders
    set vendor_payment_link = nullif(trim(p_payment_link), ''),
        vendor_payment_message = nullif(trim(p_payment_message), '')
  where id = p_order_id
    and store_id = p_store_id
    and status in ('awaiting_payment', 'payment_review');

  if not found then
    raise exception 'Pedido não pode ser atualizado.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.set_store_order_payment_link(uuid, uuid, text, text) from public;
grant execute on function public.set_store_order_payment_link(uuid, uuid, text, text) to authenticated;

create or replace function public.update_store_order_delivery(
  p_store_id uuid,
  p_order_id uuid,
  p_status text,
  p_expected_delivery_date date,
  p_delivered_at timestamptz,
  p_tracking_code text,
  p_tracking_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para atualizar entrega.';
  end if;

  if p_status not in ('paid', 'delivering', 'delivered') then
    raise exception 'Status de entrega inválido.';
  end if;

  update public.store_orders
    set status = p_status,
        expected_delivery_date = p_expected_delivery_date,
        delivered_at = case when p_status = 'delivered' then coalesce(p_delivered_at, timezone('utc', now())) else null end,
        shipped_at = case when p_status = 'delivering' then coalesce(shipped_at, timezone('utc', now())) else shipped_at end,
        tracking_code = nullif(trim(p_tracking_code), ''),
        tracking_url = nullif(trim(p_tracking_url), '')
  where id = p_order_id
    and store_id = p_store_id
    and status in ('paid', 'delivering', 'delivered');

  if not found then
    raise exception 'Pedido não pode ser atualizado para entrega.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.update_store_order_delivery(uuid, uuid, text, date, timestamptz, text, text) from public;
grant execute on function public.update_store_order_delivery(uuid, uuid, text, date, timestamptz, text, text) to authenticated;

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
    order_row.source,
    order_row.delivery_type,
    order_row.customer_payment_method,
    order_row.payment_proof_url,
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
    coalesce(sum(item.quantity), 0)::integer as item_count
  from public.store_orders order_row
  join public.customers customer on customer.id = order_row.customer_id
  left join public.store_order_items item on item.order_id = order_row.id
  where order_row.store_id = p_store_id
    and public.is_store_member(p_store_id)
    and order_row.status in (
      'new',
      'quoted',
      'awaiting_payment',
      'payment_review',
      'paid',
      'delivering',
      'delivered'
    )
  group by
    order_row.id,
    customer.id
  order by order_row.created_at desc;
$$;

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
      'new',
      'quoted',
      'awaiting_payment',
      'payment_review',
      'paid',
      'delivering',
      'delivered'
    )
  group by order_row.id
  order by order_row.created_at desc;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-payment-proofs',
  'order-payment-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "order_payment_proofs_select_authenticated" on storage.objects;
create policy "order_payment_proofs_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'order-payment-proofs');

drop policy if exists "order_payment_proofs_insert_authenticated" on storage.objects;
create policy "order_payment_proofs_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'order-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "order_payment_proofs_update_own" on storage.objects;
create policy "order_payment_proofs_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'order-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'order-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "order_payment_proofs_delete_own" on storage.objects;
create policy "order_payment_proofs_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'order-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

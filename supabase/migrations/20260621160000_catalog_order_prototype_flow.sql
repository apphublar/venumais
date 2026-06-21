-- VENUMAIS
-- Fluxo de pedidos via catálogo alinhado ao protótipo (Opção A — status em inglês).
--
-- Novo mapa de status:
--   quote             → "Orçamento"            (pedido com item sem preço)
--   quote_answered    → "Orçamento recebido"    (vendedor enviou preços)
--   awaiting_payment  → "Em aberto"             (cliente finalizou, aguarda pgto PIX/cartão)
--   awaiting_card     → "Aguardando cartão"      (vendedor gerou link, cliente ainda não pagou)
--   cash_on_delivery  → "A combinar (dinheiro)" (cliente escolheu dinheiro)
--   paid              → "Pago"
--   cancelled         → "Cancelado"
--   (legados: new, quoted, payment_review, delivering, delivered, converted)

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Nova coluna: payment_informed
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.store_orders
  add column if not exists payment_informed boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ampliar constraint de status (preserva legados)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.store_orders
  drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in (
    -- Estados ativos do protótipo
    'quote',
    'quote_answered',
    'awaiting_payment',
    'awaiting_card',
    'cash_on_delivery',
    'paid',
    'cancelled',
    -- Legados (compatibilidade)
    'new',
    'quoted',
    'payment_review',
    -- Futuros (logística)
    'delivering',
    'delivered',
    -- Interno
    'converted'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. create_client_order — usa 'quote' para itens sem preço
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Novo: status='quote' para pedidos com item sem preço
  update public.store_orders
    set status = case when v_has_hidden_price then 'quote' else 'new' end,
        order_type = case when v_has_hidden_price then 'quote' else 'order' end,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. update_customer_order_for_portal — aceita 'quote' e 'quote_answered'
-- ─────────────────────────────────────────────────────────────────────────────
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
      and order_row.status in ('new', 'quote', 'quoted', 'quote_answered')
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
        status = case when v_has_hidden_price then 'quote' else 'new' end,
        order_type = case when v_has_hidden_price then 'quote' else 'order' end,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end,
        edited_at = timezone('utc', now())
  where id = p_order_id;

  return p_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. get_customer_order_for_portal — aceita 'quote' e 'quote_answered'
-- ─────────────────────────────────────────────────────────────────────────────
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
    and order_row.status in ('new', 'quote', 'quoted', 'quote_answered')
  limit 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_customer_order_detail_for_portal — visualização de TODOS os estados
-- ─────────────────────────────────────────────────────────────────────────────
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

revoke all on function public.get_customer_order_detail_for_portal(uuid, uuid) from public;
grant execute on function public.get_customer_order_detail_for_portal(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. approve_store_order — usa 'quote_answered' (era 'quoted')
-- ─────────────────────────────────────────────────────────────────────────────
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
    and order_row.status in ('new', 'quote', 'quoted')
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
    set status = 'quote_answered',
        order_type = 'order',
        quote_sent_at = timezone('utc', now()),
        subtotal_amount = v_subtotal,
        discount_amount = coalesce(discount_amount, 0),
        total_amount = v_subtotal - coalesce(discount_amount, 0)
  where id = p_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. cancel_customer_order_for_portal — aceita 'quote' e 'quote_answered'
-- ─────────────────────────────────────────────────────────────────────────────
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
    and status in ('new', 'quote', 'quoted', 'quote_answered');

  if not found then
    raise exception 'Pedido não pode ser cancelado.';
  end if;

  return p_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. finalize_customer_order_for_portal
--    dinheiro → cash_on_delivery | pix/cartão → awaiting_payment
--    aceita também 'quote_answered' como status de origem
-- ─────────────────────────────────────────────────────────────────────────────
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
  v_new_status text;
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

  -- Dinheiro → a_combinar (cash_on_delivery); demais → awaiting_payment
  v_new_status := case
    when p_payment_method = 'cash' then 'cash_on_delivery'
    else 'awaiting_payment'
  end;

  update public.store_orders
    set status = v_new_status,
        customer_payment_method = p_payment_method,
        customer_payment_note = nullif(trim(p_payment_note), ''),
        customer_confirmed_at = timezone('utc', now())
  where id = p_order_id
    and store_id = p_store_id
    and customer_id = v_customer_id
    and source = 'client'
    and status in ('new', 'quote', 'quoted', 'quote_answered')
    and total_amount is not null
    and total_amount > 0;

  if not found then
    raise exception 'Pedido não pode ser finalizado.';
  end if;

  return p_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. inform_order_payment_for_portal — "Já paguei" (client)
--     Seta payment_informed=true; status permanece inalterado.
--     Aceita comprovante opcional (url + name).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.inform_order_payment_for_portal(
  p_store_id uuid,
  p_order_id uuid,
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

  update public.store_orders
    set payment_informed = true,
        payment_proof_url  = coalesce(nullif(trim(p_proof_url),  ''), payment_proof_url),
        payment_proof_name = coalesce(nullif(trim(p_proof_name), ''), payment_proof_name),
        payment_reported_at = case
          when p_proof_url is not null and trim(p_proof_url) <> ''
          then timezone('utc', now())
          else payment_reported_at
        end
  where id = p_order_id
    and store_id = p_store_id
    and customer_id = v_customer_id
    and source = 'client'
    and status in ('awaiting_payment', 'awaiting_card', 'payment_review');

  if not found then
    raise exception 'Pedido não pode ser atualizado.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.inform_order_payment_for_portal(uuid, uuid, text, text) from public;
grant execute on function public.inform_order_payment_for_portal(uuid, uuid, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. set_store_order_payment_link — muda para 'awaiting_card' ao salvar link
-- ─────────────────────────────────────────────────────────────────────────────
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
    set vendor_payment_link    = nullif(trim(p_payment_link), ''),
        vendor_payment_message = nullif(trim(p_payment_message), ''),
        -- Avança para awaiting_card somente quando está gerando um link novo
        status = case
          when p_payment_link is not null
           and trim(p_payment_link) <> ''
           and status in ('awaiting_payment', 'payment_review')
          then 'awaiting_card'
          else status
        end
  where id = p_order_id
    and store_id = p_store_id
    and status in ('awaiting_payment', 'awaiting_card', 'payment_review');

  if not found then
    raise exception 'Pedido não pode ser atualizado.';
  end if;

  return p_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. confirm_store_order_payment — aceita todos os status pendentes de pgto
-- ─────────────────────────────────────────────────────────────────────────────
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
    set status  = 'paid',
        paid_at = timezone('utc', now())
  where id        = p_order_id
    and store_id  = p_store_id
    and status in (
      'awaiting_payment',
      'awaiting_card',
      'cash_on_delivery',
      'payment_review'
    );

  if not found then
    raise exception 'Pedido não pode ser marcado como pago.';
  end if;

  return p_order_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. list_customer_orders_for_portal — inclui payment_informed + novos status
-- ─────────────────────────────────────────────────────────────────────────────
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
      'awaiting_payment',
      'awaiting_card',
      'cash_on_delivery',
      'paid',
      'cancelled',
      -- legados
      'new',
      'quoted',
      'payment_review',
      'delivering',
      'delivered'
    )
  group by order_row.id
  order by order_row.created_at desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. list_store_orders_for_vendor — inclui payment_informed + novos status
-- ─────────────────────────────────────────────────────────────────────────────
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
    order_row.payment_informed,
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
      'quote',
      'quote_answered',
      'awaiting_payment',
      'awaiting_card',
      'cash_on_delivery',
      'paid',
      -- legados
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

commit;

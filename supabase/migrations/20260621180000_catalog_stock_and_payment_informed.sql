-- VENUMAIS
-- Estoque no catálogo + comprovante/pagamento informado para cartão.

begin;

-- ── Produto: vender sem estoque + exibir quantidade no catálogo ───────────────
alter table public.products
  add column if not exists sell_without_stock boolean not null default false,
  add column if not exists stock_visible boolean not null default true;

-- ── Pedido: marca se o estoque já foi baixado ───────────────────────────────
alter table public.store_orders
  add column if not exists stock_deducted boolean not null default false;

-- ── Baixa estoque de um pedido (idempotente) ─────────────────────────────────
create or replace function public.deduct_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_product record;
begin
  if exists (
    select 1
    from public.store_orders o
    where o.id = p_order_id
      and o.stock_deducted = true
  ) then
    return;
  end if;

  for v_item in
    select item.product_id, item.quantity
    from public.store_order_items item
    where item.order_id = p_order_id
      and item.product_id is not null
  loop
    select product.*
      into v_product
    from public.products product
    where product.id = v_item.product_id
    for update;

    if not found then
      raise exception 'Produto indisponível.';
    end if;

    if not coalesce(v_product.sell_without_stock, false) then
      if v_item.quantity > coalesce(v_product.stock_qty, 0) then
        raise exception 'Quantidade maior que o estoque disponível.';
      end if;

      update public.products
        set stock_qty = stock_qty - v_item.quantity,
            updated_at = timezone('utc', now())
      where id = v_product.id;
    end if;
  end loop;

  update public.store_orders
    set stock_deducted = true
  where id = p_order_id;
end;
$$;

-- ── Restaura estoque ao cancelar pedido ───────────────────────────────────────
create or replace function public.restore_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  if not exists (
    select 1
    from public.store_orders o
    where o.id = p_order_id
      and o.stock_deducted = true
  ) then
    return;
  end if;

  for v_item in
    select item.product_id, item.quantity
    from public.store_order_items item
    where item.order_id = p_order_id
      and item.product_id is not null
  loop
    update public.products
      set stock_qty = stock_qty + v_item.quantity,
          updated_at = timezone('utc', now())
    where id = v_item.product_id
      and not coalesce(sell_without_stock, false);
  end loop;

  update public.store_orders
    set stock_deducted = false
  where id = p_order_id;
end;
$$;

revoke all on function public.deduct_order_stock(uuid) from public;
grant execute on function public.deduct_order_stock(uuid) to authenticated;

revoke all on function public.restore_order_stock(uuid) from public;
grant execute on function public.restore_order_stock(uuid) to authenticated;

-- ── Catálogo público ──────────────────────────────────────────────────────────
create or replace function public.list_public_products(p_store_id uuid)
returns table (
  id uuid,
  name text,
  category text,
  price numeric,
  promo_price numeric,
  wholesale_price numeric,
  price_visible boolean,
  featured boolean,
  stock_qty integer,
  sell_without_stock boolean,
  stock_visible boolean,
  thumb_color text,
  image_url text,
  variations jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.category,
    p.price,
    p.promo_price,
    p.wholesale_price,
    p.price_visible,
    p.featured,
    p.stock_qty,
    p.sell_without_stock,
    p.stock_visible,
    p.thumb_color,
    p.image_url,
    p.variations
  from public.products p
  where p.store_id = p_store_id
    and p.active = true
    and (p.stock_qty > 0 or p.sell_without_stock = true)
  order by p.featured desc, lower(p.name);
$$;

-- ── Criar pedido: valida estoque e baixa quando tem preço visível ─────────────
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

    if not coalesce(v_product.sell_without_stock, false)
       and v_quantity > coalesce(v_product.stock_qty, 0) then
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
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price
    );
  end loop;

  update public.store_orders
    set status = case when v_has_hidden_price then 'quote' else 'new' end,
        order_type = case when v_has_hidden_price then 'quote' else 'order' end,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end
  where id = v_order_id;

  if not v_has_hidden_price then
    perform public.deduct_order_stock(v_order_id);
  end if;

  return v_order_id;
end;
$$;

-- ── Editar pedido: respeita vender sem estoque ───────────────────────────────
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
  v_was_deducted boolean := false;
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

  select order_row.stock_deducted
    into v_was_deducted
  from public.store_orders order_row
  where order_row.id = p_order_id;

  if coalesce(v_was_deducted, false) then
    perform public.restore_order_stock(p_order_id);
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

    if not coalesce(v_product.sell_without_stock, false)
       and v_quantity > coalesce(v_product.stock_qty, 0) then
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

  if coalesce(v_was_deducted, false) and not v_has_hidden_price then
    perform public.deduct_order_stock(p_order_id);
  end if;

  return p_order_id;
end;
$$;

-- ── Finalizar orçamento: baixa estoque na confirmação ─────────────────────────
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

  perform public.deduct_order_stock(p_order_id);

  return p_order_id;
end;
$$;

-- ── Cancelar pedido: restaura estoque ─────────────────────────────────────────
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

-- ── Cliente informou pagamento (cartão/PIX) ───────────────────────────────────
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
        payment_reported_at = timezone('utc', now())
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

commit;

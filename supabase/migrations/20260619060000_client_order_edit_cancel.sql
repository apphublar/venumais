-- VENUMAIS
-- Portal do cliente: editar/cancelar orçamento pendente.

begin;

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
    and order_row.status in ('new', 'quote')
  limit 1;
$$;

revoke all on function public.get_customer_order_for_portal(uuid, uuid) from public;
grant execute on function public.get_customer_order_for_portal(uuid, uuid) to authenticated;

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
  v_status text := 'new';
  v_order_type text := 'order';
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
      and order_row.status in ('new', 'quote')
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

  if v_has_hidden_price then
    v_status := 'quote';
    v_order_type := 'quote';
  end if;

  update public.store_orders
    set delivery_type = coalesce(nullif(trim(p_delivery_type), ''), 'pickup'),
        notes = nullif(trim(p_notes), ''),
        status = v_status,
        order_type = v_order_type,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end,
        edited_at = timezone('utc', now())
  where id = p_order_id;

  return p_order_id;
end;
$$;

revoke all on function public.update_customer_order_for_portal(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.update_customer_order_for_portal(uuid, uuid, text, text, jsonb) to authenticated;

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
    and status in ('new', 'quote');

  if not found then
    raise exception 'Pedido não pode ser cancelado.';
  end if;

  return p_order_id;
end;
$$;

revoke all on function public.cancel_customer_order_for_portal(uuid, uuid) from public;
grant execute on function public.cancel_customer_order_for_portal(uuid, uuid) to authenticated;

commit;

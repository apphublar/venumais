-- VENUMAIS
-- Aprovação de pedido/orçamento pelo vendedor.

begin;

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
    and order_row.status in ('new', 'quote')
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
    set status = 'new',
        order_type = case when order_type = 'quote' then 'order' else order_type end,
        subtotal_amount = v_subtotal,
        discount_amount = coalesce(discount_amount, 0),
        total_amount = v_subtotal - coalesce(discount_amount, 0)
  where id = p_order_id;
end;
$$;

revoke all on function public.approve_store_order(uuid, uuid, jsonb) from public;
grant execute on function public.approve_store_order(uuid, uuid, jsonb) to authenticated;

commit;

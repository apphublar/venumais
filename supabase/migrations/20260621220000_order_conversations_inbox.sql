-- VENUMAIS
-- Lista de conversas por pedido (inbox vendedor e cliente).

begin;

create or replace function public.list_order_conversations_for_vendor(
  p_store_id uuid
)
returns table (
  order_id uuid,
  order_code integer,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  status text,
  last_message_body text,
  last_message_at timestamptz,
  last_sender_type text,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with last_messages as (
    select distinct on (message_row.order_id)
      message_row.order_id,
      message_row.body as last_message_body,
      message_row.created_at as last_message_at,
      message_row.sender_type as last_sender_type
    from public.store_order_messages message_row
    where message_row.store_id = p_store_id
    order by message_row.order_id, message_row.created_at desc
  ),
  unread as (
    select message_row.order_id, count(*) as unread_count
    from public.store_order_messages message_row
    where message_row.store_id = p_store_id
      and message_row.sender_type = 'client'
      and message_row.read_at is null
    group by message_row.order_id
  )
  select
    order_row.id as order_id,
    order_row.order_code,
    customer_row.id as customer_id,
    customer_row.full_name as customer_name,
    customer_row.phone as customer_phone,
    order_row.status,
    last_messages.last_message_body,
    last_messages.last_message_at,
    last_messages.last_sender_type,
    coalesce(unread.unread_count, 0) as unread_count
  from last_messages
  join public.store_orders order_row on order_row.id = last_messages.order_id
  join public.customers customer_row on customer_row.id = order_row.customer_id
  left join unread on unread.order_id = order_row.id
  where order_row.store_id = p_store_id
    and public.can_manage_sales(p_store_id)
  order by last_messages.last_message_at desc;
$$;

revoke all on function public.list_order_conversations_for_vendor(uuid) from public;
grant execute on function public.list_order_conversations_for_vendor(uuid) to authenticated;

create or replace function public.list_order_conversations_for_portal(
  p_store_id uuid
)
returns table (
  order_id uuid,
  order_code integer,
  status text,
  last_message_body text,
  last_message_at timestamptz,
  last_sender_type text,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with customer_scope as (
    select customer_row.id as customer_id
    from public.customers customer_row
    where customer_row.store_id = p_store_id
      and customer_row.user_id = auth.uid()
    limit 1
  ),
  last_messages as (
    select distinct on (message_row.order_id)
      message_row.order_id,
      message_row.body as last_message_body,
      message_row.created_at as last_message_at,
      message_row.sender_type as last_sender_type
    from public.store_order_messages message_row
    where message_row.store_id = p_store_id
    order by message_row.order_id, message_row.created_at desc
  ),
  unread as (
    select message_row.order_id, count(*) as unread_count
    from public.store_order_messages message_row
    where message_row.store_id = p_store_id
      and message_row.sender_type = 'vendor'
      and message_row.read_at is null
    group by message_row.order_id
  )
  select
    order_row.id as order_id,
    order_row.order_code,
    order_row.status,
    last_messages.last_message_body,
    last_messages.last_message_at,
    last_messages.last_sender_type,
    coalesce(unread.unread_count, 0) as unread_count
  from last_messages
  join public.store_orders order_row on order_row.id = last_messages.order_id
  join customer_scope on customer_scope.customer_id = order_row.customer_id
  left join unread on unread.order_id = order_row.id
  where order_row.store_id = p_store_id
    and order_row.source = 'client'
  order by last_messages.last_message_at desc;
$$;

revoke all on function public.list_order_conversations_for_portal(uuid) from public;
grant execute on function public.list_order_conversations_for_portal(uuid) to authenticated;

commit;

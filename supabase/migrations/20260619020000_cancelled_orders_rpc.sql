-- RPC: list_cancelled_store_orders
-- Returns orders with status='cancelled' for the vendor panel
-- (shown in "Cancelados pelo cliente" section so vendor can send a promo)

CREATE OR REPLACE FUNCTION public.list_cancelled_store_orders(p_store_id uuid)
RETURNS TABLE (
  id               uuid,
  order_code       integer,
  cancelled_at     timestamptz,
  created_at       timestamptz,
  customer_id      uuid,
  customer_full_name text,
  customer_phone   text,
  customer_avatar_color text,
  item_count       integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    ord.id,
    ord.order_code,
    ord.cancelled_at,
    ord.created_at,
    cust.id,
    cust.full_name,
    cust.phone,
    cust.avatar_color,
    COALESCE(SUM(item.quantity), 0)::integer AS item_count
  FROM public.store_orders ord
  JOIN public.customers cust ON cust.id = ord.customer_id
  LEFT JOIN public.store_order_items item ON item.order_id = ord.id
  WHERE ord.store_id = p_store_id
    AND public.is_store_member(p_store_id)
    AND ord.status = 'cancelled'
  GROUP BY ord.id, cust.id
  ORDER BY ord.cancelled_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.list_cancelled_store_orders(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.list_cancelled_store_orders(uuid) TO authenticated;

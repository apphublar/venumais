import type { StoreOrderDetail, StoreOrderItem } from "@/lib/client/order-types";
export type { StoreOrderDetail, StoreOrderItem } from "@/lib/client/order-types";
export { formatCustomerAddress } from "@/lib/client/order-types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getStoreOrder(storeId: string, orderId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("store_orders")
    .select(
      `
      id,
      order_code,
      status,
      order_type,
      source,
      delivery_type,
      notes,
      coupon_code,
      subtotal_amount,
      discount_amount,
      total_amount,
      edited_at,
      created_at,
      customers (
        id,
        full_name,
        phone,
        avatar_color,
        address,
        address_street,
        address_number,
        address_complement,
        address_neighborhood,
        address_city,
        address_state,
        address_postal_code
      ),
      store_order_items (
        id,
        product_id,
        product_name,
        quantity,
        unit_price,
        products (
          thumb_color,
          image_url,
          price_visible
        )
      )
    `
    )
    .eq("store_id", storeId)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const customerRaw = data.customers as StoreOrderDetail["customer"] | StoreOrderDetail["customer"][];
  const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;

  const items = (data.store_order_items ?? []).map((row) => {
    const product = row.products as
      | { thumb_color: string; image_url: string | null; price_visible: boolean }
      | { thumb_color: string; image_url: string | null; price_visible: boolean }[]
      | null;
    const productRow = Array.isArray(product) ? product[0] : product;

    return {
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.quantity,
      unit_price: row.unit_price === null ? null : Number(row.unit_price),
      thumb_color: productRow?.thumb_color ?? null,
      image_url: productRow?.image_url ?? null,
      price_visible: productRow?.price_visible ?? null
    } satisfies StoreOrderItem;
  });

  return {
    id: data.id,
    order_code: data.order_code,
    status: data.status,
    order_type: data.order_type,
    source: data.source,
    delivery_type: data.delivery_type,
    notes: data.notes,
    coupon_code: data.coupon_code,
    subtotal_amount: data.subtotal_amount === null ? null : Number(data.subtotal_amount),
    discount_amount: Number(data.discount_amount),
    total_amount: data.total_amount === null ? null : Number(data.total_amount),
    edited_at: data.edited_at,
    created_at: data.created_at,
    customer,
    items
  } satisfies StoreOrderDetail;
}

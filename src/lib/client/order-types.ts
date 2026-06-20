export type StoreOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  thumb_color?: string | null;
  image_url?: string | null;
  price_visible?: boolean | null;
};

export type StoreOrderDetail = {
  id: string;
  order_code: number;
  status: string;
  order_type: string;
  source: string;
  delivery_type: string;
  notes: string | null;
  coupon_code: string | null;
  subtotal_amount: number | null;
  discount_amount: number;
  total_amount: number | null;
  edited_at: string | null;
  created_at: string;
  customer: {
    id: string;
    full_name: string;
    phone: string;
    avatar_color: string;
    address_street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_neighborhood: string | null;
    address_city: string | null;
    address_state: string | null;
    address_postal_code: string | null;
    address: string | null;
  };
  items: StoreOrderItem[];
};

export function formatCustomerAddress(customer: StoreOrderDetail["customer"]) {
  const parts = [
    customer.address_street,
    customer.address_number,
    customer.address_complement,
    customer.address_neighborhood,
    customer.address_city,
    customer.address_state
  ].filter(Boolean);

  if (parts.length) {
    return parts.join(", ");
  }

  return customer.address?.trim() || "";
}

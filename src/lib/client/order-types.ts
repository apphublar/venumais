import type { StoreOrderInstallment } from "@/lib/client/order-status";

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
  customer_payment_method?: "pix" | "cash" | "card" | null;
  customer_payment_note?: string | null;
  vendor_payment_link?: string | null;
  vendor_payment_message?: string | null;
  payment_proof_url?: string | null;
  payment_proof_name?: string | null;
  payment_informed?: boolean | null;
  payment_mode?: "cash" | "installment" | null;
  installment_plan_status?: "none" | "pending" | "approved" | "rejected" | null;
  installment_card_mode?: "full" | "per_installment" | null;
  quote_sent_at?: string | null;
  customer_confirmed_at?: string | null;
  payment_reported_at?: string | null;
  paid_at?: string | null;
  expected_delivery_date?: string | null;
  delivered_at?: string | null;
  tracking_code?: string | null;
  tracking_url?: string | null;
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
    email: string | null;
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
  installments: StoreOrderInstallment[];
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

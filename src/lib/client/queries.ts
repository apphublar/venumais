import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PublicStore = {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  brand_text_color?: string | null;
  catalog_tagline: string;
  logo_url: string | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
};

export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  promo_price: number | null;
  wholesale_price: number | null;
  price_visible: boolean;
  featured: boolean;
  stock_qty: number;
  sell_without_stock: boolean;
  stock_visible: boolean;
  thumb_color: string;
  image_url: string | null;
  variations: string[];
};

export async function getPublicStoreBySlug(slug: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_store", { p_slug: slug });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  const store = row as PublicStore;
  return {
    ...store,
    logo_url: store.logo_url ?? null,
    pix_key: store.pix_key ?? null,
    pix_receiver_name: store.pix_receiver_name ?? null,
    catalog_tagline: store.catalog_tagline ?? "Catálogo online"
  };
}

export async function listCustomerStoresForPortal() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase.rpc("list_customer_stores_for_portal");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PublicStore[]).map((row) => ({
    ...row,
    logo_url: row.logo_url ?? null,
    pix_key: row.pix_key ?? null,
    pix_receiver_name: row.pix_receiver_name ?? null,
    catalog_tagline: row.catalog_tagline ?? "Catálogo online"
  }));
}

export async function listPublicProducts(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_public_products", {
    p_store_id: storeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<PublicProduct & { variations?: unknown }>).map((row) => ({
    ...row,
    price: Number(row.price),
    promo_price: row.promo_price === null ? null : Number(row.promo_price),
    wholesale_price: row.wholesale_price === null ? null : Number(row.wholesale_price),
    stock_qty: Number(row.stock_qty),
    sell_without_stock: Boolean(row.sell_without_stock),
    stock_visible: row.stock_visible !== false,
    variations: Array.isArray(row.variations) ? row.variations.map(String) : []
  }));
}

export type PortalCustomer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_color: string;
  address_postal_code: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
};

export type PortalInstallment = {
  id: string;
  sale_id: string;
  sale_code: number;
  installment_number: number;
  due_date: string;
  amount: number;
  paid: boolean;
  paid_at: string | null;
};

export type PortalSaleSummary = {
  id: string;
  sale_code: number;
  sold_at: string;
  total_amount: number;
  payment_mode: string;
  confirmation_status: "pending" | "confirmed";
  confirmed_at: string | null;
  item_count: number;
  open_amount: number;
};

export type PortalSaleDetail = {
  id: string;
  sale_code: number;
  sold_at: string;
  total_amount: number;
  payment_mode: string;
  confirmation_status: "pending" | "confirmed";
  confirmed_at: string | null;
  items: Array<{
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  installments: Array<{
    id: string;
    installment_number: number;
    due_date: string;
    amount: number;
    paid: boolean;
  }>;
};

export type PortalOrder = {
  id: string;
  order_code: number;
  status: string;
  order_type: string;
  delivery_type: string;
  customer_payment_method?: "pix" | "cash" | "card" | null;
  vendor_payment_link?: string | null;
  vendor_payment_message?: string | null;
  payment_proof_url?: string | null;
  payment_informed?: boolean;
  paid_at?: string | null;
  expected_delivery_date?: string | null;
  delivered_at?: string | null;
  tracking_code?: string | null;
  tracking_url?: string | null;
  notes: string | null;
  subtotal_amount: number | null;
  discount_amount: number;
  total_amount: number | null;
  edited_at: string | null;
  created_at: string;
  item_count: number;
};

export type PortalOrderDetail = {
  id: string;
  order_code: number;
  status: string;
  order_type: string;
  delivery_type: "pickup" | "delivery";
  notes: string | null;
  edited_at: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number | null;
  }>;
};

export type VendorStoreOrder = PortalOrder & {
  source: string;
  customer_id: string;
  customer_full_name: string;
  customer_phone: string;
  customer_avatar_color: string;
  payment_proof_url?: string | null;
  payment_informed?: boolean;
  payment_mode?: "cash" | "installment" | null;
  installment_plan_status?: "none" | "pending" | "approved" | "rejected" | null;
  expected_delivery_date?: string | null;
  installments?: Array<{
    id: string;
    installment_number: number;
    due_date: string;
    amount: number;
    paid: boolean;
    paid_at?: string | null;
    payment_informed?: boolean;
  }>;
};

export type CancelledStoreOrder = {
  id: string;
  order_code: number;
  cancelled_at: string | null;
  created_at: string;
  customer_id: string;
  customer_full_name: string;
  customer_phone: string;
  customer_avatar_color: string;
  item_count: number;
};

export async function getPortalCustomer(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_customer_for_store", {
    p_store_id: storeId
  });

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    id: row.id,
    full_name: row.full_name ?? "Cliente",
    phone: row.phone ?? "",
    email: row.email ?? null,
    avatar_color: row.avatar_color,
    address_postal_code: row.address_postal_code ?? null,
    address_street: row.address_street ?? null,
    address_number: row.address_number ?? null,
    address_complement: row.address_complement ?? null,
    address_neighborhood: row.address_neighborhood ?? null,
    address_city: row.address_city ?? null,
    address_state: row.address_state ?? null
  } satisfies PortalCustomer;
}

export async function listCustomerSalesForPortal(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_customer_sales_summary_for_portal", {
    p_store_id: storeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PortalSaleSummary[]).map((row) => ({
    ...row,
    total_amount: Number(row.total_amount),
    item_count: Number(row.item_count),
    open_amount: Number(row.open_amount)
  }));
}

export async function listCustomerInstallmentsForPortal(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_customer_installments_for_portal", {
    p_store_id: storeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PortalInstallment[]).map((row) => ({
    ...row,
    sale_code: Number(row.sale_code),
    installment_number: Number(row.installment_number),
    amount: Number(row.amount)
  }));
}

export async function getCustomerSaleForPortal(storeId: string, saleId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_customer_sale_for_portal", {
    p_store_id: storeId,
    p_sale_id: saleId
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return null;
  }

  const items = Array.isArray(row.items) ? row.items : [];
  const installments = Array.isArray(row.installments) ? row.installments : [];

  return {
    id: row.id,
    sale_code: Number(row.sale_code),
    sold_at: row.sold_at,
    total_amount: Number(row.total_amount),
    payment_mode: row.payment_mode,
    confirmation_status: row.confirmation_status,
    confirmed_at: row.confirmed_at,
    items: items.map((item: Record<string, unknown>) => ({
      product_id: (item.product_id as string | null) ?? null,
      product_name: String(item.product_name),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price)
    })),
    installments: installments.map((installment: Record<string, unknown>) => ({
      id: String(installment.id),
      installment_number: Number(installment.installment_number),
      due_date: String(installment.due_date),
      amount: Number(installment.amount),
      paid: Boolean(installment.paid)
    }))
  } satisfies PortalSaleDetail;
}

export async function listPortalOrders(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_customer_orders_for_portal", {
    p_store_id: storeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PortalOrder[]).map((row) => ({
    ...row,
    subtotal_amount: row.subtotal_amount === null ? null : Number(row.subtotal_amount),
    discount_amount: Number(row.discount_amount),
    total_amount: row.total_amount === null ? null : Number(row.total_amount),
    item_count: Number(row.item_count)
  }));
}

export async function getPortalOrderForEdit(storeId: string, orderId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_customer_order_for_portal", {
    p_store_id: storeId,
    p_order_id: orderId
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null
    | undefined;
  if (!row) {
    return null;
  }

  const items = Array.isArray(row.items) ? row.items : [];

  return {
    id: String(row.id),
    order_code: Number(row.order_code),
    status: String(row.status),
    order_type: String(row.order_type),
    delivery_type: String(row.delivery_type) === "delivery" ? "delivery" : "pickup",
    notes: row.notes === null ? null : String(row.notes),
    edited_at: row.edited_at === null ? null : String(row.edited_at),
    created_at: String(row.created_at),
    items: items.map((item) => {
      const rowItem = item as Record<string, unknown>;
      return {
        id: String(rowItem.id),
        product_id: rowItem.product_id === null ? null : String(rowItem.product_id),
        product_name: String(rowItem.product_name),
        quantity: Number(rowItem.quantity),
        unit_price: rowItem.unit_price === null ? null : Number(rowItem.unit_price)
      };
    })
  } satisfies PortalOrderDetail;
}

export async function listVendorStoreOrders(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_store_orders_for_vendor", {
    p_store_id: storeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VendorStoreOrder[]).map((row) => ({
    ...row,
    subtotal_amount: row.subtotal_amount === null ? null : Number(row.subtotal_amount),
    discount_amount: Number(row.discount_amount),
    total_amount: row.total_amount === null ? null : Number(row.total_amount),
    item_count: Number(row.item_count),
    installments: Array.isArray(row.installments)
      ? row.installments.map((installment) => ({
          ...installment,
          amount: Number(installment.amount),
          paid: Boolean(installment.paid)
        }))
      : []
  }));
}

export async function listCancelledStoreOrders(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_cancelled_store_orders", {
    p_store_id: storeId
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CancelledStoreOrder[]).map((row) => ({
    ...row,
    item_count: Number(row.item_count)
  }));
}

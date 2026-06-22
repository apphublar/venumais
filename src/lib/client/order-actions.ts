"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function approveStoreOrderAction(
  storeId: string,
  orderId: string,
  items: Array<{ id: string; unitPrice: number }>,
  vendorNote?: string
) {
  if (!items.length || items.some((item) => item.unitPrice <= 0)) {
    return { error: "Defina todos os preços para aprovar." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("approve_store_order", {
    p_store_id: storeId,
    p_order_id: orderId,
    p_items: items.map((item) => ({
      id: item.id,
      unit_price: item.unitPrice
    }))
  });

  if (error) {
    return { error: error.message };
  }

  if (vendorNote?.trim()) {
    const { error: noteError } = await supabase
      .from("store_orders")
      .update({ vendor_payment_message: vendorNote.trim() })
      .eq("id", orderId)
      .eq("store_id", storeId);

    if (noteError) {
      return { error: noteError.message };
    }
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${orderId}`);

  return { success: true as const };
}

export async function confirmStoreOrderPaymentAction(storeId: string, orderId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("confirm_store_order_payment", {
    p_store_id: storeId,
    p_order_id: orderId
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true as const };
}

export async function updateStoreOrderDeliveryAction(input: {
  storeId: string;
  orderId: string;
  status: "paid" | "delivering" | "delivered";
  expectedDeliveryDate?: string;
  deliveredAt?: string;
  trackingCode?: string;
  trackingUrl?: string;
}) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("update_store_order_delivery", {
    p_store_id: input.storeId,
    p_order_id: input.orderId,
    p_status: input.status,
    p_expected_delivery_date: input.expectedDeliveryDate || null,
    p_delivered_at: input.deliveredAt || null,
    p_tracking_code: input.trackingCode || null,
    p_tracking_url: input.trackingUrl || null
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${input.orderId}`);
  return { success: true as const };
}

export async function setStoreOrderPaymentLinkAction(input: {
  storeId: string;
  orderId: string;
  paymentLink?: string;
  paymentMessage?: string;
}) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_store_order_payment_link", {
    p_store_id: input.storeId,
    p_order_id: input.orderId,
    p_payment_link: input.paymentLink || null,
    p_payment_message: input.paymentMessage || null
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${input.orderId}`);
  return { success: true as const };
}

/** Alias semântico de setStoreOrderPaymentLinkAction: gera link → status vira awaiting_card */
export async function generateCardPaymentLinkAction(input: {
  storeId: string;
  storeSlug?: string;
  orderId: string;
  paymentLink: string;
  paymentMessage?: string;
}) {
  return setStoreOrderPaymentLinkAction({
    storeId: input.storeId,
    orderId: input.orderId,
    paymentLink: input.paymentLink,
    paymentMessage: input.paymentMessage
  });
}

export async function approveStoreOrderInstallmentPlanAction(storeId: string, orderId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("approve_store_order_installment_plan", {
    p_store_id: storeId,
    p_order_id: orderId
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true as const };
}

export async function rejectStoreOrderInstallmentPlanAction(storeId: string, orderId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reject_store_order_installment_plan", {
    p_store_id: storeId,
    p_order_id: orderId
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true as const };
}

export async function confirmStoreOrderInstallmentPaymentAction(
  storeId: string,
  orderId: string,
  installmentId: string
) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("confirm_store_order_installment_payment", {
    p_store_id: storeId,
    p_order_id: orderId,
    p_installment_id: installmentId
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${orderId}`);
  return { success: true as const };
}

export async function setStoreOrderInstallmentPaymentLinkAction(input: {
  storeId: string;
  orderId: string;
  installmentId: string;
  paymentLink?: string;
  paymentMessage?: string;
}) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_store_order_installment_payment_link", {
    p_store_id: input.storeId,
    p_order_id: input.orderId,
    p_installment_id: input.installmentId,
    p_payment_link: input.paymentLink || null,
    p_payment_message: input.paymentMessage || null
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${input.orderId}`);
  return { success: true as const };
}

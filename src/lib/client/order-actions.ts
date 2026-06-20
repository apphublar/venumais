"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function approveStoreOrderAction(
  storeId: string,
  orderId: string,
  items: Array<{ id: string; unitPrice: number }>
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

  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${orderId}`);

  return { success: true as const };
}

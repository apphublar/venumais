import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { StoreCoupon } from "@/lib/coupons/types";

export async function listStoreCoupons(storeId: string): Promise<StoreCoupon[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("store_coupons")
    .select("id, store_id, code, type, value, description, uses_count, active, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  return (data ?? []) as StoreCoupon[];
}

export async function findStoreCouponByCode(
  storeId: string,
  code: string
): Promise<StoreCoupon | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("store_coupons")
    .select("id, store_id, code, type, value, description, uses_count, active, created_at")
    .eq("store_id", storeId)
    .eq("active", true)
    .ilike("code", code.trim())
    .maybeSingle();

  return (data as StoreCoupon | null) ?? null;
}

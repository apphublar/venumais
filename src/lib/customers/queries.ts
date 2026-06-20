import type { Customer } from "@/lib/database/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function listStoreCustomers(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("store_id", storeId)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Customer[];
}

export async function getStoreCustomer(storeId: string, customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Customer | null;
}

export async function countStoreCustomers(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

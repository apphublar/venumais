import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CustomerAccountChangeRequest } from "@/lib/customers/account-requests.types";

export type { CustomerAccountChangeRequest } from "@/lib/customers/account-requests.types";

export async function listCustomerAccountChangeRequests(
  storeId: string,
  customerId?: string
): Promise<CustomerAccountChangeRequest[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_customer_account_change_requests_for_store", {
    p_store_id: storeId,
    p_customer_id: customerId ?? null
  });

  if (error) {
    return [];
  }

  return ((data ?? []) as CustomerAccountChangeRequest[]).map((row) => ({
    ...row,
    payload: row.payload ?? null
  }));
}

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerAccountChangeRequest = {
  id: string;
  customer_id: string;
  request_type: "profile" | "password" | "deletion" | "support";
  payload: Record<string, unknown> | null;
  message: string | null;
  status: string;
  requested_at: string;
};

const REQUEST_TYPE_LABELS: Record<CustomerAccountChangeRequest["request_type"], string> = {
  profile: "Alteração de dados",
  password: "Troca de senha",
  deletion: "Exclusão de conta",
  support: "Suporte / alteração"
};

export function getAccountChangeRequestLabel(type: CustomerAccountChangeRequest["request_type"]) {
  return REQUEST_TYPE_LABELS[type];
}

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

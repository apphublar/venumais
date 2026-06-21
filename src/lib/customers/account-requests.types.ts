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

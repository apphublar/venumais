// Mapa canônico: status do banco → label + cores do protótipo
// Não altere os labels sem alinhar com o protótipo (PEDIDO_STATUS no data.js).

export type OrderStatusMeta = {
  label: string;
  bg: string;
  fg: string;
  dot: string;
};

export const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
  // ── Status ativos ───────────────────────────────────────────────────────────
  quote:            { label: "Orçamento",             bg: "#fef3c7", fg: "#92660b", dot: "#d97706" },
  quote_answered:   { label: "Orçamento recebido",    bg: "#dbeafe", fg: "#1e478f", dot: "#2563eb" },
  awaiting_payment: { label: "Em aberto",             bg: "#dbeafe", fg: "#1e478f", dot: "#2563eb" },
  awaiting_card:    { label: "Aguardando cartão",     bg: "#ede9fe", fg: "#6d28d9", dot: "#7c3aed" },
  cash_on_delivery: { label: "A combinar (dinheiro)", bg: "#fff7ed", fg: "#b45309", dot: "#ea580c" },
  paid:             { label: "Pago",                  bg: "#dcfce7", fg: "#15803d", dot: "#16a34a" },
  cancelled:        { label: "Cancelado",             bg: "#fee2e2", fg: "#b1182a", dot: "#dc2626" },
  // ── Legados (backward compat) ────────────────────────────────────────────────
  new:              { label: "Em aberto",             bg: "#dbeafe", fg: "#1e478f", dot: "#2563eb" },
  quoted:           { label: "Orçamento recebido",    bg: "#dbeafe", fg: "#1e478f", dot: "#2563eb" },
  payment_review:   { label: "Em aberto",             bg: "#dbeafe", fg: "#1e478f", dot: "#2563eb" },
  // ── Futuros ──────────────────────────────────────────────────────────────────
  delivering:       { label: "Em entrega",            bg: "#ede9fe", fg: "#6d28d9", dot: "#7c3aed" },
  delivered:        { label: "Entregue",              bg: "#dcfce7", fg: "#065f46", dot: "#16a34a" },
};

export const PAYMENT_META: Record<string, { label: string; icon: string }> = {
  pix:  { label: "PIX",      icon: "pix"    },
  cash: { label: "Dinheiro", icon: "wallet" },
  card: { label: "Cartão",   icon: "cards"  },
};

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return ORDER_STATUS_META[status] ?? { label: status, bg: "#f3f4f6", fg: "#374151", dot: "#6b7280" };
}

/** Pedidos que ainda podem ter itens editados pelo cliente */
export function isOrderEditable(status: string): boolean {
  return ["new", "quote", "quoted", "quote_answered"].includes(status);
}

/** Pedido aguarda a loja precificar (orçamento não respondido) */
export function isQuoteUnresolved(status: string): boolean {
  return status === "quote" || status === "new";
}

/** Loja respondeu o orçamento, cliente decide */
export function isQuoteAnswered(status: string): boolean {
  return status === "quote_answered" || status === "quoted";
}

/** Cliente precisa de ação (fechar orçamento, informar pagamento...) */
export function orderNeedsClientAction(status: string, paymentInformed?: boolean): boolean {
  if (isQuoteAnswered(status)) return true;
  if (status === "awaiting_payment" && !paymentInformed) return true;
  if (status === "awaiting_card") return true;
  return false;
}

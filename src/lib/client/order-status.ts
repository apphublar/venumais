// Mapa canônico: status do banco → label + cores do protótipo
// Não altere os labels sem alinhar com o protótipo (PEDIDO_STATUS no data.js).

import { getSaleStatus } from "@/lib/sales/format";
import type { SaleInstallment } from "@/lib/sales/types";

export type StoreOrderInstallment = {
  id?: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid: boolean;
  paid_at?: string | null;
  payment_informed?: boolean;
  payment_proof_url?: string | null;
  payment_proof_name?: string | null;
  payment_reported_at?: string | null;
  vendor_payment_link?: string | null;
  vendor_payment_message?: string | null;
};

function asSaleInstallments(installments: StoreOrderInstallment[]): SaleInstallment[] {
  return installments.map((installment) => ({
    id: installment.id ?? String(installment.installment_number),
    sale_id: "",
    installment_number: installment.installment_number,
    due_date: installment.due_date,
    amount: installment.amount,
    paid: installment.paid,
    paid_at: installment.paid_at ?? null,
    payment_method: null,
    created_at: "",
    updated_at: ""
  }));
}

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
  awaiting_installment_approval: { label: "Aguardando autorização", bg: "#fef3c7", fg: "#92660b", dot: "#d97706" },
  awaiting_payment: { label: "Em aberto",             bg: "#dbeafe", fg: "#1e478f", dot: "#2563eb" },
  awaiting_card:    { label: "Aguardando cartão",     bg: "#ede9fe", fg: "#6d28d9", dot: "#7c3aed" },
  cash_on_delivery: { label: "A combinar (dinheiro)", bg: "#fff7ed", fg: "#b45309", dot: "#ea580c" },
  paid:             { label: "Pago",                  bg: "var(--green-50)", fg: "var(--green-700)", dot: "#16a34a" },
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

/** Pedido pode ser cancelado pelo cliente antes da loja confirmar pagamento */
export function isOrderCancellable(status: string): boolean {
  return [
    "new",
    "quote",
    "quoted",
    "quote_answered",
    "awaiting_installment_approval",
    "awaiting_payment",
    "payment_review",
    "awaiting_card",
    "cash_on_delivery"
  ].includes(status);
}

/** Pedido quitado — cliente pode ver recibo */
export function isOrderReceiptAvailable(status: string): boolean {
  return ["paid", "delivering", "delivered"].includes(status);
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

export function getVendorOrderPaymentBadge(order: {
  status: string;
  order_type?: string;
  payment_mode?: string | null;
  installment_plan_status?: string | null;
  installments?: StoreOrderInstallment[];
}) {
  if (["paid", "delivering", "delivered"].includes(order.status)) {
    return { label: "Quitada", className: "vendor-sale-badge-paid" };
  }

  if (
    order.status === "awaiting_installment_approval" ||
    order.installment_plan_status === "pending"
  ) {
    return { label: "Aguardando autorização", className: "vendor-sale-badge-open" };
  }

  if (order.payment_mode === "installment" && order.installments?.length) {
    const saleStatus = getSaleStatus(asSaleInstallments(order.installments));
    if (saleStatus === "paid") {
      return { label: "Quitada", className: "vendor-sale-badge-paid" };
    }
    if (saleStatus === "overdue") {
      return { label: "Atrasada", className: "vendor-sale-badge-overdue" };
    }
    return { label: "Em aberto", className: "vendor-sale-badge-open" };
  }

  if (order.status === "quote" || order.order_type === "quote") {
    return { label: "Orçamento", className: "vendor-sale-badge-open" };
  }

  return { label: "Em aberto", className: "vendor-sale-badge-open" };
}

export function getNextUnpaidInstallment(installments: StoreOrderInstallment[] = []) {
  return installments
    .filter((installment) => !installment.paid)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
}

import type { SaleInstallment, SaleStatus } from "@/lib/sales/types";

export type CouponLike = {
  code: string;
  type: "percent" | "fixed";
  value: number;
};

export function brStr(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2).replace(".", ",");
}

export function parseBRL(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

export function splitInstallments(total: number, count: number) {
  const each = Math.round((total / count) * 100) / 100;
  const amounts = Array.from({ length: count }, () => each);
  amounts[count - 1] = Math.round((total - each * (count - 1)) * 100) / 100;
  return amounts;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonthsKeepDay(date: Date, months: number) {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSaleDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
}

export function formatSaleCode(code: number) {
  return String(code).padStart(4, "0");
}

export function getInstallmentStatus(installment: SaleInstallment): SaleStatus | "paid" {
  if (installment.paid) {
    return "paid";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${installment.due_date}T00:00:00`);

  if (due < today) {
    return "overdue";
  }

  return "open";
}

export function getSaleStatus(installments: SaleInstallment[]): SaleStatus {
  const openAmount = installments
    .filter((installment) => !installment.paid)
    .reduce((total, installment) => total + installment.amount, 0);

  if (openAmount <= 0.001) {
    return "paid";
  }

  if (installments.some((installment) => getInstallmentStatus(installment) === "overdue")) {
    return "overdue";
  }

  return "open";
}

export function getOpenAmount(installments: SaleInstallment[]) {
  return installments
    .filter((installment) => !installment.paid)
    .reduce((total, installment) => total + installment.amount, 0);
}

export function getSaleProgress(installments: SaleInstallment[]) {
  const total = installments.length;
  const paidCount = installments.filter((installment) => installment.paid).length;
  const remaining = total - paidCount;
  const next = installments
    .filter((installment) => !installment.paid)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  let nextLabel = "";
  if (next) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${next.due_date}T00:00:00`);
    const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

    if (diff === 0) {
      nextLabel = "Hoje";
    } else if (diff === 1) {
      nextLabel = "Amanhã";
    } else if (diff > 1) {
      nextLabel = `${diff}d`;
    } else {
      nextLabel = "Última parcela";
    }
  }

  return {
    total,
    paidCount,
    remaining,
    next,
    nextLabel
  };
}

export function getPaidAmount(installments: SaleInstallment[]) {
  return installments
    .filter((installment) => installment.paid)
    .reduce((total, installment) => total + installment.amount, 0);
}

export function couponDiscount(
  coupon: CouponLike | null,
  total: number
) {
  if (!coupon || total <= 0) {
    return 0;
  }

  if (coupon.type === "percent") {
    return Math.round(((total * coupon.value) / 100) * 100) / 100;
  }

  return Math.min(total, coupon.value);
}

export const PAYMENT_METHOD_LABELS = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro"
} as const;

export const SALE_STATUS_LABELS = {
  paid: "Quitada",
  open: "Em aberto",
  overdue: "Atrasada"
} as const;

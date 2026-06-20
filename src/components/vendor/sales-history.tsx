"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorSaleRow } from "@/components/vendor/sale-row";
import { VendorCard } from "@/components/vendor/card";
import { formatBRL } from "@/lib/products/format";
import { getOpenAmount, getPaidAmount, getSaleStatus } from "@/lib/sales/format";
import type { SaleWithRelations } from "@/lib/sales/types";

const STATUS_TABS = [
  ["all", "Todas"],
  ["paid", "Quitadas"],
  ["open", "Em aberto"],
  ["overdue", "Atrasadas"]
] as const;

type StatusFilter = (typeof STATUS_TABS)[number][0];

function sameMonth(date: Date, base: Date) {
  return date.getMonth() === base.getMonth() && date.getFullYear() === base.getFullYear();
}

export function SalesHistory({ sales }: { sales: SaleWithRelations[] }) {
  const now = new Date();
  const [ref, setRef] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [status, setStatus] = useState<StatusFilter>("all");

  const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const isFutureNext = new Date(ref.getFullYear(), ref.getMonth() + 1, 1) > curMonthStart;

  const monthSales = useMemo(
    () => sales.filter((sale) => sameMonth(new Date(sale.sold_at), ref)),
    [ref, sales]
  );
  const prevSales = useMemo(
    () => sales.filter((sale) => sameMonth(new Date(sale.sold_at), prevMonth)),
    [prevMonth, sales]
  );

  const monthTotal = monthSales.reduce((total, sale) => total + sale.total_amount, 0);
  const prevTotal = prevSales.reduce((total, sale) => total + sale.total_amount, 0);
  const delta =
    prevTotal > 0
      ? Math.round(((monthTotal - prevTotal) / prevTotal) * 100)
      : monthTotal > 0
        ? 100
        : 0;

  const received = monthSales.reduce(
    (total, sale) => total + getPaidAmount(sale.installments),
    0
  );
  const open = monthSales.reduce(
    (total, sale) => total + getOpenAmount(sale.installments),
    0
  );

  const counts = {
    all: monthSales.length,
    paid: monthSales.filter((sale) => getSaleStatus(sale.installments) === "paid").length,
    open: monthSales.filter((sale) => getSaleStatus(sale.installments) === "open").length,
    overdue: monthSales.filter((sale) => getSaleStatus(sale.installments) === "overdue").length
  };

  const list = monthSales
    .filter((sale) => status === "all" || getSaleStatus(sale.installments) === status)
    .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime());

  const monthLabel = ref
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (char) => char.toUpperCase());
  const prevName = prevMonth.toLocaleDateString("pt-BR", { month: "long" });

  return (
    <section className="vendor-sales-history">
      <div className="vendor-sales-history-month">
        <button
          aria-label="Mês anterior"
          className="vendor-sales-history-nav"
          onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}
          type="button"
        >
          <VendorIcon name="chevL" size={18} />
        </button>
        <div>
          <strong>{monthLabel}</strong>
          <span>
            {counts.all} {counts.all === 1 ? "venda" : "vendas"}
          </span>
        </div>
        <button
          aria-label="Próximo mês"
          className="vendor-sales-history-nav"
          disabled={isFutureNext}
          onClick={() =>
            !isFutureNext && setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))
          }
          type="button"
        >
          <VendorIcon name="chevR" size={18} />
        </button>
      </div>

      <div className="vendor-sales-history-hero">
        <span>Total vendido</span>
        <strong>{formatBRL(monthTotal)}</strong>
        <div className="vendor-sales-history-delta">
          <span>
            <VendorIcon name={delta >= 0 ? "arrowUp" : "arrowDown"} size={13} /> {Math.abs(delta)}%
          </span>
          <small>
            vs {prevName} ({formatBRL(prevTotal)})
          </small>
        </div>
      </div>

      <div className="vendor-dashboard-two-up">
        <VendorCard className="vendor-sales-history-mini">
          <span>Recebido</span>
          <strong className="vendor-text-success">{formatBRL(received)}</strong>
        </VendorCard>
        <VendorCard className="vendor-sales-history-mini">
          <span>A receber</span>
          <strong>{formatBRL(open)}</strong>
        </VendorCard>
      </div>

      <div className="vendor-filter-chips">
        {STATUS_TABS.map(([key, label]) => (
          <button
            className={status === key ? "vendor-filter-chip-active" : "vendor-filter-chip"}
            key={key}
            onClick={() => setStatus(key)}
            type="button"
          >
            {label} <em>{counts[key]}</em>
          </button>
        ))}
      </div>

      <div className="vendor-sales-history-list">
        {list.length ? (
          list.map((sale) => <VendorSaleRow key={sale.id} sale={sale} />)
        ) : (
          <div className="vendor-empty vendor-dashboard-empty">
            <strong>Nenhuma venda neste filtro.</strong>
          </div>
        )}
      </div>
    </section>
  );
}

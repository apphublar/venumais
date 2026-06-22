"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { CobrancaSheet } from "@/components/vendor/cobranca-sheet";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import { installmentToCobranca } from "@/lib/sales/cobranca";
import { formatShortDate } from "@/lib/sales/format";
import type { ReceivableInstallment } from "@/lib/sales/receivables";

type AgingFilter = "todos" | "1-7" | "8-30" | "30+";

const FAIXAS: Array<[AgingFilter, string]> = [
  ["todos", "Todos"],
  ["1-7", "1–7 dias"],
  ["8-30", "8–30 dias"],
  ["30+", "+30 dias"]
];

function daysBetween(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function isOverdue(dueDate: string) {
  return daysBetween(dueDate) < 0;
}

function daysLate(dueDate: string) {
  return Math.abs(daysBetween(dueDate));
}

function inAgingBand(dueDate: string, filter: AgingFilter) {
  const delay = daysLate(dueDate);

  if (filter === "1-7") {
    return delay <= 7;
  }

  if (filter === "8-30") {
    return delay >= 8 && delay <= 30;
  }

  if (filter === "30+") {
    return delay > 30;
  }

  return true;
}

export function InadimplenciaScreen({
  installments,
  store
}: {
  installments: ReceivableInstallment[];
  store: {
    name: string;
    pix_key?: string | null;
    pix_receiver_name?: string | null;
  };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<AgingFilter>("todos");
  const [active, setActive] = useState<ReceivableInstallment | null>(null);

  const overdue = useMemo(
    () => installments.filter((installment) => isOverdue(installment.due_date)),
    [installments]
  );

  const list = useMemo(
    () =>
      overdue
        .filter((installment) => inAgingBand(installment.due_date, filter))
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [filter, overdue]
  );

  const total = list.reduce((sum, installment) => sum + installment.amount, 0);

  return (
    <>
      <div className="vendor-screen-body vendor-inadimplencia">
        <div className="vendor-inadimplencia-hero">
          <span>Total em atraso</span>
          <strong>{formatBRL(total)}</strong>
        </div>

        <div className="vendor-filter-chips">
          {FAIXAS.map(([key, label]) => (
            <button
              className={filter === key ? "vendor-filter-chip-active" : "vendor-filter-chip"}
              key={key}
              onClick={() => setFilter(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="vendor-inadimplencia-list">
          {list.map((installment) => {
            const delay = daysLate(installment.due_date);

            return (
              <VendorCard className="vendor-inadimplencia-row" key={installment.id}>
                <VendorAvatar
                  color={installment.customer.avatar_color}
                  label={getCustomerInitials(installment.customer.full_name)}
                  size={42}
                />
                <div className="vendor-inadimplencia-row-copy">
                  <strong>{installment.customer.full_name}</strong>
                  <span>
                    {delay} dias · venceu {formatShortDate(installment.due_date)}
                  </span>
                </div>
                <div className="vendor-inadimplencia-row-side">
                  <strong>{formatBRL(installment.amount)}</strong>
                  <button
                    className="vendor-inadimplencia-cobrar"
                    onClick={() => setActive(installment)}
                    type="button"
                  >
                    <VendorWhatsLogo size={13} />
                    Cobrar
                  </button>
                </div>
              </VendorCard>
            );
          })}

          {!list.length ? (
            <div className="vendor-empty vendor-empty-compact">
              <p>Nenhuma parcela nesta faixa 🎉</p>
            </div>
          ) : null}
        </div>

        <div className="vendor-dashboard-spacer" />
      </div>

      {active ? (
        <CobrancaSheet
          context={installmentToCobranca(active, store)}
          customerColor={active.customer.avatar_color}
          customerName={active.customer.full_name}
          installmentId={active.id}
          installmentStatus="overdue"
          onClose={() => setActive(null)}
          onPaid={() => router.refresh()}
        />
      ) : null}
    </>
  );
}

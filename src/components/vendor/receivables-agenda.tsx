"use client";

import Link from "next/link";
import { useMemo } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import { formatShortDate } from "@/lib/sales/format";
import type { ReceivableInstallment } from "@/lib/sales/dashboard";

function receivableStatus(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);

  if (due < today) {
    return "overdue" as const;
  }

  if (due.getTime() === today.getTime()) {
    return "today" as const;
  }

  return "open" as const;
}

const GROUPS = [
  { key: "overdue", title: "Em atraso", tone: "danger" as const },
  { key: "today", title: "Hoje", tone: "default" as const },
  { key: "week", title: "Próximos 7 dias", tone: "default" as const },
  { key: "month", title: "Próximos 30 dias", tone: "default" as const }
];

function daysBetween(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function groupInstallments(installments: ReceivableInstallment[], key: string) {
  return installments.filter((installment) => {
    const diff = daysBetween(installment.due_date);

    if (key === "overdue") {
      return receivableStatus(installment.due_date) === "overdue";
    }

    if (key === "today") {
      return diff === 0;
    }

    if (key === "week") {
      return diff >= 1 && diff <= 7;
    }

    return diff >= 8 && diff <= 30;
  });
}

export function VendorReceivablesAgenda({
  filter,
  installments
}: {
  filter?: string;
  installments: ReceivableInstallment[];
}) {
  const totalPrev30 = useMemo(
    () =>
      installments
        .filter((installment) => daysBetween(installment.due_date) <= 30)
        .reduce((total, installment) => total + installment.amount, 0),
    [installments]
  );

  const visibleGroups = filter === "overdue" ? GROUPS.slice(0, 1) : GROUPS;

  return (
    <div className="vendor-agenda">
      <div className="vendor-agenda-hero">
        <div>
          <span>Previsto em 30 dias</span>
          <strong>{formatBRL(totalPrev30)}</strong>
        </div>
        <div className="vendor-agenda-hero-icon">
          <VendorIcon name="wallet" size={24} />
        </div>
      </div>

      {visibleGroups.map((group) => {
        const items = groupInstallments(installments, group.key);
        if (!items.length) {
          return null;
        }

        const total = items.reduce((sum, item) => sum + item.amount, 0);

        return (
          <section className="vendor-agenda-group" key={group.key}>
            <div className="vendor-agenda-group-head">
              <h2 className={group.tone === "danger" ? "vendor-agenda-group-danger" : undefined}>
                {group.title}
              </h2>
              <span>{formatBRL(total)}</span>
            </div>

            {items.map((installment) => {
              const status = receivableStatus(installment.due_date);
              const delay = Math.abs(daysBetween(installment.due_date));

              return (
                <Link href={`/painel/vendas/${installment.sale_id}`} key={installment.id}>
                  <VendorCard className="vendor-agenda-row">
                    <VendorAvatar
                      color={installment.customer.avatar_color}
                      label={getCustomerInitials(installment.customer.full_name)}
                      size={42}
                    />
                    <div className="vendor-agenda-row-copy">
                      <strong>{installment.customer.full_name}</strong>
                      <span>
                        <VendorIcon name="calendar" size={12} /> {formatShortDate(installment.due_date)} · Parc.{" "}
                        {installment.installment_number}
                        {status === "overdue" ? (
                          <em className="vendor-agenda-row-overdue"> · {delay}d atraso</em>
                        ) : null}
                      </span>
                    </div>
                    <div className="vendor-agenda-row-side">
                      <strong>{formatBRL(installment.amount)}</strong>
                      <span className={`vendor-agenda-status vendor-agenda-status-${status}`}>
                        {status === "overdue"
                          ? "Atrasada"
                          : status === "today"
                            ? "Vence hoje"
                            : status === "open"
                              ? "Em aberto"
                              : "Paga"}
                      </span>
                    </div>
                  </VendorCard>
                </Link>
              );
            })}
          </section>
        );
      })}

      <div className="vendor-dashboard-spacer" />
    </div>
  );
}

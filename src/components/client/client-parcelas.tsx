"use client";

import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import { formatShortDate, getInstallmentStatus } from "@/lib/sales/format";
import type { PortalInstallment } from "@/lib/client/queries";

const STATUS_CLASS: Record<string, string> = {
  paid: "client-installment-paid",
  open: "client-installment-open",
  today: "client-installment-today",
  overdue: "client-installment-overdue"
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Paga",
  open: "Em aberto",
  today: "Vence hoje",
  overdue: "Atrasada"
};

function classifyInstallmentStatus(installment: PortalInstallment) {
  if (installment.paid) {
    return "paid";
  }

  const base = getInstallmentStatus({
    id: installment.id,
    sale_id: installment.sale_id,
    installment_number: installment.installment_number,
    due_date: installment.due_date,
    amount: installment.amount,
    paid: installment.paid,
    paid_at: installment.paid_at,
    payment_method: null,
    created_at: "",
    updated_at: ""
  });

  if (base === "overdue") {
    return "overdue";
  }

  const today = new Date().toISOString().slice(0, 10);
  if (installment.due_date === today) {
    return "today";
  }

  return "open";
}

export function ClientParcelas({
  installments,
  onPay
}: {
  installments: PortalInstallment[];
  onPay: (installment: PortalInstallment) => void;
}) {
  const open = installments
    .filter((installment) => !installment.paid)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = installments.filter((installment) => installment.paid);
  const totalOpen = open.reduce((sum, installment) => sum + installment.amount, 0);
  const next = open[0];

  return (
    <div className="client-main">
      <ClientScreenHeader big subtitle="Acompanhe seus pagamentos" title="Minhas parcelas" />
      <div className="client-screen-body">
        {next ? (
          <div className="client-next-installment">
            <span>
              Próxima parcela · vence {formatShortDate(next.due_date)}
            </span>
            <strong>{formatBRL(next.amount)}</strong>
            <button onClick={() => onPay(next)} type="button">
              Pagar agora
            </button>
          </div>
        ) : null}

        <div className="client-installment-summary">
          <span>Em aberto</span>
          <span>{formatBRL(totalOpen)}</span>
        </div>

        {open.map((installment) => {
          const status = classifyInstallmentStatus(installment);

          return (
            <VendorCard className="client-installment-card" key={installment.id}>
              <span className={`client-installment-num ${STATUS_CLASS[status] ?? ""}`}>
                {installment.installment_number}
              </span>
              <div className="client-installment-copy">
                <strong>{formatBRL(installment.amount)}</strong>
                <span className={`client-status-badge client-status-badge-${status}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <button
                className="client-installment-pay"
                onClick={() => onPay(installment)}
                type="button"
              >
                Pagar
              </button>
            </VendorCard>
          );
        })}

        {paid.length ? (
          <>
            <div className="vendor-section-label" style={{ margin: "14px 0 10px" }}>
              <span>Pagas</span>
            </div>
            {paid.map((installment) => (
              <div className="client-installment-paid-row" key={installment.id}>
                <VendorIcon name="check" size={18} />
                <span>Parcela {installment.installment_number}</span>
                <strong>{formatBRL(installment.amount)}</strong>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

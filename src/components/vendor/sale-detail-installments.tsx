"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VendorCard } from "@/components/vendor/card";
import { CobrancaSheet } from "@/components/vendor/cobranca-sheet";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { formatBRL } from "@/lib/products/format";
import { markInstallmentPaidAction } from "@/lib/sales/actions";
import { installmentToCobranca } from "@/lib/sales/cobranca";
import {
  getInstallmentStatus,
  PAYMENT_METHOD_LABELS
} from "@/lib/sales/format";
import type { PaymentMethod, SaleWithRelations } from "@/lib/sales/types";

export function SaleDetailInstallments({
  sale,
  store
}: {
  sale: SaleWithRelations;
  store: {
    name: string;
    pix_key?: string | null;
    pix_receiver_name?: string | null;
  };
}) {
  const router = useRouter();
  const [activeInstallmentId, setActiveInstallmentId] = useState<string | null>(null);

  const activeInstallment = sale.installments.find((item) => item.id === activeInstallmentId);

  return (
    <>
      <div className="vendor-list">
        {sale.installments.map((installment) => {
          const installmentStatus = getInstallmentStatus(installment);
          const payAction = markInstallmentPaidAction.bind(
            null,
            sale.id,
            installment.id,
            (sale.payment_method ?? "pix") as PaymentMethod,
            `/painel/vendas/${sale.id}`
          );

          return (
            <VendorCard className="vendor-installment-card" key={installment.id}>
              <div>
                <strong>
                  {installment.installment_number}ª parcela ·{" "}
                  {new Date(`${installment.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
                </strong>
                <span>
                  {installment.paid
                    ? `Pago${
                        installment.payment_method
                          ? ` · ${PAYMENT_METHOD_LABELS[installment.payment_method]}`
                          : ""
                      }`
                    : installmentStatus === "overdue"
                      ? "Atrasada"
                      : "A vencer"}
                </span>
              </div>
              <div className="vendor-installment-card-meta">
                <strong>{formatBRL(installment.amount)}</strong>
                {!installment.paid ? (
                  <div className="vendor-installment-actions">
                    <form action={payAction}>
                      <button className="vendor-button vendor-button-soft vendor-button-sm" type="submit">
                        <VendorIcon name="check" size={15} /> Recebi
                      </button>
                    </form>
                    <button
                      className="vendor-button vendor-button-whats vendor-button-sm"
                      onClick={() => setActiveInstallmentId(installment.id)}
                      type="button"
                    >
                      <VendorWhatsLogo size={14} /> Cobrar
                    </button>
                  </div>
                ) : null}
              </div>
            </VendorCard>
          );
        })}
      </div>

      {activeInstallment && sale.customer ? (
        <CobrancaSheet
          context={installmentToCobranca(
            {
              id: activeInstallment.id,
              sale_id: sale.id,
              installment_number: activeInstallment.installment_number,
              due_date: activeInstallment.due_date,
              amount: activeInstallment.amount,
              customer: {
                id: sale.customer.id,
                full_name: sale.customer.full_name,
                phone: sale.customer.phone,
                avatar_color: sale.customer.avatar_color ?? "#22a06b"
              }
            },
            store,
            sale.sale_code
          )}
          customerColor={sale.customer.avatar_color ?? "#22a06b"}
          customerName={sale.customer.full_name}
          installmentId={activeInstallment.id}
          installmentStatus={getInstallmentStatus(activeInstallment) === "overdue" ? "overdue" : "open"}
          onClose={() => setActiveInstallmentId(null)}
          onPaid={() => router.refresh()}
        />
      ) : null}
    </>
  );
}

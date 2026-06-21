"use client";

import { useState, useTransition } from "react";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientPixPaymentBlock } from "@/components/client/client-pix-payment-block";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import { reportInstallmentPaymentAction } from "@/lib/client/actions";
import { formatShortDate } from "@/lib/sales/format";
import type { PortalInstallment, PublicStore } from "@/lib/client/queries";

export function ClientInformarPagamento({
  installment,
  onClose,
  onToast,
  store
}: {
  installment: PortalInstallment;
  onClose: () => void;
  onToast: (message: string) => void;
  store: PublicStore;
}) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const informPayment = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("storeId", store.id);
      formData.set("storeSlug", store.slug);
      formData.set("installmentId", installment.id);
      if (receiptFile) {
        formData.set("receipt", receiptFile);
      }

      const result = await reportInstallmentPaymentAction(formData);
      if (result.error) {
        onToast(result.error);
        return;
      }
      onClose();
      onToast("Pagamento informado! A vendedora vai confirmar. ✓");
    });
  };

  return (
    <ClientOverlay>
      <ClientScreenHeader
        onBack={onClose}
        subtitle={`Parcela ${installment.installment_number} · vence ${formatShortDate(installment.due_date)}`}
        title="Pagar parcela"
      />
      <div className="client-screen-body">
        <ClientPixPaymentBlock
          amount={installment.amount}
          receiptControl={
            <>
              <div className="client-pay-section-label">Já pagou? Avise a vendedora</div>
              <label className={`client-pay-receipt ${receiptFile ? "is-attached" : ""}`}>
                <input
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                  style={{ display: "none" }}
                  type="file"
                />
                <VendorIcon name={receiptFile ? "check" : "share"} size={26} />
                <span>{receiptFile ? receiptFile.name : "Anexar comprovante"}</span>
              </label>
            </>
          }
          store={store}
        />
      </div>

      <div className="client-overlay-footer">
        <button
          className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
          disabled={isPending}
          onClick={informPayment}
          type="button"
        >
          <VendorIcon name="check" size={18} />
          {isPending ? "Enviando…" : "Informar pagamento"}
        </button>
      </div>
    </ClientOverlay>
  );
}

"use client";

import { useState, useTransition } from "react";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import { reportInstallmentPaymentAction } from "@/lib/client/actions";
import { formatBRL } from "@/lib/products/format";
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
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const pixName = store.pix_receiver_name ?? store.name;
  const pixKey = store.pix_key?.trim() ?? "";
  const hasPix = pixKey.length > 0;
  const pixCode = hasPix
    ? `00020126580014BR.GOV.BCB.PIX0136${pixKey}520400005303986540${installment.amount.toFixed(2)}5802BR5921${pixName}6304A1B2`
    : "";

  const copyPix = async () => {
    if (!hasPix) {
      onToast("A loja ainda não configurou uma chave PIX.");
      return;
    }

    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      onToast("Código PIX copiado!");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast("Não foi possível copiar o código.");
    }
  };

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
        <div className="client-pay-amount-card">
          <span>Valor a pagar</span>
          <strong>{formatBRL(installment.amount)}</strong>
          <small>para {pixName}</small>
        </div>

        <div className="client-pay-section-label">
          <VendorIcon name="pix" size={15} />
          {hasPix ? "PIX copia e cola" : "PIX indisponível"}
        </div>
        <button className="client-pay-pix-box" disabled={!hasPix} onClick={copyPix} type="button">
          <code>{hasPix ? pixCode : "A loja ainda não cadastrou chave PIX."}</code>
          <span>
            <VendorIcon name={copied ? "check" : "copy"} size={16} />
            {hasPix ? (copied ? "Copiado" : "Copiar") : "Indisponível"}
          </span>
        </button>

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

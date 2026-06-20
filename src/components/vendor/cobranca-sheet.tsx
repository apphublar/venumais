"use client";

import { useState, useTransition } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import { confirmInstallmentPaidAction } from "@/lib/sales/actions";
import {
  buildCobrancaMessage,
  buildPixCode,
  buildWhatsAppUrl,
  type CobrancaContext
} from "@/lib/sales/cobranca";
import { formatShortDate } from "@/lib/sales/format";

export function CobrancaSheet({
  context,
  customerColor,
  customerName,
  installmentId,
  installmentStatus,
  onClose,
  onPaid
}: {
  context: CobrancaContext;
  customerColor: string;
  customerName: string;
  installmentId: string;
  installmentStatus: "open" | "overdue";
  onClose: () => void;
  onPaid?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const message = buildCobrancaMessage(context);
  const pixCode = buildPixCode(context);
  const whatsappUrl = buildWhatsAppUrl(context.customerPhone, message);

  const copyPix = async () => {
    await navigator.clipboard?.writeText(pixCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const sendWhatsApp = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  const confirmPaid = () => {
    startTransition(async () => {
      const result = await confirmInstallmentPaidAction(installmentId, "pix");
      if (!result.error) {
        onPaid?.();
        onClose();
      }
    });
  };

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="cobranca-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="cobranca-title">Cobrança</h2>
          <button aria-label="Fechar" className="vendor-dashboard-icon-btn" onClick={onClose} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          <div className="vendor-cobranca-head">
            <VendorAvatar
              color={customerColor}
              label={getCustomerInitials(customerName)}
              size={48}
            />
            <div>
              <strong>{customerName}</strong>
              <span>
                Parcela {context.installmentNumber} · vence {formatShortDate(context.dueDate)}
              </span>
            </div>
            <span className={`vendor-agenda-status vendor-agenda-status-${installmentStatus}`}>
              {installmentStatus === "overdue" ? "Atrasada" : "Em aberto"}
            </span>
          </div>

          <div className="vendor-cobranca-amount">
            <span>Valor da parcela</span>
            <strong>{formatBRL(context.installmentAmount)}</strong>
          </div>

          <div className="vendor-cobranca-label">Mensagem automática</div>
          <div className="vendor-cobranca-message">{message}</div>

          <div className="vendor-cobranca-label">
            <VendorIcon name="pix" size={15} /> PIX copia e cola
          </div>
          <button className="vendor-cobranca-pix" onClick={copyPix} type="button">
            <span>{pixCode}</span>
            <em>
              <VendorIcon name={copied ? "check" : "copy"} size={16} />
              {copied ? "Copiado" : "Copiar"}
            </em>
          </button>

          <button className="vendor-cobranca-whats-btn" onClick={sendWhatsApp} type="button">
            <VendorWhatsLogo size={17} />
            {sent ? "Cobrança enviada ✓" : "Enviar pelo WhatsApp"}
          </button>

          <button
            className="vendor-cobranca-confirm-btn"
            disabled={pending}
            onClick={confirmPaid}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            Confirmar pagamento recebido
          </button>
        </div>
      </div>
    </div>
  );
}

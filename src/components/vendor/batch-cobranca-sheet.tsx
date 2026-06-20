"use client";

import { useMemo, useState } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import {
  buildCobrancaMessage,
  buildWhatsAppUrl,
  installmentToCobranca
} from "@/lib/sales/cobranca";
import { installmentDueBucket } from "@/lib/sales/receivables";
import type { ReceivableInstallment } from "@/lib/sales/receivables";

export function BatchCobrancaSheet({
  installments,
  onClose,
  store
}: {
  installments: ReceivableInstallment[];
  onClose: () => void;
  store: {
    name: string;
    pix_key?: string | null;
    pix_receiver_name?: string | null;
  };
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(installments.map((installment) => [installment.id, true]))
  );
  const [sending, setSending] = useState(false);
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});

  const selectedItems = useMemo(
    () => installments.filter((installment) => selected[installment.id]),
    [installments, selected]
  );

  const totalSelected = selectedItems.reduce((total, installment) => total + installment.amount, 0);

  const toggle = (installmentId: string) => {
    if (sending) {
      return;
    }

    setSelected((current) => ({
      ...current,
      [installmentId]: !current[installmentId]
    }));
  };

  const sendBatch = async () => {
    if (!selectedItems.length || sending) {
      return;
    }

    setSending(true);

    for (const installment of selectedItems) {
      const context = installmentToCobranca(installment, store);
      const message = buildCobrancaMessage(context);
      const url = buildWhatsAppUrl(context.customerPhone, message);

      window.open(url, "_blank", "noopener,noreferrer");
      setDoneIds((current) => ({ ...current, [installment.id]: true }));

      await new Promise((resolve) => window.setTimeout(resolve, 460));
    }

    window.setTimeout(onClose, 800);
  };

  return (
    <div className="vendor-sheet-backdrop" onClick={sending ? undefined : onClose} role="presentation">
      <div
        aria-labelledby="batch-cobranca-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="batch-cobranca-title">Cobranças do dia</h2>
          <button
            aria-label="Fechar"
            className="vendor-dashboard-icon-btn"
            disabled={sending}
            onClick={onClose}
            type="button"
          >
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          <p className="vendor-batch-cobranca-intro">
            Revise e dispare todas as cobranças de hoje de uma vez. Cada cliente recebe a mensagem
            com valor, vencimento e PIX.
          </p>

          {installments.map((installment) => {
            const on = !!selected[installment.id];
            const done = doneIds[installment.id];
            const bucket = installmentDueBucket(installment.due_date);

            return (
              <button
                className={`vendor-batch-cobranca-row ${on ? "is-selected" : ""} ${!on && !sending ? "is-dimmed" : ""}`}
                disabled={sending}
                key={installment.id}
                onClick={() => toggle(installment.id)}
                type="button"
              >
                <VendorAvatar
                  color={installment.customer.avatar_color}
                  label={getCustomerInitials(installment.customer.full_name)}
                  size={40}
                />
                <div className="vendor-batch-cobranca-row-copy">
                  <strong>{installment.customer.full_name}</strong>
                  <span>
                    {formatBRL(installment.amount)} ·{" "}
                    {bucket === "overdue" ? (
                      <em className="vendor-batch-cobranca-overdue">atrasada</em>
                    ) : (
                      "vence hoje"
                    )}
                  </span>
                </div>
                {sending || done ? (
                  <span aria-hidden="true" className="vendor-batch-cobranca-progress">
                    {done ? <VendorIcon name="check" size={20} stroke={2.6} /> : on ? "⏳" : "—"}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`vendor-batch-cobranca-check ${on ? "is-on" : ""}`}
                  >
                    {on ? <VendorIcon name="check" size={15} stroke={3} /> : null}
                  </span>
                )}
              </button>
            );
          })}

          <button
            className="vendor-cobranca-whats-btn vendor-batch-cobranca-send"
            disabled={!selectedItems.length || sending}
            onClick={sendBatch}
            type="button"
          >
            <VendorWhatsLogo size={17} />
            {sending
              ? "Enviando…"
              : `Enviar ${selectedItems.length} ${selectedItems.length === 1 ? "cobrança" : "cobranças"} · ${formatBRL(totalSelected)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

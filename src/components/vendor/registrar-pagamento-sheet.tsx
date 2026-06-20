"use client";

import { useState, useTransition } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import { markMultipleInstallmentsPaidAction } from "@/lib/sales/actions";
import { getInstallmentStatus } from "@/lib/sales/format";
import type { PaymentMethod, SaleInstallment } from "@/lib/sales/types";

const METODOS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: "pix", label: "PIX", icon: "pix" },
  { key: "card", label: "Cartão", icon: "cards" },
  { key: "cash", label: "Dinheiro", icon: "wallet" }
];

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

export function RegistrarPagamentoSheet({
  saleId,
  installments,
  defaultMethod,
  returnPath,
  onClose
}: {
  saleId: string;
  installments: SaleInstallment[];
  defaultMethod: PaymentMethod | null;
  returnPath: string;
  onClose: () => void;
}) {
  const unpaid = installments.filter((i) => !i.paid).sort((a, b) =>
    a.due_date.localeCompare(b.due_date)
  );
  const [sel, setSel] = useState<Record<string, boolean>>(() =>
    unpaid.length ? { [unpaid[0].id]: true } : {}
  );
  const [metodo, setMetodo] = useState<PaymentMethod>(defaultMethod ?? "cash");
  const [isPending, startTransition] = useTransition();

  const selecionadas = unpaid.filter((i) => sel[i.id]);
  const totalSel = selecionadas.reduce((sum, i) => sum + i.amount, 0);
  const allSelected = selecionadas.length === unpaid.length && unpaid.length > 0;

  const selectAll = () =>
    setSel(Object.fromEntries(unpaid.map((i) => [i.id, true])));

  const toggle = (id: string) =>
    setSel((prev) => ({ ...prev, [id]: !prev[id] }));

  const confirmar = () => {
    if (!selecionadas.length || isPending) return;
    startTransition(async () => {
      await markMultipleInstallmentsPaidAction(
        saleId,
        selecionadas.map((i) => i.id),
        metodo,
        returnPath
      );
    });
  };

  return (
    <>
      <div className="vendor-sheet-overlay" onClick={onClose} />
      <div className="vendor-sheet">
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <span className="vendor-sheet-title">Registrar pagamento</span>
          <button
            aria-label="Fechar"
            className="vendor-sheet-close"
            onClick={onClose}
            type="button"
          >
            <VendorIcon name="x" size={20} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          <p className="vendor-pagamento-desc">
            Marque as parcelas que o cliente já pagou. Se ele quitou tudo de
            uma vez, use &ldquo;Quitar dívida&rdquo;.
          </p>

          <button
            className="vendor-pagamento-quitar-btn"
            onClick={selectAll}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            Quitar dívida &middot;{" "}
            {formatBRL(unpaid.reduce((s, i) => s + i.amount, 0))}
          </button>

          <div className="vendor-pagamento-list">
            {unpaid.map((installment) => {
              const on = !!sel[installment.id];
              const status = getInstallmentStatus(installment);
              return (
                <div
                  className={`vendor-pagamento-item ${on ? "is-selected" : ""}`}
                  key={installment.id}
                  onClick={() => toggle(installment.id)}
                  role="checkbox"
                  aria-checked={on}
                >
                  <div className={`vendor-pagamento-check ${on ? "is-on" : ""}`}>
                    {on && <VendorIcon name="check" size={15} />}
                  </div>
                  <div className="vendor-pagamento-item-info">
                    <strong>{formatBRL(installment.amount)}</strong>
                    <span>
                      Parcela {installment.installment_number} &middot; vence{" "}
                      {formatDate(installment.due_date)}
                    </span>
                  </div>
                  {status === "overdue" ? (
                    <span className="vendor-pagamento-overdue">Atrasada</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="vendor-section-label" style={{ marginTop: 14 }}>
            Forma de pagamento
          </div>
          <div className="vendor-metodo-row">
            {METODOS.map(({ key, label, icon }) => (
              <button
                className={`vendor-metodo-btn ${metodo === key ? "is-active" : ""}`}
                key={key}
                onClick={() => setMetodo(key)}
                type="button"
              >
                <VendorIcon name={icon as Parameters<typeof VendorIcon>[0]["name"]} size={18} />
                {label}
              </button>
            ))}
          </div>

          <div style={{ height: 16 }} />

          <button
            className={`vendor-button vendor-button-primary vendor-button-lg ${!selecionadas.length || allSelected ? "" : ""}`}
            disabled={!selecionadas.length || isPending}
            onClick={confirmar}
            style={{ width: "100%", opacity: selecionadas.length ? 1 : 0.5 }}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {isPending
              ? "Registrando…"
              : `Confirmar recebimento${selecionadas.length ? ` · ${formatBRL(totalSel)}` : ""}`}
          </button>
          <div style={{ height: 8 }} />
        </div>
      </div>
    </>
  );
}

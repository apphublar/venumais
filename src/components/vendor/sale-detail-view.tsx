"use client";

import Link from "next/link";
import { useState } from "react";
import { VendorCard } from "@/components/vendor/card";
import { VendorCrediarioProgress } from "@/components/vendor/crediario-progress";
import { CobrancaSheet } from "@/components/vendor/cobranca-sheet";
import { OcorrenciaSheet } from "@/components/vendor/ocorrencia-sheet";
import { RegistrarPagamentoSheet } from "@/components/vendor/registrar-pagamento-sheet";
import { VendorSaleBadge } from "@/components/vendor/sale-badge";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { formatBRL } from "@/lib/products/format";
import { markInstallmentPaidAction } from "@/lib/sales/actions";
import { installmentToCobranca } from "@/lib/sales/cobranca";
import {
  getInstallmentStatus,
  getOpenAmount,
  getPaidAmount,
  getSaleProgress,
  getSaleStatus,
  PAYMENT_METHOD_LABELS
} from "@/lib/sales/format";
import type { OccurrenceType, PaymentMethod, SaleWithRelations } from "@/lib/sales/types";

const OC_META: Record<
  OccurrenceType,
  { label: string; icon: string; bg: string; fg: string }
> = {
  reclamacao: { label: "Reclamação", icon: "alert", bg: "#fef3c7", fg: "#92660b" },
  troca: { label: "Produto trocado", icon: "split", bg: "#dbeafe", fg: "#1e478f" },
  reembolso: { label: "Reembolsado", icon: "arrowDown", bg: "#fee2e2", fg: "#b1182a" }
};

const MODE_META = {
  cash: { label: "À vista", bg: "var(--vendor-green-50)", fg: "var(--vendor-green-700)", icon: "wallet" as const },
  installment: { label: "Crediário", bg: "#ede9fe", fg: "#6d28d9", icon: "cards" as const }
};

const METHOD_META: Record<PaymentMethod, { label: string; icon: string }> = {
  pix: { label: "PIX", icon: "pix" },
  card: { label: "Cartão", icon: "cards" },
  cash: { label: "Dinheiro", icon: "wallet" }
};

type Sheet = null | "pagamento" | "ocorrencia" | "cobranca";

export function SaleDetailView({
  sale,
  store,
  returnPath
}: {
  sale: SaleWithRelations;
  store: {
    name: string;
    pix_key?: string | null;
    pix_receiver_name?: string | null;
    slug?: string | null;
  };
  returnPath: string;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [cobrancaInstallmentId, setCobrancaInstallmentId] = useState<string | null>(null);

  const status = getSaleStatus(sale.installments);
  const openAmount = getOpenAmount(sale.installments);
  const paidAmount = getPaidAmount(sale.installments);
  const profit = sale.items.reduce(
    (total, item) => total + (item.unit_price - item.unit_cost) * item.quantity,
    0
  );
  const progress = getSaleProgress(sale.installments);
  const isInstallment = sale.payment_mode === "installment";

  const cobrancaInstallment = sale.installments.find(
    (i) => i.id === cobrancaInstallmentId
  );

  const occurrenceType = sale.occurrence_type as OccurrenceType | null;
  const ocMeta = occurrenceType ? OC_META[occurrenceType] : null;
  const hasOccurrence = !!occurrenceType;
  const ocLoss = sale.occurrence_loss ?? 0;
  const resultado = profit - ocLoss;
  const canResendConfirmation =
    isInstallment &&
    sale.confirmation_status !== "confirmed" &&
    !!store.slug &&
    !!sale.customer?.phone;

  const handleResendConfirmation = () => {
    if (!canResendConfirmation || !sale.customer) {
      return;
    }

    const firstName = sale.customer.full_name.split(" ")[0];
    const phone = "55" + sale.customer.phone.replace(/\D/g, "");
    const portalUrl = `${window.location.origin}/loja/${store.slug}`;
    const msg = `Oi, ${firstName}! Sua compra na ${store.name} está aguardando confirmação. Acesse seu portal para revisar e confirmar: ${portalUrl}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      {/* Badges row — status + mode + method */}
      <div className="vendor-sale-detail-badges">
        <VendorSaleBadge status={status} />
        <span
          className="vendor-sale-detail-mode-badge"
          style={{
            background: MODE_META[sale.payment_mode].bg,
            color: MODE_META[sale.payment_mode].fg
          }}
        >
          <VendorIcon name={MODE_META[sale.payment_mode].icon} size={13} />
          {sale.payment_mode === "installment"
            ? `Crediário ${sale.installments.length}x`
            : "À vista"}
        </span>
        {sale.payment_method && (
          <span className="vendor-sale-detail-method-badge">
            <VendorIcon
              name={METHOD_META[sale.payment_method].icon as Parameters<typeof VendorIcon>[0]["name"]}
              size={13}
            />
            {METHOD_META[sale.payment_method].label}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="vendor-sale-detail-actions">
        {openAmount > 0.001 && (
          <button
            className="vendor-button vendor-button-primary"
            onClick={() => setSheet("pagamento")}
            style={{ flex: 1 }}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            Registrar pagamento
          </button>
        )}
        <button
          className="vendor-button vendor-button-ghost"
          onClick={() => setSheet("ocorrencia")}
          style={{ flex: 1 }}
          type="button"
        >
          <VendorIcon name="alert" size={18} />
          {hasOccurrence ? "Editar ocorrência" : "Ocorrência"}
        </button>
      </div>

      {/* Occurrence card */}
      {hasOccurrence && ocMeta && (
        <div
          className="vendor-card vendor-oc-card"
          style={{ background: ocMeta.bg, borderColor: "transparent" }}
        >
          <div
            className="vendor-oc-card-icon"
            style={{ color: ocMeta.fg, background: "#fff" }}
          >
            <VendorIcon
              name={ocMeta.icon as Parameters<typeof VendorIcon>[0]["name"]}
              size={19}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="vendor-oc-card-header">
              <span className="vendor-oc-card-type" style={{ color: ocMeta.fg }}>
                {ocMeta.label}
              </span>
              {sale.occurrence_at && (
                <span className="vendor-oc-card-date" style={{ color: ocMeta.fg }}>
                  {new Date(sale.occurrence_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit"
                  })}
                </span>
              )}
            </div>
            {sale.occurrence_obs && (
              <p className="vendor-oc-card-obs">{sale.occurrence_obs}</p>
            )}
            {Array.isArray(sale.occurrence_products) && sale.occurrence_products.length > 0 && (
              <p className="vendor-oc-card-obs">
                Itens:{" "}
                {(sale.occurrence_products as string[])
                  .map((pid) => {
                    const item = sale.items.find(
                      (i) => i.product_id === pid || i.id === pid
                    );
                    return item?.product_name ?? null;
                  })
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <p
              className="vendor-oc-card-loss"
              style={{ color: ocLoss > 0 ? "#b1182a" : "var(--vendor-green-700)" }}
            >
              {ocLoss > 0
                ? `Prejuízo: ${formatBRL(ocLoss)}`
                : "Sem prejuízo"}
            </p>
          </div>
        </div>
      )}

      {/* Crediário progress */}
      {isInstallment && (
        <VendorCard className="vendor-detail-progress-card">
          <div className="vendor-crediario-progress-title">
            <span>Progresso do crediário</span>
            <strong>
              {progress.paidCount}/{progress.total}
            </strong>
          </div>
          <VendorCrediarioProgress installments={sale.installments} />
          <div className="vendor-crediario-stats">
            <div>
              <small>Pagas</small>
              <strong className="vendor-text-success">{progress.paidCount}</strong>
            </div>
            <div>
              <small>Faltam</small>
              <strong>{progress.remaining}</strong>
            </div>
            {progress.next && (
              <div style={{ textAlign: "right", flex: 1 }}>
                <small>Próxima a pagar</small>
                <strong
                  style={{
                    color:
                      progress.nextLabel === "Última parcela"
                        ? "#b45309"
                        : "var(--vendor-ink-1)"
                  }}
                >
                  {progress.nextLabel} &middot;{" "}
                  {new Date(
                    `${progress.next.due_date}T00:00:00`
                  ).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit"
                  })}
                </strong>
              </div>
            )}
          </div>
        </VendorCard>
      )}

      {/* Totals card */}
      <VendorCard className="vendor-sale-totals-card">
        <div>
          <span>Total</span>
          <strong>{formatBRL(sale.total_amount)}</strong>
        </div>
        <div>
          <span>Recebido</span>
          <strong className="vendor-text-success">{formatBRL(paidAmount)}</strong>
        </div>
        {openAmount > 0.001 && (
          <div>
            <span>Em aberto</span>
            <strong className={status === "overdue" ? "vendor-text-danger" : ""}>
              {formatBRL(openAmount)}
            </strong>
          </div>
        )}
        <div className="vendor-sale-totals-sep" />
        <div>
          <span>Lucro estimado</span>
          <strong className="vendor-text-success">{formatBRL(profit)}</strong>
        </div>
        {hasOccurrence && ocLoss > 0 && (
          <>
            <div>
              <span>Prejuízo</span>
              <strong className="vendor-text-danger">− {formatBRL(ocLoss)}</strong>
            </div>
            <div className="vendor-sale-totals-sep" />
            <div>
              <span>Resultado</span>
              <strong
                className={resultado >= 0 ? "vendor-text-success" : "vendor-text-danger"}
              >
                {formatBRL(resultado)}
              </strong>
            </div>
          </>
        )}
      </VendorCard>

      {/* Client confirmation banner */}
      {isInstallment && (
        <div className="vendor-sale-confirmation">
          {sale.confirmation_status === "confirmed" ? (
            <div className="vendor-sale-confirmation-ok">
              <VendorIcon name="check" size={15} stroke={2.6} />
              Confirmada pelo cliente
              {sale.confirmed_at
                ? ` em ${new Date(sale.confirmed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
                : ""}
            </div>
          ) : (
            <div className="vendor-sale-confirmation-pending">
              <VendorIcon name="clock" size={15} />
              <span>Aguardando confirmação</span>
              <button
                className="vendor-sale-reenviar-btn"
                disabled={!canResendConfirmation}
                onClick={handleResendConfirmation}
                type="button"
              >
                Reenviar link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="vendor-section-label">Itens</div>
      <div className="vendor-list">
        {sale.items.map((item) => (
          <VendorCard className="vendor-sale-item-card" key={item.id}>
            <div>
              <strong>{item.product_name}</strong>
              <span>
                {item.quantity} × {formatBRL(item.unit_price)}
              </span>
            </div>
            <strong>{formatBRL(item.unit_price * item.quantity)}</strong>
          </VendorCard>
        ))}
      </div>

      {/* Installments */}
      {sale.installments.length > 0 && (
        <>
          <div className="vendor-section-label">Parcelas</div>
          <div className="vendor-list">
            {sale.installments.map((installment) => {
              const instStatus = getInstallmentStatus(installment);
              const isToday = !installment.paid && installment.due_date === new Date().toISOString().slice(0, 10);
              const numClass = installment.paid
                ? "vendor-installment-num vendor-installment-paid"
                : instStatus === "overdue"
                  ? "vendor-installment-num vendor-installment-overdue"
                  : isToday
                    ? "vendor-installment-num vendor-installment-today"
                    : "vendor-installment-num vendor-installment-open";

              const payAction = markInstallmentPaidAction.bind(
                null,
                sale.id,
                installment.id,
                (sale.payment_method ?? "cash") as PaymentMethod,
                returnPath
              );

              return (
                <VendorCard className="vendor-installment-row" key={installment.id}>
                  <div className={numClass}>
                    {installment.installment_number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong className="vendor-installment-row-amount">
                      {formatBRL(installment.amount)}
                    </strong>
                    <span className="vendor-installment-row-date">
                      Vence{" "}
                      {new Date(
                        `${installment.due_date}T00:00:00`
                      ).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit"
                      })}
                    </span>
                  </div>
                  {installment.paid ? (
                    <div className="vendor-installment-row-paid">
                      <span className="vendor-status-badge vendor-status-badge-paid">
                        <span aria-hidden className="vendor-status-badge-dot" />
                        Pago
                        {installment.payment_method
                          ? ` · ${PAYMENT_METHOD_LABELS[installment.payment_method]}`
                          : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="vendor-installment-row-actions">
                      <form action={payAction}>
                        <button
                          className="vendor-installment-recebi-btn"
                          type="submit"
                        >
                          <VendorIcon name="check" size={14} stroke={2.6} />
                          Recebi
                        </button>
                      </form>
                      <button
                        className="vendor-installment-cobrar-btn"
                        onClick={() => {
                          setCobrancaInstallmentId(installment.id);
                          setSheet("cobranca");
                        }}
                        type="button"
                      >
                        <VendorWhatsLogo size={13} />
                        Cobrar
                      </button>
                    </div>
                  )}
                </VendorCard>
              );
            })}
          </div>
        </>
      )}

      {/* Notes */}
      {sale.notes && (
        <>
          <div className="vendor-section-label">Observações</div>
          <VendorCard className="vendor-detail-info">
            <p>{sale.notes}</p>
          </VendorCard>
        </>
      )}

      {/* Footer links */}
      <div className="vendor-sale-footer-links">
        <Link
          className="vendor-button vendor-button-ghost"
          href={`/painel/vendas/${sale.id}/recibo`}
        >
          <VendorIcon name="receipt" size={18} />
          Ver recibo
        </Link>
        {sale.customer_id && (
          <Link
            className="vendor-button vendor-button-primary"
            href={`/painel/vendas/nova?cliente=${sale.customer_id}`}
          >
            Nova venda
          </Link>
        )}
      </div>

      {/* Sheets */}
      {sheet === "pagamento" && (
        <RegistrarPagamentoSheet
          defaultMethod={sale.payment_method}
          installments={sale.installments}
          onClose={() => setSheet(null)}
          returnPath={returnPath}
          saleId={sale.id}
        />
      )}
      {sheet === "ocorrencia" && (
        <OcorrenciaSheet
          onClose={() => setSheet(null)}
          returnPath={returnPath}
          sale={sale}
        />
      )}
      {sheet === "cobranca" && cobrancaInstallment && sale.customer && (
        <CobrancaSheet
          context={installmentToCobranca(
            {
              id: cobrancaInstallment.id,
              sale_id: sale.id,
              installment_number: cobrancaInstallment.installment_number,
              due_date: cobrancaInstallment.due_date,
              amount: cobrancaInstallment.amount,
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
          installmentId={cobrancaInstallment.id}
          installmentStatus={
            getInstallmentStatus(cobrancaInstallment) === "overdue" ? "overdue" : "open"
          }
          onClose={() => {
            setSheet(null);
            setCobrancaInstallmentId(null);
          }}
          onPaid={() => {
            setSheet(null);
            setCobrancaInstallmentId(null);
          }}
        />
      )}
    </>
  );
}

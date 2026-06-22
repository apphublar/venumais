"use client";

import Link from "next/link";
import { useState } from "react";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { formatCustomerAddress } from "@/lib/customers/address";
import { formatBRL } from "@/lib/products/format";
import {
  formatSaleCode,
  formatSaleDate,
  formatShortDate,
  getInstallmentStatus
} from "@/lib/sales/format";
import {
  getAccountChangeRequestLabel,
  type CustomerAccountChangeRequest
} from "@/lib/customers/account-requests.types";
import type { Customer } from "@/lib/database/types";
import type { SaleWithRelations } from "@/lib/sales/types";

const STATUS_CLASS: Record<string, string> = {
  paid: "vendor-installment-paid",
  open: "vendor-installment-open",
  overdue: "vendor-installment-overdue"
};

export function CustomerDetailView({
  accountChangeRequests = [],
  customer,
  deleteAction,
  paymentSummary,
  sales
}: {
  accountChangeRequests?: CustomerAccountChangeRequest[];
  customer: Customer;
  deleteAction: () => Promise<void>;
  paymentSummary: {
    owed_amount: number;
    paid_amount: number;
    overdue: boolean;
  };
  sales: SaleWithRelations[];
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const addressLabel = formatCustomerAddress(customer);
  return (
    <section className="vendor-screen-body">
      <VendorCard className="vendor-detail-metrics vendor-detail-metrics-single">
        <div>
          <span>Saldo devedor</span>
          <strong className={paymentSummary.overdue ? "vendor-text-danger" : undefined}>
            {formatBRL(paymentSummary.owed_amount)}
          </strong>
        </div>
        <div>
          <span>Já pago</span>
          <strong className="vendor-text-success">{formatBRL(paymentSummary.paid_amount)}</strong>
        </div>
      </VendorCard>

      {(addressLabel || customer.notes) && (
        <VendorCard className="vendor-detail-info">
          {addressLabel ? (
            <p>
              <VendorIcon name="homePin" size={17} />
              <span>{addressLabel}</span>
            </p>
          ) : null}
          {customer.notes ? (
            <p>
              <VendorIcon name="doc" size={17} />
              <span>{customer.notes}</span>
            </p>
          ) : null}
        </VendorCard>
      )}

      <div className="vendor-detail-actions">
        <Link
          className="vendor-button vendor-button-primary"
          href={`/painel/vendas/nova?cliente=${customer.id}`}
        >
          <VendorIcon name="plus" size={18} />
          Nova venda
        </Link>
        <Link className="vendor-button vendor-button-ghost" href={`/painel/vendas?cliente=${customer.id}`}>
          <VendorIcon name="receipt" size={18} />
          Extrato
        </Link>
      </div>

      <VendorSectionLabel>
        Histórico · {sales.length} {sales.length === 1 ? "venda" : "vendas"}
      </VendorSectionLabel>

      {sales.length ? (
        sales.map((sale) => {
          const installmentSale = sale.payment_mode === "installment";

          return (
            <VendorCard className="vendor-customer-sale-card" key={sale.id}>
              <div className="vendor-customer-sale-head">
                <div>
                  <strong>Venda #{formatSaleCode(sale.sale_code)}</strong>
                  <span>{formatSaleDate(sale.sold_at)}</span>
                </div>
                <span
                  className={
                    installmentSale
                      ? "vendor-customer-sale-mode-installment"
                      : "vendor-customer-sale-mode-cash"
                  }
                >
                  {installmentSale ? `${sale.installments.length}x` : "À vista"}
                </span>
              </div>

              {installmentSale && sale.confirmation_status === "pending" ? (
                <div className="vendor-customer-sale-pending">
                  <VendorIcon name="clock" size={14} />
                  <span>Aguardando confirmação</span>
                </div>
              ) : null}

              {installmentSale && sale.confirmation_status === "confirmed" ? (
                <div className="vendor-customer-sale-confirmed">
                  <VendorIcon name="check" size={14} stroke={2.6} />
                  <span>
                    Confirmada pelo cliente
                    {sale.confirmed_at ? ` em ${formatShortDate(sale.confirmed_at.slice(0, 10))}` : ""}
                  </span>
                </div>
              ) : null}

              <div className="vendor-customer-sale-installments">
                {sale.installments.map((installment) => {
                  const status = getInstallmentStatus(installment);

                  return (
                    <Link
                      className="vendor-customer-sale-installment"
                      href={`/painel/vendas/${sale.id}`}
                      key={installment.id}
                    >
                      <span className={`vendor-installment-num ${STATUS_CLASS[status] ?? ""}`}>
                        {installment.installment_number}
                      </span>
                      <span className="vendor-customer-sale-installment-date">
                        {formatShortDate(installment.due_date)}
                      </span>
                      <strong>{formatBRL(installment.amount)}</strong>
                      <span className={`vendor-agenda-status vendor-agenda-status-${status}`}>
                        {status === "paid" ? "Paga" : status === "overdue" ? "Atrasada" : "Em aberto"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </VendorCard>
          );
        })
      ) : (
        <VendorCard className="vendor-empty vendor-empty-compact">
          <strong>Sem vendas ainda</strong>
          <p>Quando você registrar vendas, o histórico aparecerá aqui.</p>
        </VendorCard>
      )}

      {accountChangeRequests.length ? (
        <>
          <VendorSectionLabel>Solicitações do portal</VendorSectionLabel>
          {accountChangeRequests.map((request) => (
            <VendorCard className="vendor-customer-request-card" key={request.id}>
              <strong>{getAccountChangeRequestLabel(request.request_type)}</strong>
              {request.message ? <p>{request.message}</p> : null}
              <span>
                {new Date(request.requested_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </VendorCard>
          ))}
        </>
      ) : null}

      <VendorSectionLabel>Zona de risco</VendorSectionLabel>
      {!deleteConfirm ? (
        <button
          className="vendor-button vendor-button-danger vendor-button-danger-full"
          onClick={() => setDeleteConfirm(true)}
          type="button"
        >
          <VendorIcon name="trash" size={18} />
          Excluir cliente
        </button>
      ) : (
        <VendorCard className="vendor-delete-confirm">
          <p>
            Excluir <b>{customer.full_name}</b>? Isso remove o cliente e todo o histórico de vendas e
            parcelas dele. Esta ação não pode ser desfeita.
          </p>
          <div className="vendor-delete-confirm-actions">
            <button
              className="vendor-button vendor-button-ghost"
              onClick={() => setDeleteConfirm(false)}
              type="button"
            >
              Cancelar
            </button>
            <form action={deleteAction}>
              <button className="vendor-button vendor-button-danger" type="submit">
                <VendorIcon name="trash" size={18} />
                Excluir
              </button>
            </form>
          </div>
        </VendorCard>
      )}
    </section>
  );
}

export function CustomerDetailHeader({
  customer,
  whatsappHref
}: {
  customer: Customer;
  whatsappHref?: string;
}) {
  return (
    <header className="vendor-screen-header">
      <div className="vendor-screen-header-main">
        <Link aria-label="Voltar" className="vendor-page-back" href="/painel/clientes">
          <VendorIcon name="chevL" size={20} />
        </Link>
        <div>
          <h1>{customer.full_name}</h1>
          <p>{customer.phone}</p>
        </div>
      </div>
      {whatsappHref ? (
        <a
          aria-label="WhatsApp"
          className="vendor-icon-button vendor-icon-button-whats"
          href={whatsappHref}
          rel="noreferrer"
          target="_blank"
        >
          <VendorWhatsLogo size={19} />
        </a>
      ) : null}
    </header>
  );
}

"use client";

import { VendorIcon } from "@/components/vendor/icon";
import { formatShortDate } from "@/lib/sales/format";

export function ClientPaymentProofRecord({
  label = "Seu comprovante enviado",
  name,
  reportedAt,
  subtitle,
  url
}: {
  label?: string;
  name?: string | null;
  reportedAt?: string | null;
  subtitle?: string;
  url: string;
}) {
  return (
    <div className="client-payment-proof-record">
      <div className="client-payment-proof-record-icon">
        <VendorIcon name="receipt" size={22} />
      </div>
      <div className="client-payment-proof-record-copy">
        <strong>{label}</strong>
        <span>{name ?? "Comprovante anexado"}</span>
        {subtitle ? <small>{subtitle}</small> : null}
        {reportedAt ? <small>Enviado em {formatShortDate(reportedAt)}</small> : null}
      </div>
      <a className="client-payment-proof-record-link" href={url} rel="noopener noreferrer" target="_blank">
        Ver
      </a>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import { confirmCustomerSaleAction } from "@/lib/client/actions";
import { formatBRL } from "@/lib/products/format";
import { formatShortDate } from "@/lib/sales/format";
import type { PortalSaleDetail, PublicStore } from "@/lib/client/queries";

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function ClientConfirmarCompra({
  onClose,
  onGoPay,
  onToast,
  sale,
  store
}: {
  onClose: () => void;
  onGoPay: () => void;
  onToast: (message: string) => void;
  sale: PortalSaleDetail;
  store: PublicStore;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(sale.confirmation_status === "confirmed");
  const supportMessage = `Oi! Sou cliente da ${store.name} e preciso de ajuda com o pedido #${String(
    sale.sale_code
  ).padStart(4, "0")}.`;

  const contactSeller = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(supportMessage)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await confirmCustomerSaleAction(store.id, store.slug, sale.id);

      if (result.error) {
        onToast(result.error);
        return;
      }

      setDone(true);
      onToast("Compra confirmada ✓");
      router.refresh();
    });
  };

  if (done) {
    return (
      <ClientOverlay>
        <div className="client-confirm-success">
          <span className="client-confirm-success-icon">
            <VendorIcon name="check" size={44} stroke={2.6} />
          </span>
          <h2>Compra confirmada!</h2>
          <p>
            Confirmado em {formatShortDate(new Date().toISOString().slice(0, 10))}. Esse registro
            fica como comprovante do acordo entre você e a {store.name}.
          </p>
          <button
            className="vendor-button vendor-button-primary"
            onClick={() => {
              onClose();
              onGoPay();
            }}
            type="button"
          >
            Ver minhas parcelas
          </button>
        </div>
      </ClientOverlay>
    );
  }

  return (
    <ClientOverlay>
      <ClientScreenHeader
        onBack={onClose}
        subtitle={`Pedido #${String(sale.sale_code).padStart(4, "0")} · ${formatLongDate(sale.sold_at)}`}
        title="Confirmar compra"
      />
      <div className="client-screen-body">
        <VendorCard className="client-confirm-intro">
          <VendorIcon name="receipt" size={18} />
          <p>
            A <b>{store.name}</b> registrou esta compra. Revise os itens e o parcelamento e confirme
            que está tudo certo.
          </p>
        </VendorCard>

        <VendorSectionLabel>Itens</VendorSectionLabel>
        {sale.items.map((item) => (
          <VendorCard className="client-confirm-item" key={`${item.product_name}-${item.quantity}`}>
            <div>
              <strong>{item.product_name}</strong>
              <span>
                {item.quantity} × {formatBRL(item.unit_price)}
              </span>
            </div>
            <strong>{formatBRL(item.unit_price * item.quantity)}</strong>
          </VendorCard>
        ))}

        <VendorCard className="client-confirm-total">
          <span>
            Total · {sale.payment_mode === "installment" ? `${sale.installments.length}x` : "à vista"}
          </span>
          <strong>{formatBRL(sale.total_amount)}</strong>
        </VendorCard>

        <VendorSectionLabel>Parcelas</VendorSectionLabel>
        {sale.installments.map((installment) => (
          <div className="client-confirm-installment" key={installment.id}>
            <span>{installment.installment_number}</span>
            <div>
              <VendorIcon name="calendar" size={14} />
              Vence {formatShortDate(installment.due_date)}
            </div>
            <strong>{formatBRL(installment.amount)}</strong>
          </div>
        ))}
      </div>

      <div className="client-overlay-footer">
        <button
          className="vendor-button vendor-button-primary"
          disabled={pending}
          onClick={confirm}
          type="button"
        >
          <VendorIcon name="check" size={18} />
          Confirmo esta compra
        </button>
        <button
          className="client-confirm-support"
          onClick={contactSeller}
          type="button"
        >
          Algo está errado? Falar com a vendedora
        </button>
      </div>
    </ClientOverlay>
  );
}

"use client";

import Link from "next/link";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorCrediarioProgress } from "@/components/vendor/crediario-progress";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorOrderOriginTag } from "@/components/vendor/order-origin-tag";
import { getVendorOrderPaymentBadge } from "@/lib/client/order-status";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import { formatShortDate } from "@/lib/sales/format";
import type { VendorStoreOrder } from "@/lib/client/queries";
import type { SaleInstallment } from "@/lib/sales/types";

function orderStatusLabel(order: VendorStoreOrder) {
  if (order.order_type === "wholesale") {
    return { label: "Encomenda", tone: "wholesale" as const };
  }
  if (order.status === "quote" || order.order_type === "quote") {
    return { label: "Orçamento", tone: "quote" as const };
  }
  if (order.status === "awaiting_installment_approval") {
    return { label: "Parcelado", tone: "new" as const };
  }
  return { label: "Novo pedido", tone: "new" as const };
}

export function VendorOrderRow({ order }: { order: VendorStoreOrder }) {
  const status = orderStatusLabel(order);
  const installment = order.payment_mode === "installment";
  const installmentCount = order.installments?.length ?? 0;
  const paymentBadge = getVendorOrderPaymentBadge(order);
  const showQuoteBadge =
    order.status === "quote" ||
    order.order_type === "quote" ||
    order.order_type === "wholesale";

  return (
    <Link href={`/painel/pedidos/${order.id}`}>
      <VendorCard className="vendor-order-row">
        <div className="vendor-order-row-main">
          <VendorAvatar
            color={order.customer_avatar_color}
            label={getCustomerInitials(order.customer_full_name)}
            size={42}
            square
          />
          <div className="vendor-order-row-copy">
            <strong>{order.customer_full_name}</strong>
            <span>
              #{String(order.order_code).padStart(4, "0")} · {order.item_count}{" "}
              {order.item_count === 1 ? "item" : "itens"} · {formatShortDate(order.created_at)}
              {installment && installmentCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <em className="vendor-sale-row-installment">{installmentCount}x</em>
                </>
              ) : null}
            </span>
          </div>
          {showQuoteBadge ? (
            <span className={`vendor-order-status vendor-order-status-${status.tone}`}>
              {status.label}
            </span>
          ) : (
            <div className="vendor-order-row-side">
              <strong>
                {order.total_amount !== null ? formatBRL(order.total_amount) : "A combinar"}
              </strong>
              <span className={`vendor-sale-badge ${paymentBadge.className} vendor-sale-badge-small`.trim()}>
                <span aria-hidden="true" className="vendor-sale-badge-dot" />
                {paymentBadge.label}
              </span>
            </div>
          )}
        </div>

        <div className="vendor-order-row-meta">
          <VendorOrderOriginTag small source={order.source} />
          <span className="vendor-order-delivery">
            <VendorIcon name={order.delivery_type === "delivery" ? "truck" : "store"} size={12} />
            {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
          </span>
          {order.edited_at ? (
            <span className="vendor-order-edited">
              <VendorIcon name="edit" size={11} /> Editado pelo cliente
            </span>
          ) : null}
        </div>

        {installment && order.installments?.length && order.installment_plan_status === "approved" ? (
          <VendorCrediarioProgress installments={order.installments as SaleInstallment[]} />
        ) : null}
      </VendorCard>
    </Link>
  );
}

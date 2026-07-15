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
import { formatSaleDate } from "@/lib/sales/format";
import type { VendorStoreOrder } from "@/lib/client/queries";
import type { SaleInstallment } from "@/lib/sales/types";

export function VendorOrderRow({ order }: { order: VendorStoreOrder }) {
  const installment = order.payment_mode === "installment";
  const installmentCount = order.installments?.length ?? 0;
  const paymentBadge = getVendorOrderPaymentBadge(order);
  const showQuoteBadge =
    order.status === "quote" ||
    order.order_type === "quote" ||
    order.order_type === "wholesale";
  const quoteLabel =
    order.order_type === "wholesale"
      ? "Encomenda"
      : order.status === "quote" || order.order_type === "quote"
        ? "Orçamento"
        : "Novo pedido";

  return (
    <Link href={`/painel/pedidos/${order.id}`}>
      <VendorCard className="vendor-sale-row">
        <div className="vendor-sale-row-main">
          <VendorAvatar
            color={order.customer_avatar_color}
            label={getCustomerInitials(order.customer_full_name)}
            size={42}
          />
          <div className="vendor-sale-row-copy">
            <strong>{order.customer_full_name}</strong>
            <span>
              #{String(order.order_code).padStart(4, "0")} · {formatSaleDate(order.created_at)} ·{" "}
              {order.item_count} {order.item_count === 1 ? "item" : "itens"} ·{" "}
              <em className={installment && installmentCount > 0 ? "vendor-sale-row-installment" : "vendor-sale-row-cash"}>
                {installment && installmentCount > 0 ? `${installmentCount}x` : "À vista"}
              </em>
            </span>
          </div>
          {showQuoteBadge ? (
            <div className="vendor-sale-row-side">
              <strong>
                {order.total_amount !== null ? formatBRL(order.total_amount) : "A combinar"}
              </strong>
              <span className={`vendor-order-status vendor-order-status-${order.order_type === "wholesale" ? "wholesale" : order.status === "quote" || order.order_type === "quote" ? "quote" : "new"}`}>
                {quoteLabel}
              </span>
            </div>
          ) : (
            <div className="vendor-sale-row-side">
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

        <div className="vendor-sale-row-meta">
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

"use client";

import Link from "next/link";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatShortDate } from "@/lib/sales/format";
import type { VendorStoreOrder } from "@/lib/client/queries";

function orderStatusLabel(order: VendorStoreOrder) {
  if (order.status === "payment_review") {
    return { label: "Comprovante", tone: "quote" as const };
  }
  if (order.status === "awaiting_payment") {
    return { label: "Aguardando pagto", tone: "quote" as const };
  }
  if (order.status === "paid") {
    return { label: "Pago", tone: "new" as const };
  }
  if (order.status === "delivering") {
    return { label: "Em entrega", tone: "new" as const };
  }
  if (order.status === "delivered") {
    return { label: "Entregue", tone: "new" as const };
  }
  if (order.order_type === "wholesale") {
    return { label: "Encomenda", tone: "wholesale" as const };
  }

  if (order.status === "quoted" || order.status === "quote" || order.order_type === "quote") {
    return { label: "Orçamento", tone: "quote" as const };
  }

  return { label: "Novo pedido", tone: "new" as const };
}

export function VendorOrderRow({ order }: { order: VendorStoreOrder }) {
  const status = orderStatusLabel(order);
  const fromVendor = order.source === "vendor" || order.source === "seller";

  return (
    <Link href={`/painel/pedidos/${order.id}`}>
      <VendorCard className="vendor-order-row">
      <div className="vendor-order-row-head">
        <VendorAvatar
          color={order.customer_avatar_color}
          label={getCustomerInitials(order.customer_full_name)}
          size={42}
        />
        <div className="vendor-order-row-copy">
          <strong>{order.customer_full_name}</strong>
          <span>
            #{order.order_code} · {order.item_count}{" "}
            {order.item_count === 1 ? "item" : "itens"} · {formatShortDate(order.created_at)}
          </span>
        </div>
        <span className={`vendor-order-status vendor-order-status-${status.tone}`}>
          {status.label}
        </span>
      </div>

      <div className="vendor-order-row-meta">
        <span className="vendor-order-origin">
          <VendorIcon name={fromVendor ? "store" : "user"} size={11} />{" "}
          {fromVendor ? "Pelo vendedor" : "Pelo cliente"}
        </span>
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
    </VendorCard>
    </Link>
  );
}

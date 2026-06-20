"use client";

import Link from "next/link";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
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

function orderProgressMeta(order: VendorStoreOrder) {
  if (order.status === "delivered") {
    return { percent: 100, left: "Pedido concluído", right: "Entregue", done: true };
  }
  if (order.status === "delivering") {
    return { percent: 88, left: "Pedido em entrega", right: "Em rota", done: false };
  }
  if (order.status === "paid") {
    return { percent: 76, left: "Pagamento confirmado", right: "Pago", done: false };
  }
  if (order.status === "payment_review") {
    return { percent: 62, left: "Comprovante enviado", right: "Em análise", done: false };
  }
  if (order.status === "awaiting_payment") {
    return { percent: 48, left: "Aguardando pagamento", right: "Pagamento", done: false };
  }
  if (order.status === "quoted" || order.status === "quote") {
    return { percent: 30, left: "Orçamento enviado", right: "Aguardando", done: false };
  }
  return { percent: 14, left: "Novo pedido recebido", right: "Novo", done: false };
}

export function VendorOrderRow({ order }: { order: VendorStoreOrder }) {
  const status = orderStatusLabel(order);
  const progress = orderProgressMeta(order);
  const fromVendor = order.source === "vendor" || order.source === "seller";
  const amountLabel =
    order.total_amount === null ? "Sob orçamento" : formatBRL(order.total_amount);
  const originLabel = fromVendor ? "Pela loja" : "Via catálogo";

  return (
    <Link href={`/painel/pedidos/${order.id}`}>
      <VendorCard className="vendor-order-row">
        <div className="vendor-order-row-main">
          <VendorAvatar
            color={order.customer_avatar_color}
            label={getCustomerInitials(order.customer_full_name)}
            size={42}
          />
          <div className="vendor-order-row-copy">
            <strong>{order.customer_full_name}</strong>
            <span>
              #{String(order.order_code).padStart(4, "0")} · {formatShortDate(order.created_at)} ·{" "}
              {order.item_count} {order.item_count === 1 ? "item" : "itens"}
            </span>
          </div>
          <div className="vendor-order-row-side">
            <strong>{amountLabel}</strong>
            <span className={`vendor-order-status vendor-order-status-${status.tone}`}>
              {status.label}
            </span>
          </div>
        </div>

        <div className="vendor-order-row-meta">
          <span className="vendor-order-origin">
            <VendorIcon name={fromVendor ? "store" : "box"} size={11} /> {originLabel}
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

        <div className="vendor-order-progress">
          <div className="vendor-crediario-progress-track">
            <div
              className={`vendor-crediario-progress-fill ${progress.done ? "vendor-crediario-progress-fill-done" : ""}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="vendor-crediario-progress-meta">
            <span>{progress.left}</span>
            <span className={progress.done ? "vendor-crediario-progress-next" : "vendor-crediario-progress-next-warn"}>
              {progress.right}
            </span>
          </div>
        </div>
      </VendorCard>
    </Link>
  );
}

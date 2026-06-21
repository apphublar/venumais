"use client";

import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorIcon } from "@/components/vendor/icon";
import type { OrderDetailView } from "@/lib/client/actions";
import { formatBRL } from "@/lib/products/format";
import type { PublicStore } from "@/lib/client/queries";

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function paymentLabel(method: string | null) {
  if (method === "pix") return "PIX";
  if (method === "card") return "Cartão";
  if (method === "cash") return "Dinheiro";
  return "—";
}

export function ClientOrderRecibo({
  onClose,
  order,
  store
}: {
  onClose: () => void;
  order: OrderDetailView;
  store: PublicStore;
}) {
  const subtotal = order.subtotal_amount ?? order.total_amount ?? 0;
  const discount = order.discount_amount ?? 0;
  const total = order.total_amount ?? 0;
  const receiptDate = order.paid_at ?? order.created_at;

  const shareText = [
    `*${store.name}*`,
    `Recibo do pedido #${String(order.order_code).padStart(4, "0")}`,
    formatLongDate(receiptDate),
    "",
    ...order.items.map(
      (item) =>
        `${item.quantity}x ${item.product_name} — ${formatBRL((item.unit_price ?? 0) * item.quantity)}`
    ),
    discount > 0 ? `\nDesconto: -${formatBRL(discount)}` : "",
    `\n*Total: ${formatBRL(total)}*`,
    `Pagamento: ${paymentLabel(order.customer_payment_method)}`,
    order.delivery_type === "delivery" ? "Entrega" : "Retirada"
  ]
    .filter(Boolean)
    .join("\n");

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <ClientOverlay>
      <ClientScreenHeader
        action={
          <button
            aria-label="Imprimir recibo"
            className="client-icon-button"
            onClick={() => window.print()}
            type="button"
          >
            <VendorIcon name="print" size={19} />
          </button>
        }
        onBack={onClose}
        subtitle={formatLongDate(receiptDate)}
        title={`Recibo #${String(order.order_code).padStart(4, "0")}`}
      />

      <div className="client-screen-body vendor-recibo-screen">
        <div className="vendor-recibo-paper">
          <div className="vendor-recibo-brand">
            <VendorBrandMark label={store.name} radius={13} size={48} />
            <div>
              <strong>{store.name}</strong>
              <span>{store.slug}.venumais.app</span>
            </div>
            <div className="vendor-recibo-brand-meta">
              <small>RECIBO</small>
              <strong>#{String(order.order_code).padStart(4, "0")}</strong>
            </div>
          </div>

          <div className="vendor-recibo-body">
            <div className="vendor-recibo-meta">
              <small>Data</small>
              <strong>{formatLongDate(receiptDate)}</strong>
              <span>{order.delivery_type === "delivery" ? "Entrega" : "Retirada"}</span>
            </div>

            <div className="vendor-recibo-items">
              {order.items.map((item) => (
                <div className="vendor-recibo-item" key={item.id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>
                      {item.quantity}x · {formatBRL(item.unit_price ?? 0)}
                    </span>
                  </div>
                  <strong>{formatBRL((item.unit_price ?? 0) * item.quantity)}</strong>
                </div>
              ))}
            </div>

            {discount > 0 ? (
              <div className="vendor-recibo-total-line">
                <span>Subtotal</span>
                <strong>{formatBRL(subtotal)}</strong>
              </div>
            ) : null}
            {discount > 0 ? (
              <div className="vendor-recibo-total-line">
                <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                <strong>− {formatBRL(discount)}</strong>
              </div>
            ) : null}

            <div className="vendor-recibo-grand-total">
              <span>Total pago</span>
              <strong>{formatBRL(total)}</strong>
            </div>

            <div className="vendor-recibo-delivery">
              <VendorIcon
                name={order.customer_payment_method === "card" ? "cards" : order.customer_payment_method === "cash" ? "wallet" : "pix"}
                size={16}
              />
              Pagamento via {paymentLabel(order.customer_payment_method)}
            </div>

            {order.notes?.trim() ? (
              <p className="vendor-recibo-thanks" style={{ textAlign: "left" }}>
                Obs.: {order.notes.trim()}
              </p>
            ) : null}

            <p className="vendor-recibo-thanks">Obrigado pela preferência!</p>
          </div>
        </div>

        <div className="vendor-recibo-actions">
          <a className="vendor-cobranca-whats-btn" href={shareUrl} rel="noreferrer" target="_blank">
            <VendorIcon name="share" size={18} />
            Compartilhar
          </a>
        </div>
      </div>
    </ClientOverlay>
  );
}

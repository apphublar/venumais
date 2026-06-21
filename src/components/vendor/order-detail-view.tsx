"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { ProductThumb } from "@/components/vendor/product-thumb";
import {
  approveStoreOrderAction,
  confirmStoreOrderPaymentAction,
  setStoreOrderPaymentLinkAction,
  updateStoreOrderDeliveryAction
} from "@/lib/client/order-actions";
import { formatCustomerAddress, type StoreOrderDetail } from "@/lib/client/order-types";
import { getOrderStatusMeta, PAYMENT_META } from "@/lib/client/order-status";
import { getCustomerInitials } from "@/lib/customers/format";
import { brStr } from "@/lib/sales/format";
import { formatBRL, parseBRL } from "@/lib/products/format";

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function orderTitle(order: StoreOrderDetail) {
  const code = String(order.order_code).padStart(4, "0");
  if (order.order_type === "wholesale") {
    return `Encomenda #${code}`;
  }

  if (
    ["quote", "quote_answered", "quoted"].includes(order.status) ||
    order.order_type === "quote"
  ) {
    return `Orçamento #${code}`;
  }

  return `Pedido #${code}`;
}

export function OrderDetailView({
  order,
  storeId
}: {
  order: StoreOrderDetail;
  storeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((item) => [
        item.id,
        item.unit_price !== null ? brStr(item.unit_price) : ""
      ])
    )
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(order.expected_delivery_date ?? "");
  const [trackingCode, setTrackingCode] = useState(order.tracking_code ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [paymentLink, setPaymentLink] = useState(order.vendor_payment_link ?? "");
  const [paymentMessage, setPaymentMessage] = useState(order.vendor_payment_message ?? "");

  const needsPricing = order.items.some((item) => item.unit_price === null);
  const isQuote =
    ["quote", "quote_answered", "quoted"].includes(order.status) || order.order_type === "quote";
  const isWholesale = order.order_type === "wholesale";
  const fromVendor = order.source === "vendor" || order.source === "seller";
  const address = formatCustomerAddress(order.customer);
  const awaitingPayment = [
    "awaiting_payment",
    "awaiting_card",
    "cash_on_delivery",
    "payment_review"
  ].includes(order.status);
  const paymentReview = order.status === "payment_review";
  const isPaid = order.status === "paid" || order.status === "delivering" || order.status === "delivered";
  const isAwaitingCard = order.status === "awaiting_card";
  const needsCardLink =
    order.status === "awaiting_payment" &&
    order.customer_payment_method === "card" &&
    !order.vendor_payment_link;
  const paymentMethod = order.customer_payment_method;
  const paymentInformed = (order as StoreOrderDetail & { payment_informed?: boolean }).payment_informed ?? false;

  const total = useMemo(
    () =>
      order.items.reduce((sum, item) => {
        const unit = parseBRL(prices[item.id] ?? "0");
        return sum + unit * item.quantity;
      }, 0),
    [order.items, prices]
  );

  const complete = order.items.every((item) => parseBRL(prices[item.id] ?? "0") > 0);

  const approve = () => {
    if (!complete) {
      setError("Defina todos os preços para aprovar.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await approveStoreOrderAction(
        storeId,
        order.id,
        order.items.map((item) => ({
          id: item.id,
          unitPrice: parseBRL(prices[item.id] ?? "0")
        }))
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      router.push("/painel/pedidos");
    });
  };

  const confirmPayment = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmStoreOrderPaymentAction(storeId, order.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const updateDelivery = (status: "paid" | "delivering" | "delivered") => {
    setError(null);
    startTransition(async () => {
      const result = await updateStoreOrderDeliveryAction({
        storeId,
        orderId: order.id,
        status,
        expectedDeliveryDate,
        deliveredAt: status === "delivered" ? new Date().toISOString() : undefined,
        trackingCode,
        trackingUrl
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const savePaymentLink = () => {
    startTransition(async () => {
      const result = await setStoreOrderPaymentLinkAction({
        storeId,
        orderId: order.id,
        paymentLink,
        paymentMessage
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <section className="vendor-order-detail">
        <div className="vendor-order-detail-tags">
          <span className="vendor-order-origin">
            <VendorIcon name={fromVendor ? "store" : "box"} size={11} />
            {fromVendor ? "Pela loja" : "Via catálogo"}
          </span>
          <span className="vendor-order-delivery">
            <VendorIcon name={order.delivery_type === "delivery" ? "truck" : "store"} size={12} />
            {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
          </span>
          {isWholesale ? (
            <span className="vendor-order-status vendor-order-status-wholesale">Encomenda atacado</span>
          ) : null}
          {(() => {
            const s = order.status;
            const m = getOrderStatusMeta(s);
            return (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: m.bg,
                  color: m.fg,
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 11.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap"
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot }} />
                {m.label}
              </span>
            );
          })()}
        </div>

        <VendorCard className="vendor-order-detail-customer">
          <VendorAvatar
            color={order.customer.avatar_color}
            label={getCustomerInitials(order.customer.full_name)}
            size={48}
            square
          />
          <div>
            <strong>{order.customer.full_name}</strong>
            <span>{order.customer.phone}</span>
            <span>{formatOrderDate(order.created_at)}</span>
          </div>
        </VendorCard>

        {order.delivery_type === "delivery" ? (
          <VendorCard
            className={`vendor-order-detail-address ${address ? "" : "vendor-order-detail-address-warn"}`}
          >
            <VendorIcon name={address ? "home" : "alert"} size={17} />
            <div>
              <strong>Endereço de entrega</strong>
              <span>
                {address ||
                  "Cliente ainda não cadastrou. Ao aprovar, ele recebe o recibo e um aviso para cadastrar o endereço."}
              </span>
            </div>
          </VendorCard>
        ) : null}

        {order.notes ? (
          <VendorCard className="vendor-order-detail-notes">
            <VendorIcon name="doc" size={18} />
            <div>
              <strong>Observação do cliente</strong>
              <span>&ldquo;{order.notes}&rdquo;</span>
            </div>
          </VendorCard>
        ) : null}

        {/* ── Seção PAGAMENTO (apenas para pedidos finalizados via catálogo) ── */}
        {awaitingPayment || isPaid || isAwaitingCard ? (
          <>
            <div className="vendor-section-label">Pagamento</div>

            {/* Bloco de método + status */}
            <VendorCard className="vendor-order-detail-notes">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--green-50)",
                  color: "var(--green-700)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0
                }}
              >
                <VendorIcon
                  name={
                    paymentMethod
                      ? (PAYMENT_META[paymentMethod]?.icon as "pix" | "wallet" | "cards") ?? "wallet"
                      : "wallet"
                  }
                  size={21}
                />
              </div>
              <div>
                <strong>
                  {paymentMethod ? PAYMENT_META[paymentMethod]?.label ?? "Pagamento" : "A definir"}
                </strong>
                <span>
                  {paymentMethod === "pix" &&
                    (paymentInformed ? "Cliente informou o pagamento" : "Aguardando o cliente pagar")}
                  {paymentMethod === "cash" && "Combine o valor com o cliente"}
                  {paymentMethod === "card" && !order.vendor_payment_link && "Gere o link de pagamento abaixo"}
                  {paymentMethod === "card" &&
                    order.vendor_payment_link &&
                    (paymentInformed ? "Cliente pagou no cartão" : "Link enviado, aguardando pagamento")}
                  {isPaid && " · Pagamento confirmado"}
                </span>
              </div>
            </VendorCard>

            {/* Comprovante PIX (thumbnail xadrez) */}
            {paymentMethod === "pix" && order.payment_proof_url ? (
              <VendorCard className="vendor-order-detail-notes" style={{ marginTop: 8 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    background:
                      "repeating-linear-gradient(45deg,#e8edea 0 8px,#f4f7f5 8px 16px)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    color: "var(--vendor-ink-3)"
                  }}
                >
                  <VendorIcon name="receipt" size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "0.85rem" }}>
                    {order.payment_proof_name ?? "Comprovante PIX"}
                  </strong>
                  <span style={{ fontSize: "0.75rem" }}>Anexado pelo cliente</span>
                </div>
                <a
                  href={order.payment_proof_url}
                  rel="noopener noreferrer"
                  style={{
                    background: "var(--green-50)",
                    color: "var(--green-700)",
                    border: "none",
                    borderRadius: 999,
                    padding: "7px 13px",
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: "pointer",
                    textDecoration: "none",
                    whiteSpace: "nowrap"
                  }}
                  target="_blank"
                >
                  Ver
                </a>
              </VendorCard>
            ) : null}

            {/* Link de cartão gerado */}
            {paymentMethod === "card" && order.vendor_payment_link ? (
              <VendorCard
                className="vendor-order-detail-notes"
                style={{ marginTop: 8 }}
              >
                <VendorIcon name="cards" size={18} style={{ color: "#6d28d9", flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    color: "var(--vendor-ink-2)",
                    fontWeight: 600,
                    fontFamily: "monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {order.vendor_payment_link}
                </span>
              </VendorCard>
            ) : null}

            {/* Formulário para gerar link de cartão */}
            {needsCardLink ? (
              <VendorCard className="vendor-order-delivery-box" style={{ marginTop: 8 }}>
                <strong>Gerar link de pagamento (cartão)</strong>
                <div className="vendor-order-delivery-grid">
                  <label className="vendor-field">
                    <span>URL do link</span>
                    <input
                      onChange={(e) => setPaymentLink(e.target.value)}
                      placeholder="https://..."
                      value={paymentLink}
                    />
                  </label>
                  <label className="vendor-field">
                    <span>Mensagem opcional</span>
                    <input
                      onChange={(e) => setPaymentMessage(e.target.value)}
                      placeholder="Ex.: Link válido por 24h"
                      value={paymentMessage}
                    />
                  </label>
                </div>
              </VendorCard>
            ) : null}
          </>
        ) : order.customer_payment_method ? (
          <VendorCard className="vendor-order-detail-notes">
            <VendorIcon name="wallet" size={18} />
            <div>
              <strong>Pagamento escolhido pelo cliente</strong>
              <span>
                {order.customer_payment_method === "pix"
                  ? "PIX"
                  : order.customer_payment_method === "card"
                    ? "Cartão"
                    : "Dinheiro"}
                {order.customer_payment_note ? ` · ${order.customer_payment_note}` : ""}
              </span>
            </div>
          </VendorCard>
        ) : null}

        {isWholesale ? (
          <VendorCard className="vendor-order-detail-wholesale-note">
            <VendorIcon name="truck" size={18} />
            <p>
              O cliente quer que você <b>compre estes itens no atacado</b> para ele. Confira o valor e
              defina os preços antes de responder.
            </p>
          </VendorCard>
        ) : null}

        <div className="vendor-section-label">
          Itens · {isWholesale ? "preço de atacado" : needsPricing ? "informe os preços" : "valores"}
        </div>

        <div className="vendor-order-detail-items">
          {order.items.map((item) => {
            const showPriceInput = needsPricing || isQuote;

            return (
              <VendorCard className="vendor-order-detail-item" key={item.id}>
                <ProductThumb
                  product={{
                    name: item.product_name,
                    thumb_color: item.thumb_color ?? "#e9d5ff",
                    image_url: item.image_url ?? null
                  }}
                  size={48}
                />
                <div className="vendor-order-detail-item-copy">
                  <strong>{item.product_name}</strong>
                  <span>
                    Qtd: {item.quantity}
                    {!item.price_visible && !isWholesale ? (
                      <em> · definir preço</em>
                    ) : null}
                  </span>
                </div>
                {showPriceInput ? (
                  <label className="vendor-order-detail-price-input">
                    <span>R$</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        setPrices((current) => ({
                          ...current,
                          [item.id]: event.target.value.replace(/[^\d.,]/g, "")
                        }))
                      }
                      placeholder="0,00"
                      value={prices[item.id] ?? ""}
                    />
                  </label>
                ) : (
                  <strong>{formatBRL((item.unit_price ?? 0) * item.quantity)}</strong>
                )}
              </VendorCard>
            );
          })}
        </div>

        <VendorCard className="vendor-order-detail-total">
          <span>Total {isWholesale ? "da encomenda" : isQuote ? "do orçamento" : "do pedido"}</span>
          <strong>{formatBRL(total)}</strong>
        </VendorCard>

        {isPaid ? (
          <VendorCard className="vendor-order-delivery-box">
            <strong>Entrega e rastreio</strong>
            <div className="vendor-order-delivery-grid">
              <label className="vendor-field">
                <span>Data estimada</span>
                <input
                  onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                  type="date"
                  value={expectedDeliveryDate}
                />
              </label>
              <label className="vendor-field">
                <span>Código de rastreio</span>
                <input
                  onChange={(event) => setTrackingCode(event.target.value)}
                  placeholder="Ex.: BR123456789"
                  value={trackingCode}
                />
              </label>
              <label className="vendor-field">
                <span>Link de rastreio</span>
                <input
                  onChange={(event) => setTrackingUrl(event.target.value)}
                  placeholder="https://..."
                  value={trackingUrl}
                />
              </label>
            </div>
          </VendorCard>
        ) : null}

        {error ? (
          <p className="vendor-message vendor-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <div className="vendor-order-detail-footer">
        {needsPricing || isQuote ? (
          /* Enviar orçamento / precificação */
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending || !complete}
            onClick={approve}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Enviando…" : "Aprovar e enviar ao cliente"}
          </button>
        ) : isPaid ? (
          /* Pago: ações de entrega */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <VendorIcon name="check-circle" size={19} style={{ color: "var(--green-700)" }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--green-700)" }}>Pedido pago</span>
          </div>
        ) : needsCardLink ? (
          /* Cartão: gerar link (sem link ainda) */
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending || !paymentLink.trim()}
            onClick={savePaymentLink}
            type="button"
          >
            <VendorIcon name="cards" size={18} />
            {pending ? "Salvando…" : "Gerar link de pagamento"}
          </button>
        ) : awaitingPayment ? (
          /* Qualquer estado aguardando: Marcar como pago */
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending}
            onClick={confirmPayment}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Confirmando…" : "Marcar como pago"}
          </button>
        ) : order.status === "new" || order.status === "quote" ? (
          /* Aguardando cliente */
          <button className="vendor-button vendor-button-ghost vendor-button-full" disabled type="button">
            Aguardando o cliente finalizar o pedido
          </button>
        ) : (
          <Link
            className="vendor-button vendor-button-primary vendor-button-full"
            href={`/painel/vendas/nova?cliente=${order.customer.id}`}
          >
            <VendorIcon name="plus" size={18} />
            Registrar venda para este pedido
          </Link>
        )}
      </div>
    </>
  );
}

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
  if (order.order_type === "wholesale") {
    return `Encomenda #${order.order_code}`;
  }

  if ((order.status === "quoted" || order.status === "quote") || order.order_type === "quote") {
    return `Orçamento #${order.order_code}`;
  }

  return `Pedido #${order.order_code}`;
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
  const isQuote = order.status === "quoted" || order.status === "quote" || order.order_type === "quote";
  const isWholesale = order.order_type === "wholesale";
  const fromVendor = order.source === "vendor" || order.source === "seller";
  const address = formatCustomerAddress(order.customer);
  const awaitingPayment = order.status === "awaiting_payment";
  const paymentReview = order.status === "payment_review";
  const isPaid = order.status === "paid" || order.status === "delivering" || order.status === "delivered";

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
          <span className="vendor-order-status vendor-order-status-new">
            {order.status === "new" && "Novo pedido"}
            {(order.status === "quoted" || order.status === "quote") && "Orçamento enviado"}
            {order.status === "awaiting_payment" && "Aguardando pagamento"}
            {order.status === "payment_review" && "Comprovante enviado"}
            {order.status === "paid" && "Pago"}
            {order.status === "delivering" && "Em entrega"}
            {order.status === "delivered" && "Entregue"}
          </span>
        </div>

        <VendorCard className="vendor-order-detail-customer">
          <VendorAvatar
            color={order.customer.avatar_color}
            label={getCustomerInitials(order.customer.full_name)}
            size={48}
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

        {order.customer_payment_method ? (
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

        {awaitingPayment && order.customer_payment_method === "card" ? (
          <VendorCard className="vendor-order-delivery-box">
            <strong>Link de pagamento (cartão)</strong>
            <div className="vendor-order-delivery-grid">
              <label className="vendor-field">
                <span>URL do pagamento</span>
                <input
                  onChange={(event) => setPaymentLink(event.target.value)}
                  placeholder="https://..."
                  value={paymentLink}
                />
              </label>
              <label className="vendor-field">
                <span>Mensagem opcional</span>
                <input
                  onChange={(event) => setPaymentMessage(event.target.value)}
                  placeholder="Ex.: Link válido por 24h"
                  value={paymentMessage}
                />
              </label>
              <button className="vendor-button vendor-button-ghost" disabled={pending} onClick={savePaymentLink} type="button">
                Salvar link
              </button>
            </div>
          </VendorCard>
        ) : null}

        {order.payment_proof_url ? (
          <VendorCard className="vendor-order-detail-notes">
            <VendorIcon name="doc" size={18} />
            <div>
              <strong>Comprovante enviado</strong>
              <span>{order.payment_proof_name ?? "Comprovante do pedido"}</span>
              <a href={order.payment_proof_url} rel="noopener noreferrer" target="_blank">
                Abrir comprovante
              </a>
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
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending || !complete}
            onClick={approve}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Enviando…" : "Enviar orçamento ao cliente"}
          </button>
        ) : paymentReview ? (
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending}
            onClick={confirmPayment}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Confirmando..." : "Confirmar pagamento"}
          </button>
        ) : isPaid ? (
          <div className="vendor-order-delivery-actions">
            <button className="vendor-button vendor-button-ghost" disabled={pending} onClick={() => updateDelivery("delivering")} type="button">
              Em entrega
            </button>
            <button className="vendor-button vendor-button-primary" disabled={pending} onClick={() => updateDelivery("delivered")} type="button">
              Marcar entregue
            </button>
          </div>
        ) : awaitingPayment ? (
          <button className="vendor-button vendor-button-ghost vendor-button-full" disabled type="button">
            Aguardando envio do comprovante
          </button>
        ) : order.status === "new" ? (
          <button className="vendor-button vendor-button-ghost vendor-button-full" disabled type="button">
            Aguardando cliente finalizar pedido
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

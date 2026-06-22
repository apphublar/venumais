"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { VendorCrediarioProgress } from "@/components/vendor/crediario-progress";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorOrderOriginTag } from "@/components/vendor/order-origin-tag";
import { ProductThumb } from "@/components/vendor/product-thumb";
import {
  approveStoreOrderAction,
  approveStoreOrderInstallmentPlanAction,
  confirmStoreOrderInstallmentPaymentAction,
  confirmStoreOrderPaymentAction,
  rejectStoreOrderInstallmentPlanAction,
  setStoreOrderInstallmentPaymentLinkAction,
  setStoreOrderPaymentLinkAction
} from "@/lib/client/order-actions";
import { formatCustomerAddress, type StoreOrderDetail } from "@/lib/client/order-types";
import { getOrderStatusMeta, PAYMENT_META } from "@/lib/client/order-status";
import { brStr, formatShortDate } from "@/lib/sales/format";
import type { SaleInstallment } from "@/lib/sales/types";
import { formatBRL, parseBRL } from "@/lib/products/format";

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
  const [paymentLink, setPaymentLink] = useState(order.vendor_payment_link ?? "");
  const [paymentMessage, setPaymentMessage] = useState(order.vendor_payment_message ?? "");
  const [garantia, setGarantia] = useState("");

  const needsPricing = order.items.some((item) => item.unit_price === null);
  const isQuote =
    ["quote", "quote_answered", "quoted"].includes(order.status) || order.order_type === "quote";
  const isWholesale = order.order_type === "wholesale";
  const isPricingScreen = needsPricing || isQuote || isWholesale;
  const address = formatCustomerAddress(order.customer);
  const awaitingPayment = [
    "awaiting_payment",
    "awaiting_card",
    "cash_on_delivery",
    "payment_review"
  ].includes(order.status);
  const isPaid = order.status === "paid" || order.status === "delivering" || order.status === "delivered";
  const isAwaitingCard = order.status === "awaiting_card";
  const paymentMethod = order.customer_payment_method;
  const paymentInformed = order.payment_informed ?? false;
  const isInstallment = order.payment_mode === "installment";
  const awaitingInstallmentApproval = order.status === "awaiting_installment_approval";
  const nextUnpaidInstallment = order.installments.find((installment) => !installment.paid);
  const needsCardLink =
    !isInstallment &&
    order.status === "awaiting_payment" &&
    order.customer_payment_method === "card" &&
    !order.vendor_payment_link;
  const needsInstallmentFullCardLink =
    isInstallment &&
    order.installment_card_mode === "full" &&
    order.status === "awaiting_payment" &&
    order.customer_payment_method === "card" &&
    !order.vendor_payment_link;

  const total = useMemo(
    () =>
      order.items.reduce((sum, item) => {
        const unit = parseBRL(prices[item.id] ?? "0");
        return sum + unit * item.quantity;
      }, 0),
    [order.items, prices]
  );

  const complete = order.items.every((item) => parseBRL(prices[item.id] ?? "0") > 0);
  const garantiaAmount = parseBRL(garantia);

  const sendGarantia = () => {
    if (!complete) {
      setError("Defina todos os preços para enviar.");
      return;
    }
    if (garantiaAmount <= 0) {
      setError("Informe o valor de garantia.");
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
        })),
        `Garantia: ${formatBRL(garantiaAmount)}`
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      router.push("/painel/pedidos");
    });
  };

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

  const approveInstallmentPlan = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveStoreOrderInstallmentPlanAction(storeId, order.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const rejectInstallmentPlan = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectStoreOrderInstallmentPlanAction(storeId, order.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/painel/pedidos");
    });
  };

  const confirmInstallmentPayment = (installmentId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await confirmStoreOrderInstallmentPaymentAction(storeId, order.id, installmentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const saveInstallmentPaymentLink = (installmentId: string, link: string, message: string) => {
    startTransition(async () => {
      const result = await setStoreOrderInstallmentPaymentLinkAction({
        storeId,
        orderId: order.id,
        installmentId,
        paymentLink: link,
        paymentMessage: message
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
          <VendorOrderOriginTag source={order.source} />
          <span className="vendor-order-delivery">
            <VendorIcon name={order.delivery_type === "delivery" ? "truck" : "store"} size={12} />
            {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
          </span>
          {isWholesale ? (
            <span className="vendor-order-status vendor-order-status-wholesale">Encomenda atacado</span>
          ) : null}
          {!isPricingScreen ? (() => {
            const m = getOrderStatusMeta(order.status);
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
          })() : null}
        </div>

        {order.delivery_type === "delivery" ? (
          <VendorCard
            className={`vendor-order-detail-address ${address ? "" : "vendor-order-detail-address-warn"}`}
          >
            <VendorIcon name={address ? "home" : "alert"} size={17} />
            <div className="vendor-order-detail-notice-copy">
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
            <div className="vendor-order-detail-notice-copy">
              <strong>Observação do cliente</strong>
              <span>&ldquo;{order.notes}&rdquo;</span>
            </div>
          </VendorCard>
        ) : null}

        {isWholesale ? (
          <VendorCard className="vendor-order-detail-wholesale-note">
            <VendorIcon name="truck" size={18} />
            <p>
              O cliente quer que você <b>compre estes itens no atacado</b> para ele. Confira o valor e
              defina a <b>garantia</b> para iniciar a compra.
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
                  <span className="vendor-order-detail-item-price">
                    {formatBRL((item.unit_price ?? 0) * item.quantity)}
                  </span>
                )}
              </VendorCard>
            );
          })}
        </div>

        <VendorCard className="vendor-order-detail-total">
          <span>Total {isWholesale ? "da encomenda" : isQuote ? "do orçamento" : "do pedido"}</span>
          <strong>{formatBRL(total)}</strong>
        </VendorCard>

        {isWholesale && isPricingScreen ? (
          <>
            <div className="vendor-section-label">Valor de garantia</div>
            <p className="vendor-order-garantia-hint">
              Valor que o cliente paga adiantado para você comprar a mercadoria. Sugestão: 30–50% do total.
            </p>
            <div className="vendor-order-garantia-row">
              <label className="vendor-order-garantia-input">
                <span>R$</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setGarantia(event.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="0,00"
                  value={garantia}
                />
              </label>
              <button
                className="vendor-order-garantia-suggest"
                onClick={() => setGarantia(brStr(Math.round(total * 0.4 * 100) / 100))}
                type="button"
              >
                40%
              </button>
            </div>
          </>
        ) : null}

        {awaitingInstallmentApproval && order.installments.length ? (
          <>
            <div className="vendor-section-label">Plano parcelado solicitado</div>
            <VendorCard className="vendor-order-detail-subcard">
              <div className="vendor-order-detail-notice-copy">
                <strong>Cliente pediu pagamento parcelado</strong>
                <span>
                  Revise as datas abaixo e autorize para liberar o pagamento
                  {paymentMethod === "pix"
                    ? " via PIX"
                    : paymentMethod === "cash"
                      ? " em dinheiro"
                      : " no cartão"}
                  .
                </span>
              </div>
            </VendorCard>
            <div className="vendor-order-installment-review">
              {order.installments.map((installment) => (
                <VendorCard className="vendor-order-installment-review-row" key={installment.id}>
                  <span className="vendor-installment-badge">{installment.installment_number}</span>
                  <div>
                    <strong>{formatBRL(installment.amount)}</strong>
                    <span>Vence {formatShortDate(installment.due_date)}</span>
                  </div>
                </VendorCard>
              ))}
            </div>
          </>
        ) : null}

        {isInstallment && order.installment_plan_status === "approved" && order.installments.length ? (
          <>
            <div className="vendor-section-label">Parcelas do pedido</div>
            <VendorCrediarioProgress installments={order.installments as SaleInstallment[]} />
            {order.installments.map((installment) => (
              <VendorCard className="vendor-order-installment-review-row" key={installment.id}>
                <span className="vendor-installment-badge">{installment.installment_number}</span>
                <div className="vendor-order-detail-notice-copy">
                  <strong>{formatBRL(installment.amount)}</strong>
                  <span>
                    Vence {formatShortDate(installment.due_date)}
                    {installment.paid ? " · Paga" : installment.payment_informed ? " · Cliente informou pagamento" : ""}
                  </span>
                </div>
                {installment.payment_proof_url ? (
                  <a
                    className="vendor-button vendor-button-ghost"
                    href={installment.payment_proof_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Ver comprovante
                  </a>
                ) : null}
                {!installment.paid && installment.payment_informed ? (
                  <button
                    className="vendor-button vendor-button-primary"
                    disabled={pending}
                    onClick={() => confirmInstallmentPayment(installment.id!)}
                    type="button"
                  >
                    Confirmar parcela
                  </button>
                ) : null}
                {!installment.paid &&
                paymentMethod === "card" &&
                order.installment_card_mode === "per_installment" ? (
                  <div className="vendor-order-delivery-grid" style={{ width: "100%", marginTop: 8 }}>
                    <label className="vendor-field">
                      <span>Link da parcela {installment.installment_number}</span>
                      <input
                        defaultValue={installment.vendor_payment_link ?? ""}
                        id={`installment-link-${installment.id}`}
                        placeholder="https://..."
                      />
                    </label>
                    <button
                      className="vendor-button vendor-button-ghost"
                      disabled={pending}
                      onClick={() => {
                        const input = document.getElementById(
                          `installment-link-${installment.id}`
                        ) as HTMLInputElement | null;
                        saveInstallmentPaymentLink(installment.id!, input?.value ?? "", "");
                      }}
                      type="button"
                    >
                      Salvar link
                    </button>
                  </div>
                ) : null}
              </VendorCard>
            ))}
          </>
        ) : null}

        {awaitingPayment || isPaid || isAwaitingCard ? (
          <>
            <div className="vendor-section-label">Pagamento</div>

            <VendorCard className="vendor-order-detail-payment">
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
              <div className="vendor-order-detail-payment-copy">
                <strong>
                  {paymentMethod ? PAYMENT_META[paymentMethod]?.label ?? "Pagamento" : "A definir"}
                </strong>
                <span>
                  {paymentMethod === "pix" &&
                    (paymentInformed ? "Cliente informou o pagamento" : "Aguardando o cliente pagar")}
                  {paymentMethod === "cash" && "Combine o pagamento com o cliente"}
                  {paymentMethod === "card" && !order.vendor_payment_link && "Gere o link de pagamento abaixo"}
                  {paymentMethod === "card" &&
                    order.vendor_payment_link &&
                    (paymentInformed ? "Cliente pagou no cartão" : "Link enviado, aguardando pagamento")}
                  {isPaid && " · Pagamento confirmado"}
                </span>
              </div>
            </VendorCard>

            {order.payment_proof_url ? (
              <VendorCard className="vendor-order-detail-subcard">
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
                <div className="vendor-order-detail-notice-copy">
                  <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--vendor-ink-1)" }}>
                    {order.payment_proof_name ??
                      (paymentMethod === "card"
                        ? "Comprovante de cartão"
                        : paymentMethod === "pix"
                          ? "Comprovante PIX"
                          : "Comprovante de pagamento")}
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
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}
                  target="_blank"
                >
                  Ver
                </a>
              </VendorCard>
            ) : null}

            {paymentInformed && !isPaid ? (
              <VendorCard
                className="vendor-order-detail-subcard"
                style={{ background: "var(--green-50)", borderColor: "var(--green-600)" }}
              >
                <VendorIcon name="check-circle" size={20} style={{ color: "var(--green-700)", flexShrink: 0 }} />
                <div className="vendor-order-detail-notice-copy">
                  <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--green-700)" }}>
                    Cliente informou o pagamento
                  </strong>
                  <span style={{ fontSize: "0.75rem" }}>
                    Confira o comprovante e confirme o recebimento abaixo.
                  </span>
                </div>
              </VendorCard>
            ) : null}

            {paymentMethod === "card" && order.vendor_payment_link ? (
              <VendorCard className="vendor-order-detail-subcard">
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

            {needsCardLink ? (
              <VendorCard className="vendor-order-delivery-box">
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
          <VendorCard className="vendor-order-detail-payment">
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
              <VendorIcon name="wallet" size={21} />
            </div>
            <div className="vendor-order-detail-payment-copy">
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

        {error ? (
          <p className="vendor-message vendor-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <div className="vendor-order-detail-footer">
        {isWholesale && isPricingScreen ? (
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending || !complete || garantiaAmount <= 0}
            onClick={sendGarantia}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Enviando…" : "Enviar garantia ao cliente"}
          </button>
        ) : needsPricing || isQuote ? (
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
        ) : awaitingInstallmentApproval ? (
          <div style={{ display: "grid", gap: 10 }}>
            <button
              className="vendor-button vendor-button-primary vendor-button-full"
              disabled={pending}
              onClick={approveInstallmentPlan}
              type="button"
            >
              <VendorIcon name="check" size={18} />
              {pending ? "Autorizando…" : "Autorizar parcelamento"}
            </button>
            <button
              className="vendor-button vendor-button-danger vendor-button-full"
              disabled={pending}
              onClick={rejectInstallmentPlan}
              type="button"
            >
              <VendorIcon name="x" size={18} />
              Recusar parcelamento
            </button>
          </div>
        ) : isPaid ? (
          /* Pago: ações de entrega */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <VendorIcon name="check-circle" size={19} style={{ color: "var(--green-700)" }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--green-700)" }}>Pedido pago</span>
          </div>
        ) : needsCardLink || needsInstallmentFullCardLink ? (
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
        ) : awaitingPayment && !isInstallment ? (
          /* À vista: Marcar como pago */
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending}
            onClick={confirmPayment}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Confirmando…" : "Marcar como pago"}
          </button>
        ) : isInstallment &&
          order.installment_plan_status === "approved" &&
          nextUnpaidInstallment?.payment_informed ? (
          <button
            className="vendor-button vendor-button-primary vendor-button-full"
            disabled={pending}
            onClick={() => confirmInstallmentPayment(nextUnpaidInstallment.id!)}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {pending ? "Confirmando…" : `Confirmar parcela ${nextUnpaidInstallment.installment_number}`}
          </button>
        ) : awaitingPayment ? (
          <button className="vendor-button vendor-button-ghost vendor-button-full" disabled type="button">
            Aguardando pagamento do cliente
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

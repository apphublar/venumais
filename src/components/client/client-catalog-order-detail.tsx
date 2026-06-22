"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { ClientOrderRecibo } from "@/components/client/client-order-recibo";
import { ClientPaymentProofRecord } from "@/components/client/client-payment-proof-record";
import { ClientPixPaymentBlock } from "@/components/client/client-pix-payment-block";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import { formatShortDate } from "@/lib/sales/format";
import {
  getPortalOrderDetailForViewAction,
  informOrderInstallmentPaymentAction,
  informOrderPaymentAction,
  finalizeClientOrderWithPaymentAction,
  cancelClientOrderAction,
  type OrderDetailView
} from "@/lib/client/actions";
import {
  getOrderStatusMeta,
  isOrderCancellable,
  isOrderEditable,
  isOrderReceiptAvailable,
  isQuoteAnswered,
  getNextUnpaidInstallment
} from "@/lib/client/order-status";
import type { PortalOrder, PublicProduct, PublicStore } from "@/lib/client/queries";

type PaymentMethod = "pix" | "cash" | "card";

function PedidoStatusBadge({ status }: { status: string }) {
  const m = getOrderStatusMeta(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: m.bg,
        color: m.fg,
        borderRadius: 999,
        padding: "4px 11px",
        fontSize: 12.5,
        fontWeight: 800,
        whiteSpace: "nowrap"
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }}
      />
      {m.label}
    </span>
  );
}

export function ClientCatalogOrderDetail({
  order: initialOrder,
  products,
  storeId,
  storeSlug,
  store,
  onClose,
  onEdit,
  onRefresh
}: {
  order: PortalOrder;
  products: PublicProduct[];
  storeId: string;
  storeSlug: string;
  store: PublicStore;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh: () => void;
}) {
  const [detail, setDetail] = useState<OrderDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechando, setFechando] = useState(false);
  const [desistir, setDesistir] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [pgto, setPgto] = useState<PaymentMethod>("pix");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [cardLinkOpened, setCardLinkOpened] = useState(false);
  const [cardReceiptFile, setCardReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getPortalOrderDetailForViewAction(storeId, initialOrder.id).then((res) => {
      if (res.order) setDetail(res.order);
      setLoading(false);
    });
  }, [storeId, initialOrder.id]);

  const order = detail;
  const status = order?.status ?? initialOrder.status;
  const paymentMethod = (order?.customer_payment_method ?? initialOrder.customer_payment_method) as PaymentMethod | null;
  const total = order?.total_amount ?? initialOrder.total_amount ?? 0;
  const paymentInformed = order?.payment_informed ?? initialOrder.payment_informed ?? false;
  const isInstallment = order?.payment_mode === "installment";
  const nextInstallment = getNextUnpaidInstallment(order?.installments ?? []);
  const installmentProofs = (order?.installments ?? []).filter((installment) => installment.payment_proof_url);

  const handleInformInstallmentPayment = () => {
    if (!nextInstallment?.id) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("storeId", storeId);
      fd.append("storeSlug", storeSlug);
      fd.append("orderId", initialOrder.id);
      fd.append("installmentId", nextInstallment.id!);
      if (receiptFile) fd.append("receipt", receiptFile);
      const res = await informOrderInstallmentPaymentAction(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      const refreshed = await getPortalOrderDetailForViewAction(storeId, initialOrder.id);
      if (refreshed.order) setDetail(refreshed.order);
      onRefresh();
    });
  };

  const getItemProduct = (productId: string | null) => {
    if (!productId) return null;
    return products.find((product) => product.id === productId) ?? null;
  };

  const handleInformPayment = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("storeId", storeId);
      fd.append("storeSlug", storeSlug);
      fd.append("orderId", initialOrder.id);
      if (receiptFile) fd.append("receipt", receiptFile);
      const res = await informOrderPaymentAction(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      onRefresh();
      onClose();
    });
  };

  const handleOpenCardLink = () => {
    if (order?.vendor_payment_link) {
      window.open(order.vendor_payment_link, "_blank", "noopener noreferrer");
    }
    setCardLinkOpened(true);
    setError(null);
  };

  const handleInformCard = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("storeId", storeId);
      fd.append("storeSlug", storeSlug);
      fd.append("orderId", initialOrder.id);
      if (cardReceiptFile) fd.append("receipt", cardReceiptFile);
      const res = await informOrderPaymentAction(fd);
      if (res.error) setError(res.error);
      else { onRefresh(); onClose(); }
    });
  };

  const handleFecharOrcamento = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("storeId", storeId);
      fd.append("storeSlug", storeSlug);
      fd.append("orderId", initialOrder.id);
      fd.append("paymentMethod", pgto);
      fd.append("paymentNote", "");
      if (pgto === "pix" && receiptFile) fd.append("receipt", receiptFile);
      const res = await finalizeClientOrderWithPaymentAction(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      onRefresh();
      onClose();
    });
  };

  const handleDesistir = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelClientOrderAction({ storeId, storeSlug, orderId: initialOrder.id });
      if (res.error) {
        setError(res.error);
        return;
      }
      onRefresh();
      onClose();
    });
  };

  const handleCancelOrder = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelClientOrderAction({ storeId, storeSlug, orderId: initialOrder.id });
      if (res.error) {
        setError(res.error);
        return;
      }
      onRefresh();
      onClose();
    });
  };

  const canEdit = isOrderEditable(status) && Boolean(onEdit);
  const canCancel = isOrderCancellable(status) && status !== "cancelled";
  const canViewReceipt = isOrderReceiptAvailable(status) && Boolean(order);

  const pixReceiptControl = (
    <label className={`client-pay-receipt ${receiptFile ? "is-attached" : ""}`}>
      <input
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />
      <VendorIcon name={receiptFile ? "check" : "share"} size={24} />
      <span>{receiptFile ? receiptFile.name : "Anexar comprovante (opcional)"}</span>
    </label>
  );

  const formattedDate = new Date(initialOrder.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  if (showReceipt && order) {
    return <ClientOrderRecibo onClose={() => setShowReceipt(false)} order={order} store={store} />;
  }

  return (
    <ClientOverlay>
      <ClientScreenHeader
        onBack={onClose}
        subtitle={`${formattedDate} · ${initialOrder.delivery_type === "delivery" ? "Entrega" : "Retirada"}`}
        title={`Pedido #${String(initialOrder.order_code).padStart(4, "0")}`}
      />

      {loading ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--client-ink-3)", fontSize: "0.85rem" }}>
          Carregando…
        </div>
      ) : (
        <>
          <div className="client-screen-body">
            {/* ── Badge de status ── */}
            <div style={{ marginBottom: 14 }}>
              <PedidoStatusBadge status={status} />
            </div>

            {/* ── Itens ── */}
            <p className="vendor-section-label" style={{ marginBottom: 8 }}>ITENS</p>

            {(order?.items ?? []).map((item) => {
              const product = getItemProduct(item.product_id);
              return (
                <div className="client-order-detail-item" key={item.id}>
                  <ProductThumb
                    product={{
                      name: item.product_name,
                      thumb_color: product?.thumb_color ?? "#11885b",
                      image_url: product?.image_url ?? null
                    }}
                    size={46}
                  />
                  <div className="client-order-detail-item-copy">
                    <strong>{item.product_name}</strong>
                    <span>
                      Qtd {item.quantity}
                      {item.unit_price != null ? ` · ${formatBRL(item.unit_price)}` : ""}
                    </span>
                  </div>
                  {item.unit_price != null ? (
                    <strong className="client-order-detail-item-price">
                      {formatBRL(item.unit_price * item.quantity)}
                    </strong>
                  ) : (
                    <span className="client-order-detail-item-pending">a definir</span>
                  )}
                </div>
              );
            })}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px",
                background: "var(--client-bg-2)",
                borderRadius: 12,
                marginBottom: 4
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--client-ink-2)" }}>
                {status === "quote" ? "Total parcial" : "Total"}
              </span>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{formatBRL(total)}</span>
            </div>

            {/* ── Estados ── */}

            {/* Aguardando orçamento */}
            {status === "quote" && (
              <div className="client-catalog-state-card" style={{ background: "#fffaf0", borderColor: "#fde9c8", marginTop: 12 }}>
                <VendorIcon name="clock" size={19} style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }} />
                <div className="client-catalog-state-text">
                  A loja está preparando seu orçamento. Assim que os valores forem enviados, você decide se quer fechar o pedido.
                </div>
              </div>
            )}

            {/* Orçamento respondido → fechar ou desistir */}
            {isQuoteAnswered(status) && !fechando && (
              <>
                <div
                  className="client-catalog-state-card"
                  style={{ background: "var(--green-50)", borderColor: "var(--green-600)", marginTop: 12 }}
                >
                  <VendorIcon name="receipt" size={19} style={{ color: "var(--green-700)", flexShrink: 0, marginTop: 1 }} />
                  <div className="client-catalog-state-text">
                    A loja enviou os valores! Total de <strong>{formatBRL(total)}</strong>. Quer fechar o pedido?
                  </div>
                </div>

                {!desistir ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    <button
                      className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
                      disabled={pending}
                      onClick={() => setFechando(true)}
                      type="button"
                    >
                      <VendorIcon name="check-circle" size={18} />
                      Fechar pedido
                    </button>
                    <button
                      className="client-catalog-link-btn"
                      disabled={pending}
                      onClick={() => setDesistir(true)}
                      type="button"
                    >
                      Não tenho interesse
                    </button>
                  </div>
                ) : (
                  <div
                    className="client-catalog-state-card"
                    style={{ background: "#fff6f6", borderColor: "#fbd5d5", flexDirection: "column", marginTop: 12 }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--client-ink-1)", lineHeight: 1.45, marginBottom: 12 }}>
                      Confirma que não quer fechar este pedido? A loja será avisada.
                    </div>
                    <div style={{ display: "flex", gap: 9 }}>
                      <button
                        className="vendor-button vendor-button-ghost"
                        disabled={pending}
                        onClick={() => setDesistir(false)}
                        style={{ flex: 1 }}
                        type="button"
                      >
                        Voltar
                      </button>
                      <button
                        className="vendor-button vendor-button-danger"
                        disabled={pending}
                        onClick={handleDesistir}
                        style={{ flex: 1 }}
                        type="button"
                      >
                        <VendorIcon name="x" size={16} />
                        {pending ? "Aguarde…" : "Desistir"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Escolher pagamento ao fechar orçamento */}
            {isQuoteAnswered(status) && fechando && (
              <>
                <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                  FORMA DE PAGAMENTO
                </p>
                <div className="client-cart-pgto-options" style={{ marginBottom: 14 }}>
                  {(
                    [
                      ["pix", "PIX", "pix"],
                      ["cash", "Dinheiro", "wallet"],
                      ["card", "Cartão", "cards"]
                    ] as const
                  ).map(([key, label, icon]) => (
                    <button
                      className={`client-cart-pgto-btn${pgto === key ? " is-active" : ""}`}
                      key={key}
                      onClick={() => {
                        setPgto(key);
                        setReceiptFile(null);
                      }}
                      type="button"
                    >
                      <VendorIcon name={icon} size={20} />
                      <span style={{ fontWeight: 800, fontSize: 12.5 }}>{label}</span>
                    </button>
                  ))}
                </div>
                {pgto === "pix" && (
                  <ClientPixPaymentBlock
                    amount={total}
                    receiptControl={pixReceiptControl}
                    store={store}
                  />
                )}
                {pgto === "cash" && (
                  <p className="client-cart-pix-hint">
                    A loja vai combinar o pagamento com você{" "}
                    {initialOrder.delivery_type === "delivery" ? "na entrega" : "na retirada"}.
                  </p>
                )}
                {pgto === "card" && (
                  <p className="client-cart-pix-hint">
                    A loja vai gerar um link para você pagar no cartão.
                  </p>
                )}

                {error ? <p className="client-auth-error">{error}</p> : null}

                <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
                  <button
                    className="vendor-button vendor-button-ghost"
                    disabled={pending}
                    onClick={() => setFechando(false)}
                    style={{ flex: 1 }}
                    type="button"
                  >
                    Voltar
                  </button>
                  <button
                    className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
                    disabled={pending}
                    onClick={handleFecharOrcamento}
                    type="button"
                  >
                    <VendorIcon name="check-circle" size={18} />
                    {pending ? "Enviando…" : "Confirmar"}
                  </button>
                </div>
              </>
            )}

            {/* Aguardando autorização do parcelamento */}
            {status === "awaiting_installment_approval" && (
              <div
                className="client-catalog-state-card"
                style={{ background: "#fef3c7", borderColor: "#fde68a", marginTop: 12 }}
              >
                <VendorIcon name="clock" size={19} style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }} />
                <div className="client-catalog-state-text">
                  Parcelamento enviado para a loja. Aguarde a autorização para liberar o pagamento
                  {paymentMethod === "pix"
                    ? " via PIX"
                    : paymentMethod === "cash"
                      ? " em dinheiro"
                      : " no cartão"}
                  .
                </div>
              </div>
            )}

            {isInstallment && order?.installments?.length ? (
              <>
                <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                  PARCELAS
                </p>
                <div className="client-order-installment-list">
                  {order.installments.map((installment) => (
                    <div
                      className={`client-order-installment-item${installment.paid ? " is-paid" : ""}`}
                      key={installment.id}
                    >
                      <span>{installment.installment_number}</span>
                      <div>
                        <strong>{formatBRL(installment.amount)}</strong>
                        <small>Vence {formatShortDate(installment.due_date)}</small>
                      </div>
                      <em>{installment.paid ? "Paga" : installment.payment_informed ? "Informada" : "Em aberto"}</em>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {(order?.payment_proof_url || installmentProofs.length > 0) && (
              <>
                <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                  SEUS COMPROVANTES
                </p>
                {order?.payment_proof_url ? (
                  <ClientPaymentProofRecord
                    name={order.payment_proof_name}
                    url={order.payment_proof_url}
                  />
                ) : null}
                {installmentProofs.map((installment) => (
                  <ClientPaymentProofRecord
                    key={installment.id}
                    label={`Comprovante da parcela ${installment.installment_number}`}
                    name={installment.payment_proof_name}
                    subtitle={`Parcela ${installment.installment_number}`}
                    url={installment.payment_proof_url!}
                  />
                ))}
              </>
            )}

            {/* novo + pix à vista → pagar e informar */}
            {(status === "awaiting_payment" || status === "new" || status === "payment_review") &&
              paymentMethod === "pix" &&
              !isInstallment && (
                <>
                  <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                    PAGUE COM PIX
                  </p>
                  <ClientPixPaymentBlock amount={total} receiptControl={pixReceiptControl} store={store} />
                  {error ? <p className="client-auth-error" style={{ marginTop: 8 }}>{error}</p> : null}
                  {!paymentInformed ? (
                    <button
                      className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
                      disabled={pending}
                      onClick={handleInformPayment}
                      style={{ marginTop: 12 }}
                      type="button"
                    >
                      <VendorIcon name="check-circle" size={18} />
                      {pending ? "Aguarde…" : "Já paguei"}
                    </button>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                        color: "var(--green-700)",
                        fontWeight: 700,
                        fontSize: 13.5
                      }}
                    >
                      <VendorIcon name="check-circle" size={16} />
                      Pagamento informado · aguardando a loja confirmar
                    </div>
                  )}
                </>
              )}

            {isInstallment &&
              order?.installment_plan_status === "approved" &&
              paymentMethod === "pix" &&
              nextInstallment &&
              status !== "paid" && (
                <>
                  <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                    PAGUE A PARCELA {nextInstallment.installment_number}
                  </p>
                  <ClientPixPaymentBlock
                    amount={nextInstallment.amount}
                    receiptControl={pixReceiptControl}
                    store={store}
                  />
                  {error ? <p className="client-auth-error" style={{ marginTop: 8 }}>{error}</p> : null}
                  {!nextInstallment.payment_informed ? (
                    <button
                      className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
                      disabled={pending}
                      onClick={handleInformInstallmentPayment}
                      style={{ marginTop: 12 }}
                      type="button"
                    >
                      <VendorIcon name="check-circle" size={18} />
                      {pending ? "Aguarde…" : "Já paguei esta parcela"}
                    </button>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                        color: "var(--green-700)",
                        fontWeight: 700,
                        fontSize: 13.5
                      }}
                    >
                      <VendorIcon name="check-circle" size={16} />
                      Parcela informada · aguardando a loja confirmar
                    </div>
                  )}
                </>
              )}

            {/* novo + cartão sem link ainda */}
            {status === "awaiting_payment" && paymentMethod === "card" && !isInstallment && (
              <div
                className="client-catalog-state-card"
                style={{ background: "#f5f3ff", borderColor: "#ddd6fe", marginTop: 12 }}
              >
                <VendorIcon name="clock" size={19} style={{ color: "#6d28d9", flexShrink: 0, marginTop: 1 }} />
                <div className="client-catalog-state-text">
                  A loja vai gerar o link de pagamento no cartão. Volte aqui em instantes para pagar.
                </div>
              </div>
            )}

            {/* aguardando cartão → dois botões: abrir link + confirmar */}
            {status === "awaiting_card" && (
              <>
                <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                  PAGAMENTO NO CARTÃO
                </p>
                {!paymentInformed ? (
                  <>
                    {order?.vendor_payment_link && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "12px 14px",
                          background: "var(--client-bg-2)",
                          borderRadius: 12,
                          marginBottom: 12
                        }}
                      >
                        <VendorIcon name="cards" size={18} style={{ color: "#6d28d9" }} />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12.5,
                            color: "var(--client-ink-2)",
                            fontWeight: 600,
                            fontFamily: "monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {order.vendor_payment_link}
                        </span>
                      </div>
                    )}

                    {/* Botão 1: apenas abre o link, não confirma pagamento */}
                    <button
                      onClick={handleOpenCardLink}
                      style={{
                        width: "100%",
                        minHeight: 54,
                        borderRadius: 15,
                        border: "none",
                        background: "#6d28d9",
                        color: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 9,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(109,40,217,.3)",
                        marginBottom: 10
                      }}
                      type="button"
                    >
                      <VendorIcon name="share" size={20} />
                      Abrir link de pagamento
                    </button>

                    {/* Botão 2: confirmar pagamento (só aparece após abrir o link, ou sempre disponível) */}
                    {cardLinkOpened && (
                      <div
                        style={{
                          padding: "14px",
                          background: "var(--client-bg-2)",
                          borderRadius: 14,
                          border: "1px solid var(--client-line)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--client-ink-2)" }}>
                          Já realizou o pagamento? Informe a loja:
                        </p>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "10px 12px",
                            background: "#fff",
                            border: "1px dashed var(--client-line-2)",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontSize: 13
                          }}
                        >
                          <VendorIcon
                            name={cardReceiptFile ? "check-circle" : "attach"}
                            size={17}
                            style={{ color: cardReceiptFile ? "var(--green-600)" : "var(--client-ink-3)" }}
                          />
                          <span style={{ flex: 1, color: "var(--client-ink-2)", fontWeight: 600 }}>
                            {cardReceiptFile ? cardReceiptFile.name : "Anexar comprovante (opcional)"}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); cardFileInputRef.current?.click(); }}
                            style={{ fontSize: 12, color: "#6d28d9", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                            type="button"
                          >
                            {cardReceiptFile ? "Trocar" : "Escolher"}
                          </button>
                          <input
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => setCardReceiptFile(e.target.files?.[0] ?? null)}
                            ref={cardFileInputRef}
                            style={{ display: "none" }}
                            type="file"
                          />
                        </label>
                        {error ? <p className="client-auth-error" style={{ margin: 0 }}>{error}</p> : null}
                        <button
                          className="vendor-button vendor-button-primary vendor-button-full"
                          disabled={pending}
                          onClick={handleInformCard}
                          type="button"
                        >
                          <VendorIcon name="check-circle" size={18} />
                          {pending ? "Aguarde…" : "Já paguei no cartão"}
                        </button>
                      </div>
                    )}

                    {!cardLinkOpened && error ? <p className="client-auth-error">{error}</p> : null}
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "center",
                      color: "var(--green-700)",
                      fontWeight: 700,
                      fontSize: 13.5,
                      padding: 6
                    }}
                  >
                    <VendorIcon name="check-circle" size={16} />
                    Pagamento informado · aguardando a loja confirmar
                  </div>
                )}
              </>
            )}

            {/* A combinar (dinheiro) */}
            {status === "cash_on_delivery" && (
              <div
                className="client-catalog-state-card"
                style={{ background: "#fff7ed", borderColor: "#fed7aa", marginTop: 12 }}
              >
                <VendorIcon name="wallet" size={19} style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }} />
                <div className="client-catalog-state-text">
                  Pagamento em dinheiro combinado com a loja{" "}
                  {initialOrder.delivery_type === "delivery" ? "na entrega" : "na retirada"}.
                </div>
              </div>
            )}

            {/* Pago */}
            {status === "paid" && (
              <div
                style={{
                  marginTop: 12,
                  padding: 16,
                  background: "var(--green-50)",
                  border: "1px solid var(--green-600)",
                  borderRadius: 14,
                  textAlign: "center"
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: "var(--green-600)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 10px"
                  }}
                >
                  <VendorIcon name="check-circle" size={26} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--green-700)" }}>
                  Pagamento confirmado!
                </div>
                <div style={{ fontSize: 12.5, color: "var(--client-ink-2)", fontWeight: 500, marginTop: 3 }}>
                  A loja confirmou o pagamento do seu pedido.
                </div>
              </div>
            )}

            {/* Cancelado */}
            {status === "cancelled" && (
              <div
                className="client-catalog-state-card"
                style={{ background: "#fff6f6", borderColor: "#fbd5d5", marginTop: 12 }}
              >
                <VendorIcon name="x" size={19} style={{ color: "#b1182a", flexShrink: 0, marginTop: 1 }} />
                <div className="client-catalog-state-text">Este pedido foi cancelado.</div>
              </div>
            )}

            {order?.notes?.trim() ? (
              <>
                <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 8 }}>
                  OBSERVAÇÕES
                </p>
                <p className="client-catalog-state-text" style={{ margin: 0, padding: "0 2px 8px" }}>
                  {order.notes.trim()}
                </p>
              </>
            ) : null}

            {error ? <p className="client-auth-error">{error}</p> : null}

            <div style={{ height: 18 }} />
          </div>

          {(canEdit || canCancel || canViewReceipt) && !fechando ? (
            <div className="client-overlay-footer" style={{ display: "grid", gap: 8 }}>
              {canViewReceipt ? (
                <button
                  className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
                  onClick={() => setShowReceipt(true)}
                  type="button"
                >
                  <VendorIcon name="receipt" size={18} />
                  Ver recibo
                </button>
              ) : null}
              {canEdit ? (
                <button
                  className="vendor-button vendor-button-ghost vendor-button-full"
                  disabled={pending}
                  onClick={onEdit}
                  type="button"
                >
                  <VendorIcon name="edit" size={16} />
                  Editar pedido
                </button>
              ) : null}
              {canCancel && !confirmCancel ? (
                <button
                  className="vendor-button vendor-button-danger vendor-button-full"
                  disabled={pending}
                  onClick={() => setConfirmCancel(true)}
                  type="button"
                >
                  <VendorIcon name="x" size={16} />
                  Cancelar pedido
                </button>
              ) : null}
              {canCancel && confirmCancel ? (
                <div className="client-catalog-state-card" style={{ background: "#fff6f6", borderColor: "#fbd5d5", flexDirection: "column" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--client-ink-1)", lineHeight: 1.45, marginBottom: 12 }}>
                    Confirma o cancelamento deste pedido? Essa ação não pode ser desfeita.
                  </div>
                  <div style={{ display: "flex", gap: 9 }}>
                    <button
                      className="vendor-button vendor-button-ghost vendor-button-full"
                      disabled={pending}
                      onClick={() => setConfirmCancel(false)}
                      type="button"
                    >
                      Voltar
                    </button>
                    <button
                      className="vendor-button vendor-button-danger vendor-button-full"
                      disabled={pending}
                      onClick={handleCancelOrder}
                      type="button"
                    >
                      {pending ? "Aguarde…" : "Confirmar cancelamento"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </ClientOverlay>
  );
}

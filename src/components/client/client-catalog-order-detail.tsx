"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import {
  getPortalOrderDetailForViewAction,
  informOrderPaymentAction,
  finalizeClientOrderWithPaymentAction,
  cancelClientOrderAction,
  type OrderDetailView
} from "@/lib/client/actions";
import { getOrderStatusMeta, isQuoteAnswered } from "@/lib/client/order-status";
import type { PortalOrder } from "@/lib/client/queries";
import type { PublicStore } from "@/lib/client/queries";

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
  storeId,
  storeSlug,
  store,
  onClose,
  onRefresh
}: {
  order: PortalOrder;
  storeId: string;
  storeSlug: string;
  store: PublicStore;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [detail, setDetail] = useState<OrderDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechando, setFechando] = useState(false);
  const [desistir, setDesistir] = useState(false);
  const [pgto, setPgto] = useState<PaymentMethod>("pix");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
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

  const copyPix = () => {
    const key = store.pix_key ?? "";
    if (key) {
      navigator.clipboard.writeText(key).catch(() => {});
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    }
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

  const pixBlock = (
    <div>
      <div
        className="client-cart-pix-copy"
        onClick={copyPix}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && copyPix()}
        style={{ marginBottom: 10 }}
      >
        <code>{store.pix_key ?? "—"}</code>
        <span>{pixCopied ? "Copiado ✓" : "Copiar chave"}</span>
      </div>
      <label className="client-pay-receipt" style={{ cursor: "pointer" }}>
        <VendorIcon name={receiptFile ? "check-circle" : "attach"} size={18} />
        <span style={{ flex: 1 }}>
          {receiptFile ? receiptFile.name : "Anexar comprovante (opcional)"}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
          style={{ fontSize: 12, color: "var(--green-600)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          type="button"
        >
          {receiptFile ? "Trocar" : "Escolher"}
        </button>
        <input
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          ref={fileInputRef}
          style={{ display: "none" }}
          type="file"
        />
      </label>
    </div>
  );

  const formattedDate = new Date(initialOrder.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="order-detail-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />

        <div className="vendor-sheet-header">
          <button
            aria-label="Fechar"
            className="vendor-dashboard-icon-btn"
            onClick={onClose}
            type="button"
          >
            <VendorIcon name="arrow-left" size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 id="order-detail-title" style={{ margin: 0, fontSize: "1rem" }}>
              Pedido #{String(initialOrder.order_code).padStart(4, "0")}
            </h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--client-ink-3)", fontWeight: 600 }}>
              {formattedDate} · {initialOrder.delivery_type === "delivery" ? "Entrega" : "Retirada"}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--client-ink-3)", fontSize: "0.85rem" }}>
            Carregando…
          </div>
        ) : (
          <div className="vendor-sheet-body">
            {/* ── Badge de status ── */}
            <div style={{ marginBottom: 14 }}>
              <PedidoStatusBadge status={status} />
            </div>

            {/* ── Itens ── */}
            <p className="vendor-section-label" style={{ marginBottom: 8 }}>ITENS</p>

            {(order?.items ?? []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--client-bg-2)",
                  borderRadius: 12,
                  marginBottom: 8
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.product_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--client-ink-3)", fontWeight: 700, marginTop: 2 }}>
                    Qtd {item.quantity}
                    {item.unit_price != null ? ` · ${formatBRL(item.unit_price)}` : ""}
                  </div>
                </div>
                {item.unit_price != null ? (
                  <strong style={{ fontSize: 14, color: "var(--client-ink-1)" }}>
                    {formatBRL(item.unit_price * item.quantity)}
                  </strong>
                ) : (
                  <span style={{ fontSize: 12, color: "#b45309", fontWeight: 700 }}>a definir</span>
                )}
              </div>
            ))}

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
                      className="vendor-button vendor-button-primary"
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
                      ["pix", "PIX", "pix", "#16a34a"],
                      ["cash", "Dinheiro", "wallet", "#ea580c"],
                      ["card", "Cartão", "cards", "#6d28d9"]
                    ] as const
                  ).map(([key, label, icon, color]) => (
                    <button
                      className={`client-cart-pgto-btn${pgto === key ? " is-active" : ""}`}
                      key={key}
                      onClick={() => { setPgto(key); setReceiptFile(null); }}
                      style={pgto === key ? { borderColor: color, color } : undefined}
                      type="button"
                    >
                      <VendorIcon name={icon} size={20} />
                      <span style={{ fontWeight: 800, fontSize: 12.5 }}>{label}</span>
                    </button>
                  ))}
                </div>
                {pgto === "pix" && pixBlock}
                {pgto === "cash" && (
                  <p className="client-cart-pix-hint">
                    A loja vai combinar o pagamento em dinheiro com você.
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
                    className="vendor-button vendor-button-primary"
                    disabled={pending}
                    onClick={handleFecharOrcamento}
                    style={{ flex: 2 }}
                    type="button"
                  >
                    <VendorIcon name="check-circle" size={18} />
                    {pending ? "Enviando…" : "Confirmar"}
                  </button>
                </div>
              </>
            )}

            {/* novo + pix → pagar e informar */}
            {(status === "awaiting_payment" || status === "new" || status === "payment_review") &&
              paymentMethod === "pix" && (
                <>
                  <p className="vendor-section-label" style={{ marginTop: 16, marginBottom: 10 }}>
                    PAGUE COM PIX
                  </p>
                  <div className="client-pay-amount-card" style={{ marginBottom: 10 }}>
                    <span>Total a pagar</span>
                    <strong>{formatBRL(total)}</strong>
                    {store.pix_receiver_name ? (
                      <small>Para: {store.pix_receiver_name}</small>
                    ) : null}
                  </div>
                  {pixBlock}
                  {error ? <p className="client-auth-error" style={{ marginTop: 8 }}>{error}</p> : null}
                  {!paymentInformed ? (
                    <button
                      className="vendor-button vendor-button-primary"
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

            {/* novo + cartão sem link ainda */}
            {status === "awaiting_payment" && paymentMethod === "card" && (
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
                          className="vendor-button vendor-button-primary"
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

            <div style={{ height: 18 }} />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useMemo, useState, useTransition } from "react";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorIcon } from "@/components/vendor/icon";
import { checkoutClientOrderAction } from "@/lib/client/actions";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import type { PublicProduct, PublicStore } from "@/lib/client/queries";

type DeliveryType = "pickup" | "delivery";
type PaymentMethod = "pix" | "cash" | "card";

export function ClientCartSheet({
  cart,
  customerId,
  onClose,
  onSubmitted,
  products,
  setCart,
  store
}: {
  cart: Record<string, number>;
  customerId: string | null;
  onClose: () => void;
  onSubmitted: (message: string) => void;
  products: PublicProduct[];
  setCart: (next: Record<string, number>) => void;
  store: PublicStore;
}) {
  const [step, setStep] = useState<"cart" | "payment">("cart");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter(Boolean) as Array<{ product: PublicProduct; quantity: number }>;
  }, [cart, products]);

  const hasVisiblePrices = items.every(({ product }) => product.price_visible);

  const subtotal = useMemo(
    () =>
      items.reduce((acc, { product, quantity }) => {
        if (!product.price_visible) return acc;
        const price = getEffectivePrice({ price: product.price, promo_price: product.promo_price });
        return acc + price * quantity;
      }, 0),
    [items]
  );

  const removeItem = (productId: string) => {
    const next = { ...cart };
    delete next[productId];
    setCart(next);
  };

  const copyPix = () => {
    if (store.pix_key) {
      navigator.clipboard.writeText(store.pix_key).catch(() => {});
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    }
  };

  const handleContinue = () => {
    if (!customerId) {
      setError("Crie uma conta ou faça login para enviar o pedido.");
      return;
    }
    setError(null);

    if (!hasVisiblePrices) {
      submitOrder(null);
      return;
    }

    setStep("payment");
  };

  const submitOrder = (method: PaymentMethod | null) => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("storeId", store.id);
      fd.append("storeSlug", store.slug);
      fd.append("deliveryType", deliveryType);
      fd.append("notes", notes);
      fd.append("couponCode", couponCode.trim());
      fd.append("isQuote", hasVisiblePrices ? "false" : "true");
      fd.append(
        "items",
        JSON.stringify(
          items.map(({ product, quantity }) => ({
            product_id: product.id,
            quantity
          }))
        )
      );

      if (method) {
        fd.append("paymentMethod", method);
        if (method === "pix" && receiptFile) {
          fd.append("receipt", receiptFile);
        }
      }

      const result = await checkoutClientOrderAction(fd);

      if (result.error) {
        setError(result.error);
        return;
      }

      setCart({});
      onSubmitted(result.isQuote ? "Orçamento enviado ✓" : "Pedido enviado para a loja ✓");
      onClose();
    });
  };

  const canFinalize = paymentMethod !== null;

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="client-cart-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />

        {/* ─── Header ─── */}
        <div className="vendor-sheet-header">
          {step === "payment" ? (
            <button
              aria-label="Voltar"
              className="vendor-dashboard-icon-btn"
              onClick={() => { setStep("cart"); setError(null); }}
              type="button"
            >
              <VendorIcon name="arrow-left" size={18} />
            </button>
          ) : null}
          <h2 id="client-cart-title" style={{ flex: 1 }}>
            {step === "cart" ? "Seu pedido" : "Forma de pagamento"}
          </h2>
          <button aria-label="Fechar" className="vendor-dashboard-icon-btn" onClick={onClose} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          {step === "cart" ? (
            <>
              {/* ─── Itens ─── */}
              {items.map(({ product, quantity }) => {
                const price = getEffectivePrice({ price: product.price, promo_price: product.promo_price });
                return (
                  <div className="client-cart-item" key={product.id}>
                    <ProductThumb
                      product={{ name: product.name, thumb_color: product.thumb_color, image_url: product.image_url }}
                      size={46}
                    />
                    <div className="client-cart-item-copy">
                      <strong>{product.name}</strong>
                      <span>
                        {product.price_visible ? formatBRL(price) : "Sob orçamento"} · qtd {quantity}
                      </span>
                    </div>
                    <button
                      aria-label={`Remover ${product.name}`}
                      className="client-cart-item-remove"
                      onClick={() => removeItem(product.id)}
                      type="button"
                    >
                      <VendorIcon name="x" size={18} />
                    </button>
                  </div>
                );
              })}

              {/* ─── Entrega / Retirada ─── */}
              <div className="client-cart-delivery">
                {(
                  [
                    ["pickup", "Retirada", "store"],
                    ["delivery", "Entrega", "truck"]
                  ] as const
                ).map(([key, label, icon]) => (
                  <button
                    className={deliveryType === key ? "is-active" : ""}
                    key={key}
                    onClick={() => setDeliveryType(key)}
                    type="button"
                  >
                    <VendorIcon name={icon} size={16} /> {label}
                  </button>
                ))}
              </div>

              {/* ─── Cupom (só se todos têm preço) ─── */}
              {hasVisiblePrices ? (
                <label className="client-cart-coupon">
                  <input
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="Cupom de desconto"
                    value={couponCode}
                  />
                </label>
              ) : null}

              {/* ─── Total ─── */}
              <div className="client-cart-total">
                <span>{hasVisiblePrices ? "Total" : "Total parcial"}</span>
                <strong>{formatBRL(subtotal)}</strong>
              </div>

              {!hasVisiblePrices ? (
                <p className="client-cart-quote-note">
                  Alguns itens são sob orçamento. A loja vai confirmar os valores e te enviar o total.
                </p>
              ) : null}

              <textarea
                className="client-cart-notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações (cor, tamanho, ponto de referência…)"
                value={notes}
              />

              {error ? <p className="client-auth-error">{error}</p> : null}

              <button
                className="vendor-button vendor-button-primary"
                disabled={pending || !items.length}
                onClick={handleContinue}
                type="button"
              >
                <VendorIcon name={hasVisiblePrices ? "arrow-right" : "share"} size={18} />
                {pending
                  ? "Enviando…"
                  : hasVisiblePrices
                    ? "Continuar para pagamento"
                    : "Solicitar orçamento"}
              </button>
            </>
          ) : (
            <>
              {/* ─── Passo 2: Pagamento ─── */}
              <p className="client-cart-section-label">FORMA DE PAGAMENTO</p>

              <div className="client-cart-pgto-options">
                {(
                  [
                    ["pix", "PIX", "pix", "#16a34a"],
                    ["cash", "Dinheiro", "wallet", "#ea580c"],
                    ["card", "Cartão", "cards", "#6d28d9"]
                  ] as const
                ).map(([key, label, icon, color]) => (
                  <button
                    className={`client-cart-pgto-btn${paymentMethod === key ? " is-active" : ""}`}
                    key={key}
                    onClick={() => { setPaymentMethod(key); setReceiptFile(null); }}
                    style={paymentMethod === key ? { borderColor: color, color } : undefined}
                    type="button"
                  >
                    <VendorIcon name={icon} size={22} />
                    {label}
                  </button>
                ))}
              </div>

              {/* ─── PIX ─── */}
              {paymentMethod === "pix" && (
                <div className="client-pay-pix-box">
                  <div className="client-cart-pix-header">
                    <strong>Chave PIX</strong>
                    {store.pix_receiver_name ? (
                      <span>Para: {store.pix_receiver_name}</span>
                    ) : null}
                  </div>
                  <div className="client-pay-amount-card" style={{ marginTop: 8 }}>
                    <span>Total a pagar</span>
                    <strong>{formatBRL(subtotal)}</strong>
                  </div>
                  {store.pix_key ? (
                    <button className="client-cart-pix-copy" onClick={copyPix} type="button">
                      <code>{store.pix_key}</code>
                      <span>{pixCopied ? "Copiado ✓" : "Copiar chave"}</span>
                    </button>
                  ) : (
                    <p className="client-cart-pix-hint">Chave PIX não configurada pela loja.</p>
                  )}
                  <label className="client-pay-receipt">
                    <VendorIcon name={receiptFile ? "check-circle" : "attach"} size={18} />
                    <span>
                      {receiptFile
                        ? receiptFile.name
                        : "Anexar comprovante (opcional)"}
                    </span>
                    <input
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      type="file"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ marginLeft: "auto", fontSize: 12, color: "var(--green-600)" }}
                      type="button"
                    >
                      {receiptFile ? "Trocar" : "Escolher arquivo"}
                    </button>
                  </label>
                  <p className="client-cart-pix-hint">
                    Você pode enviar o comprovante pelo WhatsApp depois, se preferir.
                  </p>
                </div>
              )}

              {/* ─── Dinheiro ─── */}
              {paymentMethod === "cash" && (
                <div className="client-cart-pgto-detail">
                  <div className="client-cart-pgto-icon" style={{ background: "#fff7ed" }}>
                    <VendorIcon name="wallet" size={32} style={{ color: "#ea580c" }} />
                  </div>
                  <strong>Pagamento em dinheiro</strong>
                  <span>Combine o valor e a forma de entrega diretamente com a loja.</span>
                </div>
              )}

              {/* ─── Cartão ─── */}
              {paymentMethod === "card" && (
                <div className="client-cart-pgto-detail">
                  <div className="client-cart-pgto-icon" style={{ background: "#ede9fe" }}>
                    <VendorIcon name="cards" size={32} style={{ color: "#6d28d9" }} />
                  </div>
                  <strong>Pagamento com cartão</strong>
                  <span>A loja vai gerar um link de pagamento e enviar para você confirmar.</span>
                </div>
              )}

              {/* ─── Total ─── */}
              <div className="client-cart-total" style={{ marginTop: 12 }}>
                <span>Total</span>
                <strong>{formatBRL(subtotal)}</strong>
              </div>

              {error ? <p className="client-auth-error">{error}</p> : null}

              <button
                className="vendor-button vendor-button-primary"
                disabled={pending || !canFinalize}
                onClick={() => canFinalize && submitOrder(paymentMethod)}
                type="button"
              >
                <VendorIcon name="check-circle" size={18} />
                {pending ? "Enviando…" : "Finalizar pedido"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ClientCartInstallmentPlan } from "@/components/client/client-cart-installment-plan";
import { ClientPixPaymentBlock } from "@/components/client/client-pix-payment-block";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorIcon } from "@/components/vendor/icon";
import type { ClientSessionCustomer } from "@/lib/client/actions";
import { checkoutClientOrderAction } from "@/lib/client/actions";
import { parseCartLineKey } from "@/lib/products/cart-keys";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import { couponDiscount } from "@/lib/sales/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicProduct, PublicStore } from "@/lib/client/queries";

type DeliveryType = "pickup" | "delivery";
type PaymentMethod = "pix" | "cash" | "card";
type PaymentMode = "cash" | "installment";
type InstallmentCardMode = "full" | "per_installment";

type ValidatedCoupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
};

function hasCustomerAddress(customer: ClientSessionCustomer | null) {
  if (!customer) return false;
  return Boolean(
    customer.address_street?.trim() ||
      customer.address_number?.trim() ||
      customer.address_city?.trim()
  );
}

export function ClientCartSheet({
  cart,
  customer,
  customerId,
  onClose,
  onSubmitted,
  products,
  setCart,
  store
}: {
  cart: Record<string, number>;
  customer: ClientSessionCustomer | null;
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
  const [validatedCoupon, setValidatedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [installmentCardMode, setInstallmentCardMode] = useState<InstallmentCardMode>("per_installment");
  const [installments, setInstallments] = useState<
    Array<{ installment_number: number; due_date: string; amount: number }>
  >([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([lineKey, quantity]) => {
        const { productId, variation } = parseCartLineKey(lineKey);
        const product = products.find((p) => p.id === productId);
        return product ? { product, quantity, variation, lineKey } : null;
      })
      .filter(Boolean) as Array<{
      product: PublicProduct;
      quantity: number;
      variation?: string;
      lineKey: string;
    }>;
  }, [cart, products]);

  const hasVisiblePrices = items.every(({ product }) => product.price_visible);

  const subtotal = useMemo(
    () =>
      items.reduce((acc, { product, quantity }) => {
        if (!product.price_visible) return acc;
        const price = getEffectivePrice(
          {
            price: product.price,
            promo_price: product.promo_price,
            wholesale_price: product.wholesale_price,
            wholesale_min_qty: product.wholesale_min_qty
          },
          quantity
        );
        return acc + price * quantity;
      }, 0),
    [items]
  );

  const discount = hasVisiblePrices ? couponDiscount(validatedCoupon, subtotal) : 0;
  const total = subtotal - discount;

  useEffect(() => {
    if (!couponCode.trim()) {
      setValidatedCoupon(null);
      setCouponPending(false);
      return;
    }

    setCouponPending(true);
    const timer = window.setTimeout(async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.rpc("validate_store_coupon", {
        p_store_id: store.id,
        p_code: couponCode.trim()
      });
      const row = Array.isArray(data) ? data[0] : data;
      setValidatedCoupon(
        row
          ? {
              code: String(row.code),
              type: row.type as ValidatedCoupon["type"],
              value: Number(row.value)
            }
          : null
      );
      setCouponPending(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [couponCode, store.id]);

  const removeItem = (lineKey: string) => {
    const next = { ...cart };
    delete next[lineKey];
    setCart(next);
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

    setPaymentMethod("pix");
    setStep("payment");
  };

  const handleInstallmentChange = useCallback(
    (rows: Array<{ installment_number: number; due_date: string; amount: number }>) => {
      setInstallments(rows);
    },
    []
  );

  const submitOrder = (method: PaymentMethod | null) => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("storeId", store.id);
      fd.append("storeSlug", store.slug);
      fd.append("deliveryType", deliveryType);
      fd.append("notes", notes);
      fd.append("couponCode", validatedCoupon ? validatedCoupon.code : couponCode.trim());
      fd.append("isQuote", hasVisiblePrices ? "false" : "true");
      fd.append(
        "items",
        JSON.stringify(
          items.map(({ product, quantity, variation }) => ({
            product_id: product.id,
            quantity,
            ...(variation ? { variation } : {})
          }))
        )
      );

      if (method) {
        fd.append("paymentMethod", method);
        fd.append("paymentMode", paymentMode);
        if (paymentMode === "installment") {
          fd.append("installments", JSON.stringify(installments));
          if (method === "card") {
            fd.append("installmentCardMode", installmentCardMode);
          }
        }
        if (paymentMode === "cash" && method === "pix" && receiptFile) {
          fd.append("receipt", receiptFile);
        }
      }

      const result = await checkoutClientOrderAction(fd);

      if (result.error) {
        setError(result.error);
        return;
      }

      setCart({});
      onSubmitted(
        result.isQuote
          ? "Orçamento enviado ✓"
          : paymentMode === "installment"
            ? "Pedido enviado · aguardando autorização da loja ✓"
            : "Pedido enviado para a loja ✓"
      );
      onClose();
    });
  };

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="client-cart-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall vendor-sheet-scroll"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />

        <div className="vendor-sheet-header">
          {step === "payment" ? (
            <button
              aria-label="Voltar"
              className="vendor-dashboard-icon-btn"
              onClick={() => {
                setStep("cart");
                setError(null);
              }}
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
              {items.map(({ product, quantity, variation, lineKey }) => {
                const price = getEffectivePrice(
                  {
                    price: product.price,
                    promo_price: product.promo_price,
                    wholesale_price: product.wholesale_price,
                    wholesale_min_qty: product.wholesale_min_qty
                  },
                  quantity
                );
                return (
                  <div className="client-cart-item" key={lineKey}>
                    <ProductThumb
                      product={{ name: product.name, thumb_color: product.thumb_color, image_url: product.image_url }}
                      size={46}
                    />
                    <div className="client-cart-item-copy">
                      <strong>{product.name}</strong>
                      <span>
                        {product.price_visible ? formatBRL(price) : "Sob orçamento"} · qtd {quantity}
                        {variation ? ` · ${variation}` : ""}
                      </span>
                    </div>
                    <button
                      aria-label={`Remover ${product.name}`}
                      className="client-cart-item-remove"
                      onClick={() => removeItem(lineKey)}
                      type="button"
                    >
                      <VendorIcon name="x" size={18} />
                    </button>
                  </div>
                );
              })}

              <p className="client-cart-section-label">Como você quer receber?</p>
              <div className="client-cart-delivery">
                {(
                  [
                    ["pickup", "Retirada", "store", "Retiro na loja"],
                    ["delivery", "Entrega", "truck", "Entregar no endereço"]
                  ] as const
                ).map(([key, label, icon, subtitle]) => (
                  <button
                    className={`client-cart-delivery-btn${deliveryType === key ? " is-active" : ""}`}
                    key={key}
                    onClick={() => setDeliveryType(key)}
                    type="button"
                  >
                    <VendorIcon name={icon} size={20} />
                    <span className="client-cart-delivery-label">{label}</span>
                    <span className="client-cart-delivery-sub">{subtitle}</span>
                  </button>
                ))}
              </div>

              {deliveryType === "delivery" && customer && !hasCustomerAddress(customer) ? (
                <p className="client-cart-address-warning">
                  Você ainda não cadastrou endereço. A loja vai te pedir o endereço para despachar.
                </p>
              ) : null}

              {hasVisiblePrices ? (
                <div className="client-cart-coupon-block">
                  <div className="client-cart-coupon-row">
                    <input
                      className={
                        couponCode && !validatedCoupon
                          ? "client-cart-coupon-input client-cart-coupon-input-invalid"
                          : "client-cart-coupon-input"
                      }
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      placeholder="Cupom de desconto"
                      value={couponCode}
                    />
                    {validatedCoupon ? (
                      <span className="client-cart-coupon-applied">
                        <VendorIcon name="check" size={14} /> aplicado
                      </span>
                    ) : null}
                  </div>
                  {couponCode && !validatedCoupon && !couponPending ? (
                    <p className="client-cart-coupon-error">Cupom inválido ou inativo.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="client-cart-totals">
                {discount > 0 && validatedCoupon ? (
                  <>
                    <div className="client-cart-total-line">
                      <span>Subtotal</span>
                      <strong>{formatBRL(subtotal)}</strong>
                    </div>
                    <div className="client-cart-total-line client-cart-total-line-discount">
                      <span>Cupom {validatedCoupon.code}</span>
                      <strong>− {formatBRL(discount)}</strong>
                    </div>
                  </>
                ) : null}
                <div className="client-cart-total">
                  <span>{hasVisiblePrices ? "Total" : "Total parcial"}</span>
                  <strong>{formatBRL(hasVisiblePrices ? total : subtotal)}</strong>
                </div>
              </div>

              {!hasVisiblePrices ? (
                <p className="client-cart-quote-note">
                  Alguns itens são sob orçamento. A loja vai confirmar os valores e te enviar o total — depois você
                  escolhe como pagar.
                </p>
              ) : null}

              <textarea
                className="client-cart-notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações (cor, tamanho, ponto de referência…)"
                value={notes}
              />

              {error ? <p className="client-auth-error">{error}</p> : null}
            </>
          ) : (
            <>
              <button
                className="client-cart-back-link"
                onClick={() => {
                  setStep("cart");
                  setError(null);
                }}
                type="button"
              >
                <VendorIcon name="chevL" size={16} /> Voltar ao carrinho
              </button>

              <p className="client-cart-section-label client-cart-section-label-normal">Forma de pagamento</p>

              <div className="client-cart-pgto-options">
                {(
                  [
                    ["pix", "PIX", "pix"],
                    ["cash", "Dinheiro", "wallet"],
                    ["card", "Cartão", "cards"]
                  ] as const
                ).map(([key, label, icon]) => (
                  <button
                    className={`client-cart-pgto-btn${paymentMethod === key ? " is-active" : ""}`}
                    key={key}
                    onClick={() => {
                      setPaymentMethod(key);
                      setReceiptFile(null);
                    }}
                    type="button"
                  >
                    <VendorIcon name={icon} size={22} />
                    {label}
                  </button>
                ))}
              </div>

              <button
                className={`client-cart-installment-toggle${paymentMode === "installment" ? " is-active" : ""}`}
                onClick={() => setPaymentMode((current) => (current === "installment" ? "cash" : "installment"))}
                type="button"
              >
                <VendorIcon name="cards" size={18} />
                <span>
                  <strong>Pagamento parcelado</strong>
                  <small>Informe as datas · aguarda autorização da loja</small>
                </span>
              </button>

              {paymentMode === "installment" ? (
                <>
                  <ClientCartInstallmentPlan onChange={handleInstallmentChange} total={total} />
                  {paymentMethod === "card" ? (
                    <div className="client-cart-card-mode">
                      <p className="client-cart-section-label client-cart-section-label-normal">
                        Como pagar no cartão
                      </p>
                      <div className="client-cart-card-mode-options">
                        <button
                          className={`client-cart-card-mode-btn${installmentCardMode === "full" ? " is-active" : ""}`}
                          onClick={() => setInstallmentCardMode("full")}
                          type="button"
                        >
                          Pagar tudo parcelado
                        </button>
                        <button
                          className={`client-cart-card-mode-btn${installmentCardMode === "per_installment" ? " is-active" : ""}`}
                          onClick={() => setInstallmentCardMode("per_installment")}
                          type="button"
                        >
                          Parcela a parcela
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : paymentMethod === "pix" ? (
                <ClientPixPaymentBlock
                  amount={total}
                  receiptControl={
                    <label className={`client-pay-receipt ${receiptFile ? "is-attached" : ""}`}>
                      <input
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        type="file"
                      />
                      <VendorIcon name={receiptFile ? "check" : "share"} size={24} />
                      <span>
                        {receiptFile ? receiptFile.name : "Anexar comprovante (opcional)"}
                      </span>
                    </label>
                  }
                  store={store}
                />
              ) : paymentMethod === "cash" ? (
                <div className="client-cart-pgto-detail">
                  <div className="client-cart-pgto-icon" style={{ background: "#fff7ed" }}>
                    <VendorIcon name="wallet" size={32} style={{ color: "#ea580c" }} />
                  </div>
                  <strong>Pagamento em dinheiro</strong>
                  <span>
                    A loja vai combinar o pagamento com você{" "}
                    {deliveryType === "delivery" ? "na entrega" : "na retirada"}.
                  </span>
                </div>
              ) : paymentMethod === "card" ? (
                <div className="client-cart-pgto-detail">
                  <div className="client-cart-pgto-icon" style={{ background: "#ede9fe" }}>
                    <VendorIcon name="cards" size={32} style={{ color: "#6d28d9" }} />
                  </div>
                  <strong>Pagamento no cartão</strong>
                  <span>
                    A loja vai gerar um link de pagamento. Você receberá um botão &quot;Pagar com cartão&quot; aqui no
                    app.
                  </span>
                </div>
              ) : null}

              {paymentMode === "installment" && paymentMethod !== "card" ? (
                <div className="client-cart-pgto-detail">
                  <div className="client-cart-pgto-icon" style={{ background: "#fef3c7" }}>
                    <VendorIcon name="clock" size={32} style={{ color: "#b45309" }} />
                  </div>
                  <strong>Aguardando autorização</strong>
                  <span>
                    A loja vai analisar as datas das parcelas. Depois de aprovar, você recebe as instruções de
                    pagamento aqui no app.
                  </span>
                </div>
              ) : null}

              {error ? <p className="client-auth-error">{error}</p> : null}
            </>
          )}
        </div>

        <div className="vendor-sheet-footer">
          {step === "cart" ? (
            <button
              className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
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
          ) : (
            <>
              <div className="client-cart-total">
                <span>Total</span>
                <strong>{formatBRL(total)}</strong>
              </div>
              <button
                className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
                disabled={
                  pending ||
                  (paymentMode === "installment" &&
                    (installments.length < 2 ||
                      Math.abs(
                        installments.reduce((sum, row) => sum + row.amount, 0) - total
                      ) > 0.02))
                }
                onClick={() => submitOrder(paymentMethod)}
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

"use client";

import { useMemo, useState, useTransition } from "react";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorIcon } from "@/components/vendor/icon";
import { createClientOrderAction } from "@/lib/client/actions";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import type { PublicProduct, PublicStore } from "@/lib/client/queries";

type DeliveryType = "pickup" | "delivery";

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
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useMemo(() => {
    return Object.entries(cart)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => {
        const product = products.find((entry) => entry.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter(Boolean) as Array<{ product: PublicProduct; quantity: number }>;
  }, [cart, products]);

  const hasVisiblePrices = items.every(({ product }) => product.price_visible);

  const subtotal = useMemo(
    () =>
      items.reduce((total, { product, quantity }) => {
        if (!product.price_visible) {
          return total;
        }

        const price = getEffectivePrice({
          price: product.price,
          promo_price: product.promo_price
        });

        return total + price * quantity;
      }, 0),
    [items]
  );

  const removeItem = (productId: string) => {
    const next = { ...cart };
    delete next[productId];
    setCart(next);
  };

  const submit = () => {
    if (!customerId) {
      setError("Crie uma conta ou faça login para enviar o pedido.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createClientOrderAction({
        storeId: store.id,
        storeSlug: store.slug,
        deliveryType,
        notes,
        couponCode: couponCode.trim() || undefined,
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity
        }))
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const hasQuote = items.some(({ product }) => !product.price_visible);
      setCart({});
      onSubmitted(hasQuote ? "Orçamento solicitado ✓" : "Pedido enviado para a loja ✓");
      onClose();
    });
  };

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="client-cart-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="client-cart-title">Seu pedido</h2>
          <button aria-label="Fechar" className="vendor-dashboard-icon-btn" onClick={onClose} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          {items.map(({ product, quantity }) => {
            const price = getEffectivePrice({
              price: product.price,
              promo_price: product.promo_price
            });

            return (
              <div className="client-cart-item" key={product.id}>
                <ProductThumb
                  product={{
                    name: product.name,
                    thumb_color: product.thumb_color,
                    image_url: product.image_url
                  }}
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

          {hasVisiblePrices ? (
            <label className="client-cart-coupon">
              <input
                onChange={(event) =>
                  setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="Cupom de desconto"
                value={couponCode}
              />
            </label>
          ) : null}

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
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observações (cor, tamanho, ponto de referência...)"
            value={notes}
          />

          {error ? <p className="client-auth-error">{error}</p> : null}

          <button
            className="vendor-button vendor-button-primary"
            disabled={pending || !items.length}
            onClick={submit}
            type="button"
          >
            <VendorIcon name="share" size={18} />
            {pending
              ? "Enviando…"
              : hasVisiblePrices
                ? "Enviar pedido"
                : "Solicitar orçamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

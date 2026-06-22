"use client";

import { useMemo, useState } from "react";
import { ClientCartSheet } from "@/components/client/client-cart-sheet";
import { StoreBrandLogo } from "@/components/client/store-brand-logo";
import { VendorIcon } from "@/components/vendor/icon";
import { ProductThumb } from "@/components/vendor/product-thumb";
import type { ClientSessionCustomer } from "@/lib/client/actions";
import {
  buildCartLineKey,
  parseCartLineKey,
  productCartQuantity
} from "@/lib/products/cart-keys";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import type { PublicProduct, PublicStore } from "@/lib/client/queries";
import { getCustomerInitials } from "@/lib/customers/format";

function maxCartQty(product: PublicProduct) {
  return product.sell_without_stock ? 999 : Math.max(0, product.stock_qty);
}

function stockLabel(product: PublicProduct) {
  if (!product.stock_visible) return null;
  if (product.sell_without_stock && product.stock_qty <= 0) {
    return "Sob encomenda";
  }
  if (product.stock_qty <= 0) return "Esgotado";
  return `${product.stock_qty} disp.`;
}

export function ClientCatalog({
  customer,
  onOpenAccount,
  onOrderSubmitted,
  onSwitchStore,
  products,
  store
}: {
  customer: ClientSessionCustomer | null;
  onOpenAccount?: () => void;
  onOrderSubmitted: (message: string) => void;
  onSwitchStore?: () => void;
  products: PublicProduct[];
  store: PublicStore;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [variationPicker, setVariationPicker] = useState<PublicProduct | null>(null);

  const categories = useMemo(
    () => ["todas", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== "todas" && product.category !== category) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    });
  }, [category, products, query]);

  const cartCount = Object.values(cart).reduce((total, qty) => total + qty, 0);
  const customerInitial = customer ? getCustomerInitials(customer.full_name) : "C";

  const adjustCartLine = (lineKey: string, product: PublicProduct, delta: number) => {
    setCart((current) => {
      const currentProductQty = productCartQuantity(current, product.id);
      const lineQty = current[lineKey] ?? 0;

      if (delta > 0 && !product.sell_without_stock && currentProductQty >= product.stock_qty) {
        return current;
      }

      const nextQty = Math.max(0, lineQty + delta);
      if (nextQty === 0) {
        const copy = { ...current };
        delete copy[lineKey];
        return copy;
      }

      return { ...current, [lineKey]: nextQty };
    });
  };

  const requestAddProduct = (product: PublicProduct) => {
    if (maxCartQty(product) <= 0) {
      return;
    }

    if (product.variations.length > 0) {
      setVariationPicker(product);
      return;
    }

    adjustCartLine(buildCartLineKey(product.id), product, 1);
  };

  const decreaseProduct = (product: PublicProduct) => {
    setCart((current) => {
      const keys = Object.keys(current).filter(
        (key) => parseCartLineKey(key).productId === product.id && current[key] > 0
      );

      if (!keys.length) {
        return current;
      }

      const lineKey = keys[keys.length - 1];
      const next = { ...current };

      if (next[lineKey] <= 1) {
        delete next[lineKey];
      } else {
        next[lineKey] -= 1;
      }

      return next;
    });
  };

  return (
    <div className="client-main">
      <div className="client-hero">
        <div className="client-hero-top">
          <StoreBrandLogo label={store.name} logoUrl={store.logo_url} radius={15} size={50} />
          <div className="client-hero-copy">
            <strong>{store.name}</strong>
            <span>{store.catalog_tagline}</span>
          </div>
          <div className="client-hero-actions">
            {onSwitchStore ? (
              <button
                aria-label="Trocar de loja"
                className="client-hero-switch-store"
                onClick={onSwitchStore}
                title="Trocar de loja"
                type="button"
              >
                <VendorIcon name="split" size={18} />
              </button>
            ) : null}
            {customer && onOpenAccount ? (
            <button
              aria-label="Minha conta"
              className="client-hero-avatar-button"
              onClick={onOpenAccount}
              type="button"
            >
              <div aria-hidden="true" className="vendor-avatar client-hero-avatar">
                {customerInitial}
              </div>
            </button>
          ) : (
            <div aria-hidden="true" className="vendor-avatar client-hero-avatar">
              {customerInitial}
            </div>
          )}
          </div>
        </div>
        <div className="client-search">
          <VendorIcon name="search" size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto..."
            type="search"
            value={query}
          />
          {query ? (
            <button aria-label="Limpar busca" onClick={() => setQuery("")} type="button">
              <VendorIcon name="x" size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="client-categories">
        {categories.map((item) => (
          <button
            className={category === item ? "client-category-chip client-category-chip-active" : "client-category-chip"}
            key={item}
            onClick={() => setCategory(item)}
            type="button"
          >
            {item === "todas" ? "Todas" : item}
          </button>
        ))}
      </div>

      <div className="client-catalog-count">
        <span>
          {list.length} {list.length === 1 ? "produto" : "produtos"}
        </span>
      </div>

      <div className="client-product-grid">
        {list.map((product) => {
          const currentQty = productCartQuantity(cart, product.id);
          const atLimit = !product.sell_without_stock && currentQty >= product.stock_qty;
          const availability = stockLabel(product);
          const displayPrice = getEffectivePrice(
            {
              price: product.price,
              promo_price: product.promo_price,
              wholesale_price: product.wholesale_price,
              wholesale_min_qty: product.wholesale_min_qty
            },
            Math.max(1, currentQty)
          );

          return (
            <article className="client-product-card" key={product.id}>
              <div className="client-product-thumb">
                <ProductThumb
                  product={{
                    name: product.name,
                    thumb_color: product.thumb_color,
                    image_url: product.image_url
                  }}
                  size={96}
                />
              </div>
              <div className="client-product-body">
                <strong>{product.name}</strong>
                {product.variations.length ? (
                  <span className="client-product-variations">
                    {product.variations.slice(0, 3).join(" · ")}
                    {product.variations.length > 3 ? "…" : ""}
                  </span>
                ) : null}
                <div className="client-product-meta">
                  <div className="client-product-pricing">
                    {product.price_visible ? (
                      <strong className="client-product-price">{formatBRL(displayPrice)}</strong>
                    ) : (
                      <span className="client-product-quote">Sob orçamento</span>
                    )}
                    {availability ? (
                      <span className="client-product-stock">{availability}</span>
                    ) : null}
                  </div>
                  {currentQty > 0 ? (
                    <div className="client-product-qty-controls">
                      <button
                        className="client-qty-button"
                        onClick={() => decreaseProduct(product)}
                        type="button"
                      >
                        <VendorIcon name="arrowDown" size={14} />
                      </button>
                      <span className="client-product-qty-value">{currentQty}</span>
                      <button
                        className="client-qty-button client-qty-button-primary"
                        disabled={atLimit}
                        onClick={() => requestAddProduct(product)}
                        type="button"
                      >
                        <VendorIcon name="arrowUp" size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="client-product-add"
                      disabled={maxCartQty(product) <= 0}
                      onClick={() => requestAddProduct(product)}
                      type="button"
                    >
                      <VendorIcon name="plus" size={17} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {cartCount > 0 ? (
        <div className="client-cart-bar">
          <button onClick={() => setCartOpen(true)} type="button">
            <span>{cartCount}</span> Ver pedido <VendorIcon name="chevR" size={18} />
          </button>
        </div>
      ) : null}

      {variationPicker ? (
        <div className="vendor-sheet-backdrop" onClick={() => setVariationPicker(null)} role="presentation">
          <div
            aria-labelledby="variation-picker-title"
            aria-modal="true"
            className="vendor-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="vendor-sheet-handle" />
            <div className="vendor-sheet-header">
              <h2 id="variation-picker-title">Escolha a variação</h2>
              <button
                aria-label="Fechar"
                className="vendor-sheet-close"
                onClick={() => setVariationPicker(null)}
                type="button"
              >
                <VendorIcon name="x" size={20} />
              </button>
            </div>
            <div className="vendor-sheet-body" style={{ display: "grid", gap: 12 }}>
              <p className="vendor-field-hint" style={{ margin: 0 }}>
                {variationPicker.name}
              </p>
              <div className="vendor-chip-row">
                {variationPicker.variations.map((variation, index) => (
                  <button
                    className="vendor-chip"
                    key={`${variation}-${index}`}
                    onClick={() => {
                      adjustCartLine(
                        buildCartLineKey(variationPicker.id, variation),
                        variationPicker,
                        1
                      );
                      setVariationPicker(null);
                    }}
                    type="button"
                  >
                    {variation}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <ClientCartSheet
          cart={cart}
          customer={customer}
          customerId={customer?.id ?? null}
          onClose={() => setCartOpen(false)}
          onSubmitted={onOrderSubmitted}
          products={products}
          setCart={setCart}
          store={store}
        />
      ) : null}
    </div>
  );
}

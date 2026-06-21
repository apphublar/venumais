"use client";

import { useMemo, useState } from "react";
import { ClientCartSheet } from "@/components/client/client-cart-sheet";
import { StoreBrandLogo } from "@/components/client/store-brand-logo";
import { VendorIcon } from "@/components/vendor/icon";
import { ProductThumb } from "@/components/vendor/product-thumb";
import type { ClientSessionCustomer } from "@/lib/client/actions";
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
  isDemo,
  onOpenAccount,
  onOrderSubmitted,
  onSwitchStore,
  products,
  store
}: {
  customer: ClientSessionCustomer | null;
  isDemo?: boolean;
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

  const adjustCart = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((current) => {
      const limit = maxCartQty(product);
      const next = Math.max(0, Math.min(limit, (current[productId] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...current };
        delete copy[productId];
        return copy;
      }

      return { ...current, [productId]: next };
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
          const price = getEffectivePrice({
            price: product.price,
            promo_price: product.promo_price
          });
          const limit = maxCartQty(product);
          const currentQty = cart[product.id] ?? 0;
          const atLimit = !product.sell_without_stock && currentQty >= product.stock_qty;
          const availability = stockLabel(product);

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
                <div className="client-product-meta">
                  <div className="client-product-pricing">
                    {product.price_visible ? (
                      <strong className="client-product-price">{formatBRL(price)}</strong>
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
                        onClick={() => adjustCart(product.id, -1)}
                        type="button"
                      >
                        <VendorIcon name="arrowDown" size={14} />
                      </button>
                      <span className="client-product-qty-value">{currentQty}</span>
                      <button
                        className="client-qty-button client-qty-button-primary"
                        disabled={atLimit}
                        onClick={() => adjustCart(product.id, 1)}
                        type="button"
                      >
                        <VendorIcon name="arrowUp" size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="client-product-add"
                      disabled={limit <= 0}
                      onClick={() => adjustCart(product.id, 1)}
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

      {cartOpen ? (
        <ClientCartSheet
          cart={cart}
          customer={customer}
          customerId={isDemo ? null : customer?.id ?? null}
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

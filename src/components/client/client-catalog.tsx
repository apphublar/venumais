"use client";

import { useMemo, useState } from "react";
import { ClientCartSheet } from "@/components/client/client-cart-sheet";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorIcon } from "@/components/vendor/icon";
import { ProductThumb } from "@/components/vendor/product-thumb";
import type { ClientSessionCustomer } from "@/lib/client/actions";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import type { PublicProduct, PublicStore } from "@/lib/client/queries";
import { getCustomerInitials } from "@/lib/customers/format";

export function ClientCatalog({
  customer,
  isDemo,
  onOpenAccount,
  onOrderSubmitted,
  products,
  store
}: {
  customer: ClientSessionCustomer | null;
  isDemo?: boolean;
  onOpenAccount?: () => void;
  onOrderSubmitted: (message: string) => void;
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
    setCart((current) => {
      const next = Math.max(0, (current[productId] ?? 0) + delta);
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
          <VendorBrandMark label={store.name} size={50} radius={15} />
          <div>
            <strong>{store.name}</strong>
            <span>{store.catalog_tagline}</span>
          </div>
          {customer && onOpenAccount ? (
            <button
              aria-label="Minha conta"
              className="client-hero-avatar-button"
              onClick={onOpenAccount}
              type="button"
            >
              <div
                aria-hidden="true"
                className="vendor-avatar"
                style={{ width: 38, height: 38, background: customer.avatar_color }}
              >
                {customerInitial}
              </div>
            </button>
          ) : (
            <div
              aria-hidden="true"
              className="vendor-avatar"
              style={{ width: 38, height: 38, background: "rgba(255,255,255,0.22)" }}
            >
              {customerInitial}
            </div>
          )}
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
            className={category === item ? "vendor-filter-chip-active" : "vendor-filter-chip"}
            key={item}
            onClick={() => setCategory(item)}
            type="button"
          >
            {item === "todas" ? "Todas" : item}
          </button>
        ))}
      </div>

      <div className="vendor-section-label" style={{ margin: "10px 18px" }}>
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
                <div
                  className="vendor-dashboard-stock-label"
                  style={{ marginTop: 8, justifyContent: "space-between" }}
                >
                  {product.price_visible ? (
                    <strong className="vendor-text-success">{formatBRL(price)}</strong>
                  ) : (
                    <span className="vendor-sale-row-installment" style={{ fontSize: "0.72rem" }}>
                      Sob orçamento
                    </span>
                  )}
                  {cart[product.id] > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <button
                        className="vendor-step-button"
                        onClick={() => adjustCart(product.id, -1)}
                        type="button"
                      >
                        <VendorIcon name="arrowDown" size={14} />
                      </button>
                      <span>{cart[product.id]}</span>
                      <button
                        className="vendor-step-button vendor-step-button-primary"
                        onClick={() => adjustCart(product.id, 1)}
                        type="button"
                      >
                        <VendorIcon name="arrowUp" size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="vendor-step-button vendor-step-button-primary"
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

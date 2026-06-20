"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import type { Product } from "@/lib/database/types";

export function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.category.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  return (
    <section className="vendor-screen-body">
      <div className="vendor-search">
        <VendorIcon name="search" size={18} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar produto"
          type="search"
          value={query}
        />
      </div>

      {filtered.length ? (
        <div className="vendor-list">
          {filtered.map((product) => {
            const effectivePrice = getEffectivePrice(product);
            const lowStock = product.stock_qty <= product.min_stock_qty;

            return (
              <Link href={`/painel/estoque/${product.id}`} key={product.id}>
                <VendorCard className="vendor-product-card">
                  <ProductThumb product={product} />
                  <div className="vendor-product-card-body">
                    <strong>{product.name}</strong>
                    <span>
                      {product.category}
                      {!product.price_visible ? (
                        <em className="vendor-product-no-price"> sem preço</em>
                      ) : null}
                    </span>
                  </div>
                  <div className="vendor-product-card-meta">
                    {product.price_visible ? (
                      <strong>{formatBRL(effectivePrice)}</strong>
                    ) : (
                      <span>—</span>
                    )}
                    <small className={lowStock ? "vendor-text-warning" : ""}>
                      {product.stock_qty} un.
                    </small>
                  </div>
                </VendorCard>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="vendor-empty">
          <strong>{query ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}</strong>
          <p>
            {query
              ? "Tente outro nome, categoria ou SKU."
              : "Cadastre o primeiro produto da sua loja."}
          </p>
        </div>
      )}
    </section>
  );
}

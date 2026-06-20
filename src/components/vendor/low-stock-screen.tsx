import Link from "next/link";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { ProductThumb } from "@/components/vendor/product-thumb";
import type { Product } from "@/lib/database/types";

export function LowStockScreen({ products }: { products: Product[] }) {
  return (
    <section className="vendor-screen-body vendor-low-stock">
      <VendorCard className="vendor-low-stock-alert">
        <span className="vendor-low-stock-alert-icon">
          <VendorIcon name="alert" size={22} />
        </span>
        <p>
          {products.length ? (
            <>
              <strong>
                {products.length} produto{products.length === 1 ? "" : "s"} precisa
                {products.length === 1 ? "" : "m"}
              </strong>{" "}
              de reposição. Toque para repor o estoque.
            </>
          ) : (
            "Tudo certo! Nenhum produto com estoque baixo."
          )}
        </p>
      </VendorCard>

      {products.map((product) => (
        <Link href={`/painel/estoque/${product.id}`} key={product.id}>
          <VendorCard className="vendor-low-stock-row">
            <ProductThumb product={product} size={50} />
            <div className="vendor-low-stock-row-copy">
              <strong>{product.name}</strong>
              <span>
                {product.category}
                {product.sku ? ` · ${product.sku}` : ""}
              </span>
            </div>
            <div className="vendor-low-stock-row-side">
              <span
                className={`vendor-low-stock-badge ${
                  product.stock_qty === 0 ? "vendor-low-stock-badge-empty" : ""
                }`.trim()}
              >
                {product.stock_qty === 0 ? "Esgotado" : `${product.stock_qty} un.`}
              </span>
              <small>
                <VendorIcon name="plus" size={12} /> Repor
              </small>
            </div>
          </VendorCard>
        </Link>
      ))}

      {!products.length ? (
        <div className="vendor-empty vendor-empty-compact">
          <p>Nenhum produto com estoque baixo 🎉</p>
        </div>
      ) : null}

      <div className="vendor-dashboard-spacer" />
    </section>
  );
}

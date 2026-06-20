import Link from "next/link";
import { VendorCard } from "@/components/vendor/card";
import { ProductList } from "@/components/vendor/product-list";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL, getProductMetrics } from "@/lib/products/format";
import { listStoreProducts } from "@/lib/products/queries";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function EstoquePage() {
  const { store } = await requireStoreAccess();
  const products = await listStoreProducts(store.id);
  const metrics = getProductMetrics(products);

  return (
    <>
      <VendorScreenHeader
        action={
          <Link
            aria-label="Novo produto"
            className="vendor-icon-button vendor-icon-button-primary"
            href="/painel/estoque/novo"
          >
            <VendorIcon name="plus" size={20} />
          </Link>
        }
        big
        subtitle={`${products.length} produtos`}
        title="Estoque"
      />

      <section className="vendor-screen-body vendor-screen-body-tight">
        <div className="vendor-metric-grid">
          <VendorCard className="vendor-metric-card">
            <span>Investido</span>
            <strong>{formatBRL(metrics.invested)}</strong>
          </VendorCard>
          <VendorCard className="vendor-metric-card">
            <span>Potencial venda</span>
            <strong className="vendor-text-success">{formatBRL(metrics.potential)}</strong>
          </VendorCard>
        </div>
      </section>

      <ProductList products={products} />
    </>
  );
}

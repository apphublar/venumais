import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/vendor/product-form";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorCard } from "@/components/vendor/card";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import {
  adjustProductStockAction,
  deleteProductAction,
  updateProductAction
} from "@/lib/products/actions";
import {
  formatBRL,
  formatVariations,
  getEffectivePrice
} from "@/lib/products/format";
import {
  getStoreProduct,
  listStoreProductCategories
} from "@/lib/products/queries";
import { requireStoreAccess } from "@/lib/auth/session";

type ProdutoDetalhePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; error?: string }>;
};

export default async function ProdutoDetalhePage({
  params,
  searchParams
}: ProdutoDetalhePageProps) {
  const { store } = await requireStoreAccess();
  const { id } = await params;
  const query = await searchParams;
  const product = await getStoreProduct(store.id, id);

  if (!product) {
    notFound();
  }

  const categories = await listStoreProductCategories(store.id);
  const updateAction = updateProductAction.bind(null, product.id);
  const deleteAction = deleteProductAction.bind(null, product.id);
  const decreaseStock = adjustProductStockAction.bind(null, product.id, -1);
  const increaseStock = adjustProductStockAction.bind(null, product.id, 1);
  const effectivePrice = getEffectivePrice(product);
  const unitProfit = effectivePrice - product.cost;
  const margin =
    effectivePrice > 0 ? Math.round((unitProfit / effectivePrice) * 100) : 0;

  if (query.edit === "1") {
    return (
      <div className="vendor-form-screen">
        <VendorScreenHeader
          backHref={`/painel/estoque/${product.id}`}
          title="Editar produto"
        />
        <ProductForm
          action={updateAction}
          categories={categories}
          product={product}
          submitLabel="Salvar alterações"
        />
      </div>
    );
  }

  return (
    <>
      <VendorScreenHeader
        action={
          <Link
            aria-label="Editar produto"
            className="vendor-icon-button"
            href={`/painel/estoque/${product.id}?edit=1`}
          >
            <VendorIcon name="edit" size={18} />
          </Link>
        }
        backHref="/painel/estoque"
        subtitle={product.sku || product.category}
        title={product.name}
      />

      <section className="vendor-screen-body">
        {query.error === "delete" ? (
          <p className="vendor-message vendor-message-error" role="alert">
            Não foi possível excluir o produto. Tente novamente.
          </p>
        ) : null}

        <VendorCard className="vendor-detail-hero">
          <ProductThumb product={product} size={78} />
          <div>
            <strong>{product.name}</strong>
            <span>
              {product.category}
              {product.sku ? ` · ${product.sku}` : ""}
            </span>
            {!product.active ? <span className="vendor-text-warning">Inativo</span> : null}
          </div>
        </VendorCard>

        <VendorCard className="vendor-detail-rows">
          <div>
            <span>Custo de aquisição</span>
            <strong>{formatBRL(product.cost)}</strong>
          </div>
          <div>
            <span>Preço de venda</span>
            <strong>
              {product.price_visible && effectivePrice > 0
                ? formatBRL(effectivePrice)
                : "A combinar"}
            </strong>
          </div>
          <div>
            <span>Lucro por unidade</span>
            <strong className="vendor-text-success">
              {effectivePrice > 0
                ? `${formatBRL(unitProfit)} · ${margin}%`
                : "—"}
            </strong>
          </div>
        </VendorCard>

        <VendorCard className="vendor-detail-toggle">
          <div className={`vendor-detail-toggle-icon ${product.price_visible ? "is-visible" : ""}`}>
            <VendorIcon name={product.price_visible ? "eye" : "eyeOff"} size={20} />
          </div>
          <div>
            <strong>Exibir preço para o cliente</strong>
            <span>
              {product.price_visible
                ? "Aparece com valor no catálogo"
                : "Cliente vê o produto e pede orçamento"}
            </span>
          </div>
        </VendorCard>

        {product.variations.length ? (
          <VendorCard className="vendor-detail-info">
            <p>
              <VendorIcon name="box" size={17} />
              <span>Variações: {formatVariations(product.variations)}</span>
            </p>
          </VendorCard>
        ) : null}

        <div className="vendor-section-label">Estoque</div>

        <VendorCard className="vendor-stock-card">
          <div>
            <span>Disponível</span>
            <strong>
              {product.stock_qty} <small>un.</small>
            </strong>
          </div>
          <div className="vendor-stock-actions">
            <form action={decreaseStock}>
              <button aria-label="Diminuir estoque" className="vendor-step-button" type="submit">
                <VendorIcon name="arrowDown" size={20} />
              </button>
            </form>
            <form action={increaseStock}>
              <button aria-label="Aumentar estoque" className="vendor-step-button vendor-step-button-primary" type="submit">
                <VendorIcon name="arrowUp" size={20} />
              </button>
            </form>
          </div>
        </VendorCard>

        <div className="vendor-metric-grid">
          <VendorCard className="vendor-metric-card">
            <span>Investido</span>
            <strong>{formatBRL(product.cost * product.stock_qty)}</strong>
          </VendorCard>
          <VendorCard className="vendor-metric-card">
            <span>Lucro potencial</span>
            <strong className="vendor-text-success">
              {formatBRL(unitProfit * product.stock_qty)}
            </strong>
          </VendorCard>
        </div>

        <form action={deleteAction}>
          <button className="vendor-button vendor-button-danger vendor-button-danger-full" type="submit">
            <VendorIcon name="trash" size={18} />
            Excluir produto
          </button>
        </form>
      </section>
    </>
  );
}

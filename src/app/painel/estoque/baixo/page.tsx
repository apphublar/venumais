import { LowStockScreen } from "@/components/vendor/low-stock-screen";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { requireStoreAccess } from "@/lib/auth/session";
import { listLowStockProducts } from "@/lib/products/queries";

export default async function EstoqueBaixoPage() {
  const { store } = await requireStoreAccess();
  const products = await listLowStockProducts(store.id);

  return (
    <>
      <VendorScreenHeader
        backHref="/painel"
        subtitle="Produtos com 2 unidades ou menos"
        title="Estoque baixo"
      />
      <LowStockScreen products={products} />
    </>
  );
}

import { NewSaleWizard } from "@/components/vendor/new-sale-wizard";
import { listStoreCoupons } from "@/lib/coupons/queries";
import { listStoreCustomers } from "@/lib/customers/queries";
import { listStoreProducts } from "@/lib/products/queries";
import { requireStoreAccess } from "@/lib/auth/session";

type NovaVendaPageProps = {
  searchParams: Promise<{ cliente?: string }>;
};

export default async function NovaVendaPage({ searchParams }: NovaVendaPageProps) {
  const { store } = await requireStoreAccess();
  const params = await searchParams;
  const [customers, products, coupons] = await Promise.all([
    listStoreCustomers(store.id),
    listStoreProducts(store.id),
    listStoreCoupons(store.id)
  ]);

  return (
    <NewSaleWizard
      coupons={coupons}
      customers={customers}
      initialCustomerId={params.cliente}
      products={products}
      storeName={store.name}
      storeSlug={store.slug}
    />
  );
}

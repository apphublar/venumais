import { notFound } from "next/navigation";
import { ReciboView } from "@/components/vendor/recibo-view";
import { requireStoreAccess } from "@/lib/auth/session";
import { getStoreSale } from "@/lib/sales/queries";

export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireStoreAccess();
  const { id } = await params;
  const sale = await getStoreSale(store.id, id);

  if (!sale) {
    notFound();
  }

  return (
    <ReciboView
      backHref={`/painel/vendas/${sale.id}`}
      sale={sale}
      store={{ name: store.name, slug: store.slug }}
    />
  );
}

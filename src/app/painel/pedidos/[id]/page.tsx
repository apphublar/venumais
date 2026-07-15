import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/vendor/order-detail-view";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { getStoreOrder } from "@/lib/client/orders";
import { requireStoreAccess } from "@/lib/auth/session";
import { formatSaleDate } from "@/lib/sales/format";

type PedidoDetalhePageProps = {
  params: Promise<{ id: string }>;
};

function orderHeaderTitle(order: Awaited<ReturnType<typeof getStoreOrder>>) {
  if (!order) {
    return "Pedido";
  }

  const code = String(order.order_code).padStart(4, "0");

  if (order.order_type === "wholesale") {
    return `Encomenda #${code}`;
  }

  if (order.status === "quoted" || order.status === "quote" || order.order_type === "quote") {
    return `Orçamento #${code}`;
  }

  return `Pedido #${code}`;
}

export default async function PedidoDetalhePage({ params }: PedidoDetalhePageProps) {
  const { store } = await requireStoreAccess();
  const { id } = await params;
  const order = await getStoreOrder(store.id, id).catch(() => null);

  if (!order) {
    notFound();
  }

  return (
    <>
      <VendorScreenHeader
        backHref="/painel/pedidos"
        subtitle={formatSaleDate(order.created_at)}
        title={orderHeaderTitle(order)}
      />
      <OrderDetailView order={order} storeId={store.id} />
    </>
  );
}

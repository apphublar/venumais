import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/vendor/order-detail-view";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { getStoreOrder } from "@/lib/client/orders";
import { requireStoreAccess } from "@/lib/auth/session";

type PedidoDetalhePageProps = {
  params: Promise<{ id: string }>;
};

function orderHeaderTitle(order: Awaited<ReturnType<typeof getStoreOrder>>) {
  if (!order) {
    return "Pedido";
  }

  if (order.order_type === "wholesale") {
    return `Encomenda #${order.order_code}`;
  }

  if (order.status === "quoted" || order.order_type === "quote") {
    return `Orçamento #${order.order_code}`;
  }

  return `Pedido #${order.order_code}`;
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
        subtitle={`${order.customer.full_name} · ${new Date(order.created_at).toLocaleDateString("pt-BR")}`}
        title={orderHeaderTitle(order)}
      />
      <OrderDetailView order={order} storeId={store.id} />
    </>
  );
}

import Link from "next/link";
import { OrdersScreen } from "@/components/vendor/orders-screen";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import {
  listCancelledStoreOrders,
  listVendorStoreOrders
} from "@/lib/client/queries";
import { getDashboardData, listReceivableInstallments } from "@/lib/sales/dashboard";
import { listStoreSales } from "@/lib/sales/queries";
import { requireStoreAccess } from "@/lib/auth/session";

type PedidosPageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const { store } = await requireStoreAccess();
  const query = await searchParams;
  const [sales, dashboard, installments, catalogOrders, cancelledOrders] = await Promise.all([
    listStoreSales(store.id),
    getDashboardData(store.id),
    listReceivableInstallments(store.id),
    listVendorStoreOrders(store.id).catch(() => []),
    listCancelledStoreOrders(store.id).catch(() => [])
  ]);

  const receivableTotal = installments.reduce((total, row) => total + row.amount, 0);
  const newCount = catalogOrders.filter((order) =>
    [
      "new", "quote", "quoted", "quote_answered",
      "awaiting_payment", "awaiting_card", "cash_on_delivery",
      "payment_review"
    ].includes(order.status)
  ).length;

  return (
    <>
      <VendorScreenHeader
        action={
          <Link
            aria-label="Nova venda"
            className="vendor-icon-button vendor-icon-button-primary"
            href="/painel/vendas/nova"
          >
            <VendorIcon name="plus" size={20} />
          </Link>
        }
        big
        subtitle={`${sales.length + newCount} no total · ${newCount} novos`}
        title="Pedidos"
      />
      <OrdersScreen
        cancelledOrders={cancelledOrders}
        catalogOrders={catalogOrders}
        initialFilter={query.filter}
        key={`orders-${query.filter ?? "all"}`}
        overdueTotal={dashboard.receivables.overdue}
        receivableTotal={receivableTotal}
        sales={sales}
        storeName={store.name}
      />
    </>
  );
}

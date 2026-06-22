import Link from "next/link";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import { CustomerList } from "@/components/vendor/customer-list";
import { listStoreCustomers } from "@/lib/customers/queries";
import { getCustomerBalances } from "@/lib/sales/queries";
import { listVendorOrderConversations } from "@/lib/client/queries";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function ClientesPage() {
  const { store } = await requireStoreAccess();
  const [customers, balances, conversations] = await Promise.all([
    listStoreCustomers(store.id),
    getCustomerBalances(store.id),
    listVendorOrderConversations(store.id).catch(() => [])
  ]);
  const chatUnreadCount = conversations.reduce((total, row) => total + row.unread_count, 0);

  return (
    <>
      <VendorScreenHeader
        action={
          <div className="vendor-header-actions">
            <Link
              aria-label="Chats com clientes"
              className="vendor-icon-button vendor-icon-button-chat"
              href="/painel/chats"
            >
              <VendorIcon name="message" size={20} />
              {chatUnreadCount > 0 ? (
                <span aria-label={`${chatUnreadCount} mensagens não lidas`} className="vendor-notif-badge">
                  {chatUnreadCount}
                </span>
              ) : null}
            </Link>
            <Link
              aria-label="Novo cliente"
              className="vendor-icon-button vendor-icon-button-primary"
              href="/painel/clientes/novo"
            >
              <VendorIcon name="plus" size={20} />
            </Link>
          </div>
        }
        big
        subtitle={`${customers.length} cadastrados`}
        title="Clientes"
      />
      <CustomerList balances={balances} customers={customers} />
    </>
  );
}

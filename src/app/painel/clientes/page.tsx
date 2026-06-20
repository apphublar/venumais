import Link from "next/link";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import { CustomerList } from "@/components/vendor/customer-list";
import { listStoreCustomers } from "@/lib/customers/queries";
import { getCustomerBalances } from "@/lib/sales/queries";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function ClientesPage() {
  const { store } = await requireStoreAccess();
  const [customers, balances] = await Promise.all([
    listStoreCustomers(store.id),
    getCustomerBalances(store.id)
  ]);

  return (
    <>
      <VendorScreenHeader
        action={
          <Link aria-label="Novo cliente" className="vendor-icon-button vendor-icon-button-primary" href="/painel/clientes/novo">
            <VendorIcon name="plus" size={20} />
          </Link>
        }
        big
        subtitle={`${customers.length} cadastrados`}
        title="Clientes"
      />
      <CustomerList balances={balances} customers={customers} />
    </>
  );
}

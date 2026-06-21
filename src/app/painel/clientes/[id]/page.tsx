import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/vendor/customer-form";
import {
  CustomerDetailHeader,
  CustomerDetailView
} from "@/components/vendor/customer-detail-view";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import {
  deleteCustomerAction,
  updateCustomerAction
} from "@/lib/customers/actions";
import { normalizePhone } from "@/lib/customers/format";
import { getStoreCustomer } from "@/lib/customers/queries";
import { listCustomerAccountChangeRequests } from "@/lib/customers/account-requests";
import { getCustomerPaymentSummary, listCustomerSales } from "@/lib/sales/queries";
import { requireStoreAccess } from "@/lib/auth/session";

type ClienteDetalhePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; error?: string }>;
};

export default async function ClienteDetalhePage({
  params,
  searchParams
}: ClienteDetalhePageProps) {
  const { store } = await requireStoreAccess();
  const { id } = await params;
  const query = await searchParams;
  const customer = await getStoreCustomer(store.id, id);

  if (!customer) {
    notFound();
  }

  const customerId = customer.id;

  async function deleteCustomer() {
    "use server";
    await deleteCustomerAction(customerId);
  }

  const [paymentSummary, sales, accountChangeRequests] = await Promise.all([
    getCustomerPaymentSummary(store.id, customer.id),
    listCustomerSales(store.id, customer.id),
    listCustomerAccountChangeRequests(store.id, customer.id)
  ]);

  const updateAction = updateCustomerAction.bind(null, customer.id);

  const whatsappHref = customer.phone
    ? `https://wa.me/55${normalizePhone(customer.phone)}`
    : undefined;

  if (query.edit === "1") {
    return (
      <div className="vendor-form-screen">
        <VendorScreenHeader
          backHref={`/painel/clientes/${customer.id}`}
          title="Editar cliente"
        />
        <CustomerForm
          action={updateAction}
          customer={customer}
          submitLabel="Salvar alterações"
        />
      </div>
    );
  }

  return (
    <>
      <CustomerDetailHeader customer={customer} whatsappHref={whatsappHref} />

      {query.error === "delete" ? (
        <section className="vendor-screen-body">
          <p className="vendor-message vendor-message-error" role="alert">
            Não foi possível excluir o cliente. Tente novamente.
          </p>
        </section>
      ) : null}

      <CustomerDetailView
        accountChangeRequests={accountChangeRequests}
        customer={customer}
        deleteAction={deleteCustomer}
        paymentSummary={paymentSummary}
        sales={sales}
      />
    </>
  );
}

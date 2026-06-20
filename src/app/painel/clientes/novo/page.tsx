import { CustomerForm } from "@/components/vendor/customer-form";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { createCustomerAction } from "@/lib/customers/actions";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function NovoClientePage() {
  await requireStoreAccess();

  return (
    <div className="vendor-form-screen">
      <VendorScreenHeader backHref="/painel/clientes" title="Novo cliente" />
      <CustomerForm action={createCustomerAction} submitLabel="Cadastrar cliente" />
    </div>
  );
}

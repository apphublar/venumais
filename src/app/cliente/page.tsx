import { ClientLoginPage } from "@/components/client/client-login-page";
import { getCurrentUser } from "@/lib/auth/session";
import { listCustomerStoresForPortal } from "@/lib/client/queries";

type ClientePageProps = {
  searchParams: Promise<{
    step?: string;
  }>;
};

export default async function ClientePage({ searchParams }: ClientePageProps) {
  const params = await searchParams;
  const initialSubStep = params.step === "stores" ? "stores" : params.step === "link" ? "link" : "login";
  const user = await getCurrentUser();
  const customerStores = user ? await listCustomerStoresForPortal().catch(() => []) : [];

  return (
    <ClientLoginPage
      customerStores={customerStores}
      initialSubStep={initialSubStep}
      key={`${initialSubStep}:${customerStores.length}`}
    />
  );
}

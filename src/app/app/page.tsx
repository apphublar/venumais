import { AppLoginPage } from "@/components/auth/app-login-page";
import { getActiveStore, getCurrentUser } from "@/lib/auth/session";
import { listCustomerStoresForPortal } from "@/lib/client/queries";

type AppPageProps = {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    step?: string;
  }>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  const initialStep =
    params.mode === "client" ? "client" : params.mode === "vendor" ? "vendor" : "gateway";
  const initialClientSubStep = params.step === "stores" ? "stores" : "login";
  const nextPath = params.next ?? "/painel";
  const user = await getCurrentUser();
  const activeStore = user ? await getActiveStore(user.id) : null;
  const customerStores =
    user && (initialStep === "client" || params.step === "stores")
      ? await listCustomerStoresForPortal().catch(() => [])
      : [];

  return (
    <AppLoginPage
      customerStores={customerStores}
      gatewayTitle={activeStore?.name ?? "VENUMAIS"}
      initialClientSubStep={initialClientSubStep}
      initialStep={initialStep}
      key={`${initialStep}:${initialClientSubStep}:${nextPath}:${customerStores.length}:${activeStore?.name ?? "VENUMAIS"}`}
      nextPath={nextPath}
    />
  );
}

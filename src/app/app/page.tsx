import { AppLoginPage } from "@/components/auth/app-login-page";
import { getActiveStore, getCurrentUser } from "@/lib/auth/session";

type AppPageProps = {
  searchParams: Promise<{
    mode?: string;
    next?: string;
  }>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  const initialStep =
    params.mode === "client" ? "client" : params.mode === "vendor" ? "vendor" : "gateway";
  const nextPath = params.next ?? "/painel";
  const user = await getCurrentUser();
  const activeStore = user ? await getActiveStore(user.id) : null;

  return (
    <AppLoginPage
      gatewayTitle={activeStore?.name ?? "VENUMAIS"}
      initialStep={initialStep}
      key={`${initialStep}:${nextPath}:${activeStore?.name ?? "VENUMAIS"}`}
      nextPath={nextPath}
    />
  );
}

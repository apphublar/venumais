import { redirect } from "next/navigation";
import { StoreSettingsScreen } from "@/components/vendor/store-settings-screen";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function ConfiguracoesPage() {
  const { store } = await requireStoreAccess();

  if (store.role !== "owner") {
    redirect("/painel");
  }

  return <StoreSettingsScreen store={store} />;
}

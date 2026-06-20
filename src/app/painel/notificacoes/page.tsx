import { NotificationsScreen } from "@/components/vendor/notifications-screen";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function NotificacoesPage() {
  await requireStoreAccess();

  return <NotificationsScreen />;
}

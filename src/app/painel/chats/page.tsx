import { VendorChatsScreen } from "@/components/vendor/vendor-chats-screen";
import { listVendorOrderConversations } from "@/lib/client/queries";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function VendorChatsPage() {
  const { store } = await requireStoreAccess();
  const conversations = await listVendorOrderConversations(store.id).catch(() => []);

  return <VendorChatsScreen conversations={conversations} storeName={store.name} />;
}

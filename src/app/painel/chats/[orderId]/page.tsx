import { VendorChatThread } from "@/components/vendor/vendor-chat-thread";
import { getStoreOrder } from "@/lib/client/orders";
import { requireStoreAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";

type VendorChatPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function VendorChatPage({ params }: VendorChatPageProps) {
  const { orderId } = await params;
  const { store } = await requireStoreAccess();
  const order = await getStoreOrder(store.id, orderId);

  if (!order) {
    notFound();
  }

  return <VendorChatThread order={order} storeId={store.id} />;
}

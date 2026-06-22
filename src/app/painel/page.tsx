import { VendorDashboard } from "@/components/vendor/vendor-dashboard";
import { getDashboardData, listReceivableInstallments } from "@/lib/sales/dashboard";
import { listVendorOrderConversations } from "@/lib/client/queries";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function PainelPage() {
  const { profile, store } = await requireStoreAccess();
  const [data, cobrancaInstallments, conversations] = await Promise.all([
    getDashboardData(store.id),
    listReceivableInstallments(store.id),
    listVendorOrderConversations(store.id).catch(() => [])
  ]);
  const chatUnreadCount = conversations.reduce((total, row) => total + row.unread_count, 0);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Usuário";
  const storeInitial = store.name.trim().charAt(0) || "V";

  return (
    <VendorDashboard
      chatUnreadCount={chatUnreadCount}
      cobrancaInstallments={cobrancaInstallments}
      data={data}
      isSeller={store.role === "seller"}
      sellerFirstName={firstName}
      store={{
        name: store.name,
        logo_url: store.logo_url,
        pix_key: store.pix_key,
        pix_receiver_name: store.pix_receiver_name
      }}
      storeInitial={storeInitial}
      storeName={store.name}
    />
  );
}

import { Hanken_Grotesk } from "next/font/google";
import { VendorShell } from "@/components/vendor/shell";
import { requireStoreAccess } from "@/lib/auth/session";
import { listVendorOrderConversations } from "@/lib/client/queries";
import "@/styles/vendor.css";
import "@/styles/vendor-cobranca.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700", "800"]
});

export default async function PainelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { store } = await requireStoreAccess();
  const conversations = await listVendorOrderConversations(store.id).catch(() => []);
  const chatUnreadCount = conversations.reduce((total, row) => total + row.unread_count, 0);

  return (
    <div className={hanken.variable}>
      <VendorShell chatUnreadCount={chatUnreadCount}>{children}</VendorShell>
    </div>
  );
}

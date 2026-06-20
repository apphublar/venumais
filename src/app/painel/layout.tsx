import { Hanken_Grotesk } from "next/font/google";
import { VendorShell } from "@/components/vendor/shell";
import { requireStoreAccess } from "@/lib/auth/session";
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
  await requireStoreAccess();

  return (
    <div className={hanken.variable}>
      <VendorShell>{children}</VendorShell>
    </div>
  );
}

import { Hanken_Grotesk } from "next/font/google";
import { VendorShell } from "@/components/vendor/shell";
import { requireStoreAccess } from "@/lib/auth/session";
import { getBrandColorVars } from "@/lib/stores/brand-color";
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
  const brandVars = getBrandColorVars(store.brand_color);

  return (
    <div className={hanken.variable} style={brandVars as React.CSSProperties}>
      <VendorShell>{children}</VendorShell>
    </div>
  );
}

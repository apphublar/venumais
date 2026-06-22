import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { getPublicStoreBySlug } from "@/lib/client/queries";
import { resolveStoreBrandStyle } from "@/lib/stores/brand-color";
import "@/styles/client.css";

export const dynamic = "force-dynamic";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  title: "Catálogo",
  applicationName: "VENUMAIS Cliente"
};

type LojaLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function LojaLayout({ children, params }: LojaLayoutProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug).catch(() => null);
  const brandStyle = store ? (resolveStoreBrandStyle(store) as React.CSSProperties) : undefined;

  return (
    <div className={hanken.variable} style={brandStyle}>
      {children}
    </div>
  );
}

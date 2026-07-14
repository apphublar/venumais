import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const appSans = Hanken_Grotesk({ variable: "--font-app-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "VENUMAIS — Venda mais, organize melhor",
    template: "%s | VENUMAIS"
  },
  description: "Gestão de vendas, estoque, clientes e crediário para pequenos negócios.",
  applicationName: "VENUMAIS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VENUMAIS"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  openGraph: { locale: "pt_BR", siteName: "VENUMAIS", type: "website" }
};

export const viewport: Viewport = {
  themeColor: "#6D5CE0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${appSans.variable} ${geistMono.variable}`} lang="pt-BR">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

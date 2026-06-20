"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VendorIcon } from "@/components/vendor/icon";

const NAV_ITEMS = [
  { href: "/painel", icon: "home" as const, label: "Início", exact: true },
  { href: "/painel/pedidos", icon: "receipt" as const, label: "Pedidos" },
  { href: "/painel/clientes", icon: "users" as const, label: "Clientes" },
  { href: "/painel/estoque", icon: "box" as const, label: "Estoque" }
];

export function VendorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav =
    pathname === "/painel/vendas" ||
    pathname.startsWith("/painel/a-receber") ||
    pathname.startsWith("/painel/inadimplencia") ||
    pathname.startsWith("/painel/notificacoes") ||
    pathname.startsWith("/painel/cupons") ||
    pathname.startsWith("/painel/equipe") ||
    pathname.startsWith("/painel/aniversariantes") ||
    pathname.startsWith("/painel/configuracoes") ||
    pathname.startsWith("/painel/estoque/baixo") ||
    pathname.startsWith("/painel/clientes/novo") ||
    /^\/painel\/clientes\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/painel/estoque/novo") ||
    /^\/painel\/estoque\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/painel/vendas/nova") ||
    /^\/painel\/vendas\/[^/]+\/recibo$/.test(pathname) ||
    /^\/painel\/vendas\/[^/]+$/.test(pathname) ||
    /^\/painel\/pedidos\/[^/]+$/.test(pathname);

  return (
    <div className="vendor-app">
      <main className="vendor-main">{children}</main>

      {!hideNav ? (
        <nav aria-label="Navegação principal" className="vendor-bottom-nav">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <VendorNavButton item={item} key={item.href} pathname={pathname} />
          ))}

          <div className="vendor-fab-slot">
            <Link
              aria-label="Nova venda"
              className="vendor-fab"
              href="/painel/vendas/nova"
            >
              <VendorIcon name="plus" size={28} />
            </Link>
          </div>

          {NAV_ITEMS.slice(2).map((item) => (
            <VendorNavButton item={item} key={item.href} pathname={pathname} />
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function VendorNavButton({
  item,
  pathname
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`vendor-nav-button ${active ? "vendor-nav-button-active" : ""}`}
      href={item.href}
    >
      <span className="vendor-nav-icon">
        <VendorIcon name={item.icon} size={22} stroke={active ? 2.3 : 1.9} />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

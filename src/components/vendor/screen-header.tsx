import Link from "next/link";
import type { ReactNode } from "react";
import { VendorIcon } from "@/components/vendor/icon";

export function VendorScreenHeader({
  title,
  subtitle,
  backHref,
  action,
  big = false
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
  big?: boolean;
}) {
  return (
    <header className={`vendor-screen-header ${big ? "vendor-screen-header-big" : ""}`.trim()}>
      <div className="vendor-screen-header-main">
        {backHref ? (
          <Link aria-label="Voltar" className="vendor-icon-button" href={backHref}>
            <VendorIcon name="chevL" size={20} />
          </Link>
        ) : null}
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="vendor-screen-header-action">{action}</div> : null}
    </header>
  );
}

"use client";

import type { ReactNode } from "react";
import { VendorIcon } from "@/components/vendor/icon";

export function ClientScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  big = false
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  big?: boolean;
}) {
  return (
    <header className={`client-screen-header ${big ? "client-screen-header-big" : ""}`.trim()}>
      <div className="client-screen-header-main">
        {onBack ? (
          <button aria-label="Voltar" className="client-icon-button" onClick={onBack} type="button">
            <VendorIcon name="chevL" size={20} />
          </button>
        ) : null}
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="client-screen-header-action">{action}</div> : null}
    </header>
  );
}

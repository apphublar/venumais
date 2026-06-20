"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import {
  formatSaleCode,
  formatSaleDate,
  getOpenAmount,
  getSaleStatus,
  SALE_STATUS_LABELS
} from "@/lib/sales/format";
import type { SaleWithRelations } from "@/lib/sales/types";

export function SalesList({ sales }: { sales: SaleWithRelations[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return sales;
    }

    return sales.filter((sale) => {
      const customerName = sale.customer?.full_name.toLowerCase() ?? "";
      const code = formatSaleCode(sale.sale_code);
      return customerName.includes(normalized) || code.includes(normalized);
    });
  }, [query, sales]);

  return (
    <section className="vendor-screen-body">
      <div className="vendor-search">
        <VendorIcon name="search" size={18} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar venda ou cliente"
          type="search"
          value={query}
        />
      </div>

      {filtered.length ? (
        <div className="vendor-list">
          {filtered.map((sale) => {
            const status = getSaleStatus(sale.installments);
            const openAmount = getOpenAmount(sale.installments);

            return (
              <Link href={`/painel/vendas/${sale.id}`} key={sale.id}>
                <VendorCard className="vendor-sale-card">
                  <div className="vendor-sale-card-main">
                    <strong>Venda #{formatSaleCode(sale.sale_code)}</strong>
                    <span>
                      {sale.customer?.full_name ?? "Cliente"} · {formatSaleDate(sale.sold_at)}
                    </span>
                  </div>
                  <div className="vendor-sale-card-meta">
                    <strong>{formatBRL(sale.total_amount)}</strong>
                    <span className={`vendor-sale-status vendor-sale-status-${status}`}>
                      {status === "open" && openAmount > 0
                        ? `${SALE_STATUS_LABELS[status]} · ${formatBRL(openAmount)}`
                        : SALE_STATUS_LABELS[status]}
                    </span>
                  </div>
                </VendorCard>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="vendor-empty">
          <strong>{query ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}</strong>
          <p>Registre a primeira venda pelo botão + no painel.</p>
        </div>
      )}
    </section>
  );
}

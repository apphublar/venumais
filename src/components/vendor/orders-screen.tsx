"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorOrderRow } from "@/components/vendor/vendor-order-row";
import { VendorSaleRow } from "@/components/vendor/sale-row";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { formatBRL } from "@/lib/products/format";
import type { CancelledStoreOrder, VendorStoreOrder } from "@/lib/client/queries";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatShortDate, getSaleStatus } from "@/lib/sales/format";
import type { SaleWithRelations } from "@/lib/sales/types";

function todayISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const FILTERS = [
  ["all", "Todos"],
  ["new", "Novos"],
  ["paid", "Pagos"],
  ["open", "A receber"],
  ["overdue", "Em atraso"],
  ["today", "Vence hoje"]
] as const;

type OrderFilter = (typeof FILTERS)[number][0];

const VALID_FILTERS = FILTERS.map(([k]) => k) as OrderFilter[];

export function OrdersScreen({
  cancelledOrders = [],
  catalogOrders,
  initialFilter,
  overdueTotal,
  receivableTotal,
  sales,
  storeName = ""
}: {
  cancelledOrders?: CancelledStoreOrder[];
  catalogOrders: VendorStoreOrder[];
  initialFilter?: string;
  overdueTotal: number;
  receivableTotal: number;
  sales: SaleWithRelations[];
  storeName?: string;
}) {
  const [filter, setFilter] = useState<OrderFilter>(
    VALID_FILTERS.includes(initialFilter as OrderFilter) ? (initialFilter as OrderFilter) : "all"
  );

  const list = useMemo(() => {
    return sales.filter((sale) => {
      const status = getSaleStatus(sale.installments);

      if (filter === "all") {
        return true;
      }

      if (filter === "new") {
        return false;
      }

      if (filter === "paid") {
        return status === "paid";
      }

      if (filter === "open") {
        return status === "open";
      }

      if (filter === "overdue") {
        return status === "overdue";
      }

      if (filter === "today") {
        const today = todayISO();
        return sale.installments.some(
          (installment) => !installment.paid && installment.due_date === today
        );
      }

      return true;
    });
  }, [filter, sales]);

  const openCatalogOrders = catalogOrders.filter((order) =>
    ["new", "quote", "quoted", "awaiting_payment", "payment_review"].includes(order.status)
  );
  const paidCatalogOrders = catalogOrders.filter((order) =>
    ["paid", "delivering", "delivered"].includes(order.status)
  );

  const newCount = openCatalogOrders.length;
  const totalCount = sales.length + catalogOrders.length;

  const todayStr = todayISO();
  const filterCounts: Record<OrderFilter, number> = {
    all: totalCount,
    new: newCount,
    paid:
      sales.filter((s) => getSaleStatus(s.installments) === "paid").length +
      paidCatalogOrders.length,
    open:
      sales.filter((s) => getSaleStatus(s.installments) === "open").length +
      openCatalogOrders.length,
    overdue: sales.filter((s) => getSaleStatus(s.installments) === "overdue").length,
    today: sales.filter((s) => s.installments.some((i) => !i.paid && i.due_date === todayStr)).length
  };

  return (
    <section className="vendor-orders-screen">
      <div className="vendor-orders-summary">
        <Link className="vendor-orders-summary-receivable" href="/painel/a-receber">
          <span>A receber</span>
          <strong>{formatBRL(receivableTotal)}</strong>
        </Link>
        <Link
          className={`vendor-orders-summary-alert ${overdueTotal > 0 ? "is-danger" : ""}`}
          href="/painel/inadimplencia"
        >
          <span>Em atraso</span>
          <strong>{formatBRL(overdueTotal)}</strong>
        </Link>
      </div>

      <div className="vendor-filter-chips vendor-orders-filter-chips">
        {FILTERS.map(([key, label]) => {
          const count = filterCounts[key];
          return (
            <button
              className={filter === key ? "vendor-filter-chip-active vendor-orders-filter-chip" : "vendor-filter-chip vendor-orders-filter-chip"}
              key={key}
              onClick={() => setFilter(key)}
              type="button"
            >
              <span>{label}</span>
              {count > 0 ? <em>{count}</em> : null}
            </button>
          );
        })}
      </div>

      <div className="vendor-orders-list">
        {filter === "new" || filter === "all"
          ? openCatalogOrders.map((order) => <VendorOrderRow key={order.id} order={order} />)
          : null}

        {(filter === "paid" || filter === "all")
          ? paidCatalogOrders.map((order) => <VendorOrderRow key={order.id} order={order} />)
          : null}

        {filter !== "new" && list.length
          ? list.map((sale) => <VendorSaleRow key={sale.id} sale={sale} />)
          : null}

        {filter === "new" && !catalogOrders.length ? (
          <div className="vendor-empty vendor-dashboard-empty">
            <strong>Nenhum pedido novo.</strong>
            <p>Pedidos do catálogo do cliente aparecerão aqui.</p>
          </div>
        ) : null}

        {filter !== "new" && filter !== "all" && !list.length ? (
          <div className="vendor-empty vendor-dashboard-empty">
            <strong>Nenhum pedido neste filtro.</strong>
          </div>
        ) : null}
      </div>

      {/* Cancelados pelo cliente */}
      {filter === "all" && cancelledOrders.length > 0 ? (
        <div className="vendor-cancelled-section">
          <div className="vendor-section-label">Cancelados pelo cliente</div>
          {cancelledOrders.map((order) => (
            <div className="vendor-cancelled-card" key={order.id}>
              <div className="vendor-cancelled-card-head">
                <VendorAvatar
                  color={order.customer_avatar_color}
                  label={getCustomerInitials(order.customer_full_name)}
                  size={40}
                />
                <div className="vendor-cancelled-card-copy">
                  <strong>{order.customer_full_name}</strong>
                  <span>
                    #{order.order_code} · cancelado{" "}
                    {order.cancelled_at ? formatShortDate(order.cancelled_at.slice(0, 10)) : ""}
                  </span>
                </div>
                <span className="vendor-cancelled-badge">Cancelado</span>
              </div>
              <button
                className="vendor-cancelled-promo-btn"
                onClick={() => {
                  const firstName = order.customer_full_name.split(" ")[0];
                  const msg = `Oi, ${firstName}! Vi que você se interessou por alguns produtos da ${storeName}. Preparei uma condição especial pra você — quer dar uma olhada? 🎁`;
                  const phone = "55" + order.customer_phone.replace(/\D/g, "");
                  window.open(
                    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
                    "_blank"
                  );
                }}
                type="button"
              >
                <VendorWhatsLogo size={15} />
                Enviar promoção
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {filter === "all" ? (
        <div className="vendor-orders-footnote">
          <VendorIcon name="store" size={16} />
          <p>
            Mostrando <b>{totalCount}</b> registros ({sales.length} vendas
            {newCount ? ` · ${newCount} novos pedidos` : ""}).
          </p>
        </div>
      ) : null}
    </section>
  );
}

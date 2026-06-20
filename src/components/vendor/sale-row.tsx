import Link from "next/link";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorCrediarioProgress } from "@/components/vendor/crediario-progress";
import { VendorSaleBadge } from "@/components/vendor/sale-badge";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import {
  formatSaleCode,
  formatSaleDate,
  getSaleStatus
} from "@/lib/sales/format";
import type { SaleWithRelations } from "@/lib/sales/types";

export function VendorSaleRow({ sale }: { sale: SaleWithRelations }) {
  const status = getSaleStatus(sale.installments);
  const itemCount = sale.items.reduce((total, item) => total + item.quantity, 0);
  const installment = sale.payment_mode === "installment";
  const customerName = sale.customer?.full_name ?? "Cliente";
  const avatarColor = sale.customer?.avatar_color ?? "#11885b";

  return (
    <Link href={`/painel/vendas/${sale.id}`}>
      <VendorCard className="vendor-sale-row">
        <div className="vendor-sale-row-main">
          <VendorAvatar
            color={avatarColor}
            label={getCustomerInitials(customerName)}
            size={42}
          />
          <div className="vendor-sale-row-copy">
            <strong>{customerName}</strong>
            <span>
              #{formatSaleCode(sale.sale_code)} · {formatSaleDate(sale.sold_at)} · {itemCount}{" "}
              {itemCount === 1 ? "item" : "itens"} ·{" "}
              <em className={installment ? "vendor-sale-row-installment" : "vendor-sale-row-cash"}>
                {installment ? `${sale.installments.length}x` : "À vista"}
              </em>
            </span>
          </div>
          <div className="vendor-sale-row-side">
            <strong>{formatBRL(sale.total_amount)}</strong>
            <VendorSaleBadge small status={status} />
          </div>
        </div>
        {installment ? <VendorCrediarioProgress installments={sale.installments} /> : null}
      </VendorCard>
    </Link>
  );
}

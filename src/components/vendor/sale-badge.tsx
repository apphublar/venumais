import type { SaleStatus } from "@/lib/sales/types";

const META: Record<
  SaleStatus,
  { label: string; className: string }
> = {
  paid: { label: "Quitada", className: "vendor-sale-badge-paid" },
  open: { label: "Em aberto", className: "vendor-sale-badge-open" },
  overdue: { label: "Atrasada", className: "vendor-sale-badge-overdue" }
};

export function VendorSaleBadge({
  small = false,
  status
}: {
  small?: boolean;
  status: SaleStatus;
}) {
  const meta = META[status];

  return (
    <span className={`vendor-sale-badge ${meta.className} ${small ? "vendor-sale-badge-small" : ""}`.trim()}>
      <span aria-hidden="true" className="vendor-sale-badge-dot" />
      {meta.label}
    </span>
  );
}

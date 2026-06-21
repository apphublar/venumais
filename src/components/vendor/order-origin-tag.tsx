import { VendorIcon } from "@/components/vendor/icon";

const ORIGIN_META = {
  client: { label: "Pelo cliente", className: "vendor-order-origin-client", icon: "user" as const },
  vendor: { label: "Pelo vendedor", className: "vendor-order-origin-vendor", icon: "store" as const }
};

export function VendorOrderOriginTag({
  source,
  small = false
}: {
  source?: string | null;
  small?: boolean;
}) {
  const fromVendor = source === "vendor" || source === "seller";
  const meta = fromVendor ? ORIGIN_META.vendor : ORIGIN_META.client;

  return (
    <span className={`vendor-order-origin ${meta.className}${small ? " vendor-order-origin-small" : ""}`}>
      <VendorIcon name={meta.icon} size={small ? 10 : 11} />
      {meta.label}
    </span>
  );
}

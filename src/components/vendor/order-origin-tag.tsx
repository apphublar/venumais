import { VendorIcon } from "@/components/vendor/icon";

const ORIGIN_META = {
  client: {
    label: "Pelo cliente",
    className: "vendor-order-origin-client",
    icon: "user" as const
  },
  vendor: {
    label: "Pela loja",
    className: "vendor-order-origin-vendor",
    icon: "store" as const
  }
};

export function isVendorOrigin(source?: string | null, createdBy?: string | null) {
  if (createdBy) {
    return true;
  }
  return source === "vendor" || source === "seller";
}

export function VendorOrderOriginTag({
  createdBy,
  small = false,
  source
}: {
  createdBy?: string | null;
  small?: boolean;
  source?: string | null;
}) {
  const fromVendor = isVendorOrigin(source, createdBy);
  const meta = fromVendor ? ORIGIN_META.vendor : ORIGIN_META.client;

  return (
    <span
      className={`vendor-order-origin ${meta.className}${small ? " vendor-order-origin-small" : ""}`}
    >
      <VendorIcon name={meta.icon} size={small ? 10 : 11} />
      {meta.label}
    </span>
  );
}

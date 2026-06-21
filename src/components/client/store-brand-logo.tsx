import { VendorBrandMark } from "@/components/vendor/brand-mark";

export function StoreBrandLogo({
  label,
  logoUrl,
  onLight = false,
  radius,
  size = 50
}: {
  label: string;
  logoUrl?: string | null;
  onLight?: boolean;
  radius?: number;
  size?: number;
}) {
  const corner = radius ?? Math.round(size * 0.3);

  if (logoUrl?.trim()) {
    return (
      <img
        alt={`Logo ${label}`}
        className="client-store-logo"
        src={logoUrl}
        style={{
          width: size,
          height: size,
          borderRadius: corner,
          objectFit: "cover",
          flexShrink: 0
        }}
      />
    );
  }

  return <VendorBrandMark label={label} onLight={onLight} radius={corner} size={size} />;
}

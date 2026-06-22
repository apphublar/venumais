import Image from "next/image";
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
      <Image
        alt={`Logo ${label}`}
        className="client-store-logo"
        height={size}
        loader={({ src }) => src}
        src={logoUrl}
        unoptimized
        width={size}
        style={{
          borderRadius: corner,
          objectFit: "cover",
          flexShrink: 0
        }}
      />
    );
  }

  return <VendorBrandMark label={label} onLight={onLight} radius={corner} size={size} />;
}

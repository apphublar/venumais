export function VendorBrandMark({
  label,
  size = 44,
  radius,
  onLight = false
}: {
  label: string;
  size?: number;
  radius?: number;
  onLight?: boolean;
}) {
  const corner = radius ?? Math.round(size * 0.34);

  return (
    <div
      aria-hidden="true"
      className="vendor-brand-mark"
      style={{
        width: size,
        height: size,
        borderRadius: corner,
        fontSize: size * 0.42,
        background: onLight ? "var(--vendor-green-600)" : "rgba(255,255,255,0.18)"
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

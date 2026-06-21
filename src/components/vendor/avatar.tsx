export function VendorAvatar({
  label,
  color,
  size = 46,
  square = false
}: {
  label: string;
  color: string;
  size?: number;
  square?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={square ? "vendor-avatar vendor-avatar-square" : "vendor-avatar"}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: color
      }}
    >
      {label}
    </div>
  );
}

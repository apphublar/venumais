export function VendorAvatar({
  label,
  color,
  size = 46
}: {
  label: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="vendor-avatar"
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

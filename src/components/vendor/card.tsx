import type { CSSProperties, ReactNode } from "react";

export function VendorCard({
  children,
  className = "",
  onClick,
  style
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`vendor-card ${className}`.trim()}
      onClick={onClick}
      style={style}
      type={onClick ? "button" : undefined}
    >
      {children}
    </Tag>
  );
}

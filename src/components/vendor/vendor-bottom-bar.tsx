"use client";

import { VendorIcon } from "@/components/vendor/icon";

type IconName = Parameters<typeof VendorIcon>[0]["name"];

type VendorBottomBarProps = {
  disabled?: boolean;
  icon?: IconName;
  label: string;
  onClick?: () => void;
  pending?: boolean;
  sub?: string | null;
  type?: "button" | "submit";
};

export function VendorBottomBar({
  disabled,
  icon,
  label,
  onClick,
  pending,
  sub,
  type = "button"
}: VendorBottomBarProps) {
  return (
    <div className="vendor-bottom-bar">
      <button
        className="vendor-bottom-bar-button"
        disabled={disabled || pending}
        onClick={onClick}
        type={type}
      >
        {icon ? <VendorIcon name={icon} size={18} /> : null}
        <span>{pending ? "Salvando..." : label}</span>
        {sub && !pending ? <span className="vendor-bottom-bar-sub">· {sub}</span> : null}
      </button>
    </div>
  );
}

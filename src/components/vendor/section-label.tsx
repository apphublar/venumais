import Link from "next/link";

export function VendorSectionLabel({
  action,
  children,
  href,
  onAction
}: {
  action?: string;
  children: React.ReactNode;
  href?: string;
  onAction?: () => void;
}) {
  return (
    <div className="vendor-section-label">
      <span>{children}</span>
      {action ? (
        href ? (
          <Link href={href}>{action}</Link>
        ) : (
          <button onClick={onAction} type="button">
            {action}
          </button>
        )
      ) : null}
    </div>
  );
}

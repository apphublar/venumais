"use client";

export function VendorFormShell({
  children,
  footer
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="vendor-form-page">
      <div className="vendor-form-page-body">{children}</div>
      <div className="vendor-form-page-footer">{footer}</div>
    </div>
  );
}

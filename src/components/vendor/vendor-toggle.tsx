"use client";

export function VendorToggle({
  on,
  onChange
}: {
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      aria-pressed={on}
      className={`vendor-toggle ${on ? "vendor-toggle-on is-on" : ""}`}
      onClick={onChange}
      type="button"
    />
  );
}

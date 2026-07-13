"use client";

import { useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";

export function PasswordField({
  autoComplete,
  label,
  minLength,
  name,
  placeholder
}: {
  autoComplete: string;
  label: string;
  minLength?: number;
  name: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="app-field app-password-field">
      <span>{label}</span>
      <div className="app-password-wrap">
        <input
          autoComplete={autoComplete}
          minLength={minLength}
          name={name}
          placeholder={placeholder}
          required
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="app-password-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <VendorIcon name={visible ? "eyeOff" : "eye"} size={19} />
        </button>
      </div>
    </label>
  );
}

export function AppHero({
  back,
  className,
  icon,
  subtitle,
  title
}: {
  back?: () => void;
  className?: string;
  icon: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className={`app-hero ${className ?? ""}`.trim()}>
      {back ? (
        <button aria-label="Voltar" className="app-hero-back" onClick={back} type="button">
          <VendorIcon name="chevL" size={20} />
        </button>
      ) : null}
      <div className="app-hero-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function ChipToggle({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`app-chip-toggle-btn ${active ? "is-active" : ""}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

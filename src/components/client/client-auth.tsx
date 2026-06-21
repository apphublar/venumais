"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StoreBrandLogo } from "@/components/client/store-brand-logo";
import { VendorIcon } from "@/components/vendor/icon";
import {
  clientSignInAction,
  clientSignUpAction,
  type ClientSessionCustomer
} from "@/lib/client/actions";
import type { PublicStore } from "@/lib/client/queries";
import { useState } from "react";

function PasswordField({
  label,
  name,
  placeholder,
  required = true
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="client-field app-password-field">
      <span>{label}</span>
      <div className="app-password-wrap">
        <input minLength={6} name={name} placeholder={placeholder} required={required} type={visible ? "text" : "password"} />
        <button
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="app-password-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <VendorIcon name={visible ? "eyeOff" : "eye"} size={18} />
        </button>
      </div>
    </label>
  );
}

export function ClientAuth({
  onEnter,
  store
}: {
  onEnter: (customer: ClientSessionCustomer | null) => void;
  store: PublicStore;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [signUpState, signUpAction, signUpPending] = useActionState(clientSignUpAction, {});
  const [signInState, signInAction, signInPending] = useActionState(clientSignInAction, {});

  const activeState = mode === "signup" ? signUpState : signInState;
  const pending = mode === "signup" ? signUpPending : signInPending;

  useEffect(() => {
    if (activeState.customer) {
      onEnter(activeState.customer);
    }
  }, [activeState.customer, onEnter]);

  const submitValidation = (event: React.FormEvent<HTMLFormElement>) => {
    if (mode !== "signup") {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    if (password.length < 6) {
      event.preventDefault();
      setLocalError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      event.preventDefault();
      setLocalError("As senhas não conferem.");
      return;
    }

    setLocalError("");
  };

  return (
    <div className="client-auth-page">
      <div className="client-auth-hero">
        <button
          aria-label="Voltar"
          className="client-auth-back"
          onClick={() => router.push("/app?mode=client")}
          type="button"
        >
          <VendorIcon name="chevL" size={20} />
        </button>

        <div className="client-auth-brand">
          <StoreBrandLogo label={store.name} logoUrl={store.logo_url} onLight radius={18} size={60} />
        </div>
        <strong className="client-auth-title">{store.name}</strong>
        <p className="client-auth-subtitle">
          {mode === "signup"
            ? "Crie sua conta para comprar e acompanhar seus pedidos e parcelas."
            : "Acesse sua conta para continuar."}
        </p>
      </div>

      <div className="client-auth-body">
        <div className="client-auth-toggle">
          <button
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => setMode("signup")}
            type="button"
          >
            Criar conta
          </button>
          <button
            className={mode === "login" ? "is-active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Entrar
          </button>
        </div>

        <form action={mode === "signup" ? signUpAction : signInAction} onSubmit={submitValidation}>
          <input name="storeId" type="hidden" value={store.id} />
          <input name="storeSlug" type="hidden" value={store.slug} />

          {mode === "signup" ? (
            <>
              <label className="client-field">
                <span>Nome completo *</span>
                <input name="fullName" placeholder="Ex.: Ana Beatriz Ferreira" required />
              </label>
              <label className="client-field">
                <span>Apelido</span>
                <input name="nickname" placeholder="Como prefere ser chamada(o)" />
              </label>
              <label className="client-field">
                <span>Email *</span>
                <input name="email" placeholder="voce@email.com" required type="email" />
              </label>
              <label className="client-field">
                <span>WhatsApp *</span>
                <input name="phone" placeholder="(11) 90000-0000" required />
              </label>
              <PasswordField label="Senha *" name="password" placeholder="Mínimo 6 caracteres" />
              <label className="client-field app-password-field">
                <span>Confirmar senha *</span>
                <div className="app-password-wrap">
                  <input
                    minLength={6}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita sua senha"
                    required
                    type="password"
                    value={confirmPassword}
                  />
                </div>
              </label>
            </>
          ) : (
            <>
              <label className="client-field">
                <span>Email</span>
                <input name="email" placeholder="voce@email.com" required type="email" />
              </label>
              <PasswordField label="Senha" name="password" placeholder="Sua senha" />
              <a className="app-inline-link" href="/recuperar-senha" style={{ marginTop: -4 }}>
                Esqueci minha senha
              </a>
            </>
          )}

          {localError ? <p className="client-auth-error">{localError}</p> : null}
          {activeState.error ? <p className="client-auth-error">{activeState.error}</p> : null}

          <button
            className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full client-auth-submit"
            disabled={pending}
            type="submit"
          >
            <VendorIcon name="check" size={18} />
            {pending
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar conta e entrar"
                : "Entrar"}
          </button>
        </form>

        <button className="client-auth-demo-link" onClick={() => onEnter(null)} type="button">
          Entrar em modo demonstração
        </button>
      </div>
    </div>
  );
}

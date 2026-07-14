"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { signInAction } from "@/lib/auth/actions";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import { AppHero, ChipToggle, PasswordField } from "@/components/auth/app-login-shared";

type VendorTab = "entrar" | "criar";

export function VendorLoginPage({
  gatewayTitle = "VENUMAIS",
  initialTab = "entrar",
  nextPath = "/painel"
}: {
  gatewayTitle?: string;
  initialTab?: VendorTab;
  nextPath?: string;
}) {
  const [vendorTab, setVendorTab] = useState<VendorTab>(initialTab);
  const [state, formAction, pending] = useActionState(signInAction, {});
  useAuthRedirect(state);

  return (
    <main className="app-shell">
      <AppHero
        icon={<VendorIcon name="cards" size={28} />}
        subtitle="Acesse o painel da sua loja."
        title={gatewayTitle}
      />

      <section className="app-auth-body">
        <div className="app-chip-toggle">
          <ChipToggle active={vendorTab === "entrar"} label="Entrar" onClick={() => setVendorTab("entrar")} />
          <ChipToggle
            active={vendorTab === "criar"}
            label="Criar minha loja"
            onClick={() => setVendorTab("criar")}
          />
        </div>

        {vendorTab === "entrar" ? (
          <form action={formAction} className="app-form">
            <input name="next" type="hidden" value={nextPath} />

            <label className="app-field">
              <span>Email</span>
              <input autoComplete="email" name="email" placeholder="voce@email.com" required type="email" />
            </label>

            <PasswordField
              autoComplete="current-password"
              label="Senha"
              minLength={6}
              name="password"
              placeholder="Sua senha"
            />

            <Link className="app-forgot-link" href="/recuperar-senha">
              Esqueci minha senha
            </Link>

            {state.error ? (
              <p className="app-message app-message-error" role="alert">
                {state.error}
              </p>
            ) : null}

            <button
              className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full app-submit-btn"
              disabled={pending}
              type="submit"
            >
              <VendorIcon name="check" size={18} />
              {pending ? "Aguarde…" : "Entrar no painel"}
            </button>
          </form>
        ) : (
          <div className="app-create-panel">
            <p className="app-create-copy">
              Crie sua conta e monte sua loja em 2 passos: seus dados e configuração da loja com PIX e
              catálogo.
            </p>
            <Link
              className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full app-submit-btn"
              href={
                nextPath !== "/painel"
                  ? `/criar-conta?next=${encodeURIComponent(nextPath)}`
                  : "/criar-conta"
              }
            >
              <VendorIcon name="plus" size={18} />
              Começar cadastro
            </Link>
            <p className="app-create-foot">
              Já tem conta?{" "}
              <button className="app-inline-link" onClick={() => setVendorTab("entrar")} type="button">
                Entrar
              </button>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

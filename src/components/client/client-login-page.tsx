"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { ClientStorePicker } from "@/components/client/client-store-picker";
import { VendorIcon } from "@/components/vendor/icon";
import { clientPortalSignInAction } from "@/lib/client/actions";
import { parseStoreSlug } from "@/lib/stores/parse-store-slug";
import { AppHero, PasswordField } from "@/components/auth/app-login-shared";
import type { PublicStore } from "@/lib/client/queries";

type ClientSubStep = "login" | "stores" | "link";

export function ClientLoginPage({
  customerStores = [],
  initialSubStep = "login"
}: {
  customerStores?: PublicStore[];
  initialSubStep?: ClientSubStep;
}) {
  const [subStep, setSubStep] = useState<ClientSubStep>(
    customerStores.length ? "stores" : initialSubStep
  );
  const [slug, setSlug] = useState("");
  const [clientError, setClientError] = useState("");
  const [clientPending, setClientPending] = useState(false);
  const router = useRouter();

  const [clientSignInState, clientSignInAction, clientSignInPending] = useActionState(
    clientPortalSignInAction,
    {}
  );

  const stores = clientSignInState.stores?.length ? clientSignInState.stores : customerStores;
  const visibleSubStep =
    clientSignInState.stores?.length && subStep === "login" ? "stores" : subStep;

  const handleClientAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    setClientError("");

    const cleaned = parseStoreSlug(slug);
    if (!cleaned) {
      setClientError("Informe o link ou nome da loja.");
      return;
    }

    setClientPending(true);

    try {
      const response = await fetch(`/api/loja/${encodeURIComponent(cleaned)}/check`);
      const data = (await response.json()) as { exists?: boolean };
      if (!response.ok || !data.exists) {
        setClientError("Loja não encontrada. Verifique o link com o vendedor.");
        setClientPending(false);
        return;
      }
      router.push(`/loja/${cleaned}`);
    } catch {
      setClientError("Não foi possível verificar a loja. Tente novamente.");
      setClientPending(false);
    }
  };

  if (visibleSubStep === "stores") {
    return (
      <ClientStorePicker
        onBack={() => setSubStep(stores.length > 1 ? "login" : "link")}
        stores={stores}
      />
    );
  }

  if (visibleSubStep === "link") {
    return (
      <main className="app-shell">
        <AppHero
          back={() => setSubStep(stores.length ? "stores" : "login")}
          icon={<VendorIcon name="box" size={28} />}
          subtitle="Digite o link da loja para acessar o catálogo, pedidos e parcelas."
          title="Acessar com link"
        />

        <section className="app-auth-body">
          <form className="app-form" onSubmit={handleClientAccess}>
            <label className="app-field">
              <span>Link ou nome da loja</span>
              <input
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(event) => setSlug(event.target.value)}
                placeholder="minha-loja"
                required
                type="text"
                value={slug}
              />
            </label>

            <p className="app-client-hint">
              O vendedor compartilha esse link com você. Ex.: <strong>minha-loja</strong>
            </p>

            {clientError ? (
              <p className="app-message app-message-error" role="alert">
                {clientError}
              </p>
            ) : null}

            <button
              className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full app-submit-btn"
              disabled={clientPending || !slug.trim()}
              type="submit"
            >
              <VendorIcon name="check" size={18} />
              {clientPending ? "Verificando…" : "Acessar loja"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <AppHero
        icon={<VendorIcon name="box" size={28} />}
        subtitle="Entre com seu email para ver as lojas em que você compra."
        title="Portal do cliente"
      />

      <section className="app-auth-body">
        <form action={clientSignInAction} className="app-form">
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

          {clientSignInState.error ? (
            <p className="app-message app-message-error" role="alert">
              {clientSignInState.error}
            </p>
          ) : null}

          <button
            className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full app-submit-btn"
            disabled={clientSignInPending}
            type="submit"
          >
            <VendorIcon name="check" size={18} />
            {clientSignInPending ? "Aguarde…" : "Entrar"}
          </button>
        </form>

        <button
          className="client-auth-demo-link"
          onClick={() => setSubStep("link")}
          style={{ marginTop: 16 }}
          type="button"
        >
          Tenho o link da loja
        </button>
      </section>
    </main>
  );
}

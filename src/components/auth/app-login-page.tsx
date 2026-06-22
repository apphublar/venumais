"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { ClientStorePicker } from "@/components/client/client-store-picker";
import { VendorIcon } from "@/components/vendor/icon";
import { signInAction } from "@/lib/auth/actions";
import { clientPortalSignInAction } from "@/lib/client/actions";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import { parseStoreSlug } from "@/lib/stores/parse-store-slug";
import type { PublicStore } from "@/lib/client/queries";

type AppStep = "gateway" | "vendor" | "client";
type VendorTab = "entrar" | "criar";
type ClientSubStep = "login" | "stores" | "link";

function PasswordField({
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

function AppHero({
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

function ChipToggle({
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

export function AppLoginPage({
  customerStores = [],
  gatewayTitle = "VENUMAIS",
  initialClientSubStep = "login",
  initialStep = "gateway",
  nextPath = "/painel"
}: {
  customerStores?: PublicStore[];
  gatewayTitle?: string;
  initialClientSubStep?: ClientSubStep;
  initialStep?: AppStep;
  nextPath?: string;
}) {
  const [step, setStep] = useState<AppStep>(initialStep);
  const [vendorTab, setVendorTab] = useState<VendorTab>("entrar");
  const [clientSubStep, setClientSubStep] = useState<ClientSubStep>(
    customerStores.length ? "stores" : initialClientSubStep
  );
  const [stores, setStores] = useState<PublicStore[]>(customerStores);
  const [slug, setSlug] = useState("");
  const [clientError, setClientError] = useState("");
  const [clientPending, setClientPending] = useState(false);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(signInAction, {});
  const [clientSignInState, clientSignInAction, clientSignInPending] = useActionState(
    clientPortalSignInAction,
    {}
  );

  useAuthRedirect(state);

  useEffect(() => {
    if (clientSignInState.stores?.length) {
      setStores(clientSignInState.stores);
      setClientSubStep("stores");
    }
  }, [clientSignInState.stores]);

  useEffect(() => {
    if (customerStores.length) {
      setStores(customerStores);
      setClientSubStep("stores");
    }
  }, [customerStores]);

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

  if (step === "gateway") {
    return (
      <main className="app-shell">
        <AppHero
          className="app-hero-gateway"
          icon={<VendorIcon name="cards" size={28} />}
          subtitle="Vendas e crediário digital no controle"
          title={gatewayTitle}
        />

        <section className="app-gateway-body">
          <p className="app-section-label">Como você quer entrar?</p>

          <button className="app-gateway-card" onClick={() => setStep("vendor")} type="button">
            <span className="app-gateway-card-icon app-gateway-card-icon-vendor">
              <VendorIcon name="user" size={22} />
            </span>
            <span className="app-gateway-card-copy">
              <strong>Sou vendedor</strong>
              <span>Entrar no painel da minha loja ou criar uma nova</span>
            </span>
            <VendorIcon name="chevR" size={20} />
          </button>

          <button className="app-gateway-card" onClick={() => setStep("client")} type="button">
            <span className="app-gateway-card-icon app-gateway-card-icon-client">
              <VendorIcon name="box" size={22} />
            </span>
            <span className="app-gateway-card-copy">
              <strong>Sou cliente</strong>
              <span>Ver o catálogo, meus pedidos e minhas parcelas</span>
            </span>
            <VendorIcon name="chevR" size={20} />
          </button>
        </section>
      </main>
    );
  }

  if (step === "vendor") {
    return (
      <main className="app-shell">
        <AppHero
          className="app-hero-auth"
          back={() => setStep("gateway")}
          icon={<VendorIcon name="cards" size={28} />}
          subtitle="Acesse o painel da sua loja."
          title="Sua loja de vendas e crediário"
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
            <>
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
            </>
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

  if (clientSubStep === "stores") {
    return (
      <ClientStorePicker
        onBack={() => setClientSubStep(stores.length > 1 ? "login" : "link")}
        stores={stores}
      />
    );
  }

  if (clientSubStep === "link") {
    return (
      <main className="app-shell">
        <AppHero
          className="app-hero-auth"
          back={() => setClientSubStep(stores.length ? "stores" : "login")}
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
        className="app-hero-auth"
        back={() => setStep("gateway")}
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
          onClick={() => setClientSubStep("link")}
          style={{ marginTop: 16 }}
          type="button"
        >
          Tenho o link da loja
        </button>
      </section>
    </main>
  );
}

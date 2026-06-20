"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Brand } from "@/components/brand";
import { signInAction } from "@/lib/auth/actions";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";

type Mode = "vendor" | "client";

export function AccessPage({ nextPath = "/painel" }: { nextPath?: string }) {
  const [mode, setMode] = useState<Mode>("vendor");
  const [slug, setSlug] = useState("");
  const [clientError, setClientError] = useState("");
  const [clientPending, setClientPending] = useState(false);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(signInAction, {});
  useAuthRedirect(state);

  const handleClientAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    setClientError("");
    const cleaned = slug
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+\/loja\//, "")
      .replace(/^.*\/loja\//, "")
      .replace(/\.vendas\.app.*$/, "")
      .replace(/[^a-z0-9-]/g, "");
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

  return (
    <main className="access-page">
      <div className="access-card">
        <div className="access-header">
          <Brand inverse />
          <h1>Bem-vindo ao VENUMAIS</h1>
          <p>Selecione como deseja acessar</p>
        </div>

        <div className="access-toggle">
          <button
            className={`access-toggle-btn ${mode === "vendor" ? "access-toggle-btn-active" : ""}`}
            onClick={() => setMode("vendor")}
            type="button"
          >
            <span className="access-toggle-icon">🏪</span>
            Sou lojista
          </button>
          <button
            className={`access-toggle-btn ${mode === "client" ? "access-toggle-btn-active" : ""}`}
            onClick={() => setMode("client")}
            type="button"
          >
            <span className="access-toggle-icon">🛍️</span>
            Sou cliente
          </button>
        </div>

        {mode === "vendor" ? (
          <div className="access-body">
            <form action={formAction} className="auth-form">
              <input name="next" type="hidden" value={nextPath} />

              <label className="field">
                <span>Email</span>
                <input autoComplete="email" name="email" required type="email" />
              </label>
              <label className="field">
                <span>Senha</span>
                <input
                  autoComplete="current-password"
                  minLength={6}
                  name="password"
                  required
                  type="password"
                />
              </label>

              {state.error ? (
                <p className="auth-message auth-message-error" role="alert">
                  {state.error}
                </p>
              ) : null}

              <button
                className="button button-primary auth-submit"
                disabled={pending}
                type="submit"
              >
                {pending ? "Aguarde…" : "Entrar no painel"}
              </button>
            </form>

            <div className="access-vendor-links">
              <Link href="/criar-conta">Ainda não tem conta? Criar minha loja</Link>
              <Link href="/recuperar-senha">Esqueci minha senha</Link>
              <Link href="/cliente">Abrir app do cliente</Link>
            </div>
          </div>
        ) : (
          <div className="access-body">
            <p className="access-client-hint">
              Digite o nome ou link da loja para acessar o catálogo, seus pedidos e parcelas.
            </p>
            <form className="auth-form" onSubmit={handleClientAccess}>
              <label className="field">
                <span>Link ou nome da loja</span>
                <input
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="nome-da-loja"
                  required
                  type="text"
                  value={slug}
                />
              </label>
              {clientError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {clientError}
                </p>
              ) : null}

              <button
                className="button button-primary auth-submit"
                disabled={clientPending || !slug.trim()}
                type="submit"
              >
                {clientPending ? "Verificando…" : "Acessar loja"}
              </button>
            </form>

            <div className="access-vendor-links">
              <Link href="/cliente">Abrir app do cliente</Link>
              <span>O link da loja é fornecido pelo seu vendedor.</span>
            </div>
          </div>
        )}

        <div className="auth-back">
          <Link href="/entrar">← Trocar tipo de acesso</Link>
        </div>
      </div>
    </main>
  );
}

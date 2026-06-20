"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";

function parseStoreSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/loja\//, "")
    .replace(/^.*\/loja\//, "")
    .replace(/\.vendas\.app.*$/, "")
    .replace(/[^a-z0-9-]/g, "");
}

export function ClientEntryPage({ initialSlug = "" }: { initialSlug?: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const cleaned = parseStoreSlug(slug);
    if (!cleaned) {
      setError("Informe o link ou nome da loja.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`/api/loja/${encodeURIComponent(cleaned)}/check`);
      const data = (await response.json()) as { exists?: boolean; name?: string };

      if (!response.ok || !data.exists) {
        setError("Loja não encontrada. Verifique o link com o vendedor.");
        setPending(false);
        return;
      }

      router.push(`/loja/${cleaned}`);
    } catch {
      setError("Não foi possível verificar a loja. Tente novamente.");
      setPending(false);
    }
  };

  return (
    <main className="access-page">
      <div className="access-card">
        <div className="access-header">
          <Brand inverse />
          <h1>App do Cliente</h1>
          <p>Acesse o catálogo, pedidos e parcelas da sua loja</p>
        </div>

        <div className="access-body">
          <p className="access-client-hint">
            Digite o link que o vendedor compartilhou com você. Ex.:{" "}
            <strong>minha-loja</strong>
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
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

            {error ? (
              <p className="auth-message auth-message-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="button button-primary auth-submit"
              disabled={pending || !slug.trim()}
              type="submit"
            >
              {pending ? "Verificando…" : "Entrar no app do cliente"}
            </button>
          </form>

          <div className="access-vendor-links">
            <Link href="/entrar">Sou lojista · Entrar no painel</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

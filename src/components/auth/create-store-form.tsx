"use client";

import { useActionState, useMemo, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import { createStoreAction, type AuthActionState } from "@/lib/auth/actions";
import { slugifyStoreName } from "@/lib/stores/slug";

export function CreateStoreForm({ footer }: { footer?: React.ReactNode }) {
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    createStoreAction,
    {}
  );

  useAuthRedirect(state);

  const suggestedSlug = useMemo(() => slugifyStoreName(storeName), [storeName]);
  const previewSlug = slug || suggestedSlug;

  return (
    <AuthShell
      description="Escolha o nome e o endereço público da sua loja."
      title="Sua loja"
    >
      <form action={formAction} className="auth-form">
        <label className="field">
          <span>Nome da loja</span>
          <input
            minLength={2}
            name="storeName"
            onChange={(event) => setStoreName(event.target.value)}
            required
            type="text"
            value={storeName}
          />
        </label>

        <label className="field">
          <span>Endereço da loja</span>
          <input
            name="slug"
            onChange={(event) => setSlug(slugifyStoreName(event.target.value))}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder={suggestedSlug || "minha-loja"}
            type="text"
            value={slug}
          />
        </label>

        <p className="auth-hint">
          Seus clientes acessarão em{" "}
          <strong>{previewSlug || "minha-loja"}.venumais.com.br</strong>
        </p>

        {state.error ? (
          <p className="auth-message auth-message-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <button className="button button-primary auth-submit" disabled={pending} type="submit">
          {pending ? "Criando loja..." : "Entrar no painel"}
        </button>
      </form>

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </AuthShell>
  );
}

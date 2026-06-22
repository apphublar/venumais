"use client";

import { useActionState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";

export function SignUpForm({
  footer,
  nextPath = "/criar-conta?step=loja"
}: {
  footer?: React.ReactNode;
  nextPath?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signUpAction,
    {}
  );

  useAuthRedirect(state);

  return (
    <AuthShell
      description="Crie sua conta e monte sua loja em 2 passos."
      title="Criar minha loja"
    >
      <form action={formAction} className="auth-form">
        <input name="next" type="hidden" value={nextPath} />
        <label className="field">
          <span>Seu nome</span>
          <input autoComplete="name" minLength={2} name="fullName" required type="text" />
        </label>
        <label className="field">
          <span>Email</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label className="field">
          <span>WhatsApp</span>
          <input autoComplete="tel" name="phone" placeholder="(11) 99999-9999" type="tel" />
        </label>
        <label className="field">
          <span>Senha</span>
          <input autoComplete="new-password" minLength={6} name="password" required type="password" />
        </label>
        <label className="field">
          <span>Confirmar senha</span>
          <input
            autoComplete="new-password"
            minLength={6}
            name="confirmPassword"
            required
            type="password"
          />
        </label>

        {state.error ? (
          <p className="auth-message auth-message-error" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="auth-message auth-message-success" role="status">
            {state.success}
          </p>
        ) : null}

        {!state.success ? (
          <button className="button button-primary auth-submit" disabled={pending} type="submit">
            {pending ? "Criando conta..." : "Continuar"}
          </button>
        ) : null}
      </form>

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </AuthShell>
  );
}

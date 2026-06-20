"use client";

import { useActionState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import type { AuthActionState } from "@/lib/auth/actions";

type AuthFormProps = {
  action: (
    prevState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
  children: React.ReactNode;
  description: string;
  footer?: React.ReactNode;
  initialError?: string;
  submitLabel: string;
  title: string;
};

export function AuthForm({
  action,
  children,
  description,
  footer,
  initialError,
  submitLabel,
  title
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    initialError ? { error: initialError } : {}
  );

  useAuthRedirect(state);

  return (
    <AuthShell description={description} title={title}>
      <form action={formAction} className="auth-form">
        {children}

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

        <button className="button button-primary auth-submit" disabled={pending} type="submit">
          {pending ? "Aguarde..." : submitLabel}
        </button>
      </form>

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { acceptInviteAction } from "@/lib/team/actions";

type InviteInfo = {
  store_name: string;
  store_slug: string;
  role: string;
  expires_at: string;
  valid: boolean;
} | null;

function roleLabel(role: string) {
  return role === "admin" ? "Admin" : "Vendedor";
}

export function AcceptInvitePage({
  invite,
  isLoggedIn,
  token
}: {
  invite: InviteInfo;
  isLoggedIn: boolean;
  token: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      setError("");
      const result = await acceptInviteAction(token);
      if (result.error) {
        setError(result.error);
      } else {
        router.replace("/painel");
      }
    });
  };

  if (!invite || !invite.valid) {
    return (
      <main className="vendor-invite-page">
        <div className="vendor-invite-card">
          <span className="vendor-invite-icon vendor-invite-icon-error">
            <VendorIcon name="alert" size={32} />
          </span>
          <h1>Convite inválido</h1>
          <p>Este link de convite é inválido ou expirou.</p>
          <Link className="vendor-button vendor-button-primary" href="/painel">
            Ir para o painel
          </Link>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    const inviteNext = `/convite?token=${token}`;
    const loginUrl = `/app?mode=vendor&next=${encodeURIComponent(inviteNext)}`;
    const signUpUrl = `/criar-conta?next=${encodeURIComponent(inviteNext)}`;
    return (
      <main className="vendor-invite-page">
        <div className="vendor-invite-card">
          <span className="vendor-invite-icon">
            <VendorIcon name="users" size={32} />
          </span>
          <h1>Você foi convidado!</h1>
          <p>
            Você foi convidado para integrar a equipe de{" "}
            <strong>{invite.store_name}</strong> como{" "}
            <strong>{roleLabel(invite.role)}</strong>.
          </p>
          <div className="vendor-hint-card">
            <VendorIcon name="check" size={17} />
            <p>
              <b>Como entrar:</b> crie sua conta ou faça login com o mesmo email. Depois volte
              aqui para aceitar o convite e acessar o painel da loja.
            </p>
          </div>
          <Link className="vendor-button vendor-button-primary" href={loginUrl}>
            Entrar para aceitar
          </Link>
          <Link className="vendor-button vendor-button-ghost" href={signUpUrl}>
            Criar conta
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="vendor-invite-page">
      <div className="vendor-invite-card">
        <span className="vendor-invite-icon">
          <VendorIcon name="users" size={32} />
        </span>
        <h1>Aceitar convite</h1>
        <p>
          Você foi convidado para integrar a equipe de{" "}
          <strong>{invite.store_name}</strong> como{" "}
          <strong>{roleLabel(invite.role)}</strong>.
        </p>

        {error ? (
          <p className="vendor-message vendor-message-error">{error}</p>
        ) : null}

        <button
          className="vendor-button vendor-button-primary"
          disabled={isPending}
          onClick={handleAccept}
          type="button"
        >
          <VendorIcon name="check" size={18} />
          {isPending ? "Aceitando…" : "Aceitar e entrar na equipe"}
        </button>

        <Link className="vendor-button vendor-button-ghost" href="/painel">
          Cancelar
        </Link>
      </div>
    </main>
  );
}

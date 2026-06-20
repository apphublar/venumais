"use client";

import { useState, useTransition } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import { cancelInviteAction, createInviteAction, removeMemberAction } from "@/lib/team/actions";
import type { StoreInvite, TeamMember } from "@/lib/team/queries";

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  return "Vendedor";
}

function memberInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "#2a6fdb",
  "#e8702a",
  "#0891b2",
  "#6d28d9",
  "#db2777",
  "#059669"
];

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function InviteSheet({
  onClose,
  onCreated,
  open
}: {
  onClose: () => void;
  onCreated: (invite: StoreInvite, url: string) => void;
  open: boolean;
}) {
  const [role, setRole] = useState<"seller" | "admin">("seller");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      setError("");
      const result = await createInviteAction(role);
      if (result.error) {
        setError(result.error);
      } else if (result.inviteUrl && result.token) {
        setInviteUrl(result.inviteUrl);
        onCreated(
          {
            id: `inv-${Date.now()}`,
            role,
            token: result.token,
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            created_at: new Date().toISOString()
          },
          result.inviteUrl
        );
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    });
  };

  if (!open) return null;

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="invite-sheet-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="invite-sheet-title">Convidar vendedor</h2>
          <button aria-label="Fechar" className="vendor-dashboard-icon-btn" onClick={onClose} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          {error ? (
            <p className="vendor-message vendor-message-error">{error}</p>
          ) : null}

          {!inviteUrl ? (
            <>
              <div className="vendor-hint-card">
                <VendorIcon name="users" size={17} />
                <p>
                  Gere um link de convite e compartilhe com o vendedor. O link é válido por <b>7 dias</b>.
                </p>
              </div>

              <div className="vendor-field">
                <span>Nível de acesso</span>
                <div className="vendor-cupom-type-row">
                  {(
                    [
                      ["seller", "Vendedor"],
                      ["admin", "Admin"]
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      className={`vendor-cupom-type-btn ${role === key ? "vendor-cupom-type-btn-active" : ""}`.trim()}
                      key={key}
                      onClick={() => setRole(key)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <small className="vendor-settings-slug">
                  {role === "admin"
                    ? "Admin pode gerenciar vendas, clientes, produtos e equipe."
                    : "Vendedor pode fazer vendas e gerenciar clientes."}
                </small>
              </div>

              <button
                className="vendor-button vendor-button-primary"
                disabled={isPending}
                onClick={handleGenerate}
                type="button"
              >
                <VendorIcon name="plus" size={18} />
                {isPending ? "Gerando…" : "Gerar link de convite"}
              </button>
            </>
          ) : (
            <>
              <div className="vendor-hint-card">
                <VendorIcon name="check" size={17} />
                <p>Link gerado! Compartilhe com o vendedor. Ele expira em 7 dias.</p>
              </div>

              <label className="vendor-field">
                <span>Link de convite</span>
                <input readOnly value={inviteUrl} />
              </label>

              <button
                className="vendor-button vendor-button-primary"
                onClick={handleCopy}
                type="button"
              >
                <VendorIcon name="check" size={18} />
                {copied ? "Copiado!" : "Copiar link"}
              </button>

              <button
                className="vendor-button vendor-button-ghost"
                onClick={onClose}
                type="button"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamScreen({
  initialInvites,
  initialMembers,
  ownerEmail,
  ownerName
}: {
  initialInvites: StoreInvite[];
  initialMembers: TeamMember[];
  ownerEmail: string;
  ownerName: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [inviteOpen, setInviteOpen] = useState(false);

  const removeMember = (id: string) => {
    if (!window.confirm("Remover este membro da equipe?")) return;
    setMembers((current) => current.filter((m) => m.id !== id));
    removeMemberAction(id);
  };

  const cancelInvite = (id: string) => {
    setInvites((current) => current.filter((inv) => inv.id !== id));
    cancelInviteAction(id);
  };

  return (
    <>
      <VendorScreenHeader
        action={
          <button
            aria-label="Convidar vendedor"
            className="vendor-icon-button vendor-icon-button-primary"
            onClick={() => setInviteOpen(true)}
            type="button"
          >
            <VendorIcon name="plus" size={20} />
          </button>
        }
        backHref="/painel"
        subtitle={`${members.length + 1} pessoa${members.length + 1 !== 1 ? "s" : ""} com acesso`}
        title="Equipe & permissões"
      />

      <section className="vendor-screen-body vendor-team-screen">
        <VendorSectionLabel>Proprietário</VendorSectionLabel>
        <VendorCard className="vendor-team-owner">
          <VendorBrandMark label={ownerName} onLight size={46} />
          <div className="vendor-team-owner-copy">
            <strong>{ownerName}</strong>
            <span>{ownerEmail}</span>
          </div>
          <span className="vendor-team-badge">Acesso total</span>
        </VendorCard>

        <VendorSectionLabel>Vendedores ({members.length})</VendorSectionLabel>
        {members.map((member) => (
          <VendorCard className="vendor-team-member" key={member.id}>
            <VendorAvatar
              color={avatarColor(member.user_id)}
              label={memberInitials(member.full_name)}
              size={44}
            />
            <div className="vendor-team-member-copy">
              <strong>{member.full_name}</strong>
              <span>{roleLabel(member.role)}</span>
            </div>
            <button
              aria-label="Remover membro"
              className="vendor-cupom-delete-btn"
              onClick={() => removeMember(member.id)}
              type="button"
            >
              <VendorIcon name="x" size={16} />
            </button>
          </VendorCard>
        ))}
        {!members.length ? (
          <div className="vendor-empty vendor-empty-compact">
            <p>Nenhum vendedor adicionado ainda.</p>
          </div>
        ) : null}

        {invites.length > 0 ? (
          <>
            <VendorSectionLabel>Convites pendentes</VendorSectionLabel>
            {invites.map((invite) => (
              <VendorCard className="vendor-team-member" key={invite.id}>
                <span className="vendor-team-invite-icon">
                  <VendorIcon name="bell" size={20} />
                </span>
                <div className="vendor-team-member-copy">
                  <strong>Convite {roleLabel(invite.role)}</strong>
                  <span>Expira em {new Date(invite.expires_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <button
                  aria-label="Cancelar convite"
                  className="vendor-cupom-delete-btn"
                  onClick={() => cancelInvite(invite.id)}
                  type="button"
                >
                  <VendorIcon name="x" size={16} />
                </button>
              </VendorCard>
            ))}
          </>
        ) : null}

        <p className="vendor-team-footnote">
          Toque no × ao lado de um vendedor para remover o acesso. Apenas o proprietário e admins
          gerenciam a equipe.
        </p>

        <div className="vendor-dashboard-spacer" />
      </section>

      <InviteSheet
        onClose={() => setInviteOpen(false)}
        onCreated={(invite) => {
          setInvites((current) => [invite, ...current]);
        }}
        open={inviteOpen}
      />
    </>
  );
}

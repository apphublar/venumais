"use client";

import { useRouter } from "next/navigation";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorIcon } from "@/components/vendor/icon";
import { signOutAction } from "@/lib/auth/actions";

export function VendorMenuSheet({
  birthdayCount = 0,
  isOwner,
  onClose,
  profileName
}: {
  birthdayCount?: number;
  isOwner: boolean;
  onClose: () => void;
  profileName: string;
  storeName: string;
}) {
  const router = useRouter();
  const initial = profileName.trim().charAt(0) || "V";

  const items = [
    {
      href: "/painel/chats",
      icon: "message" as const,
      sub: "Conversas com clientes sobre pedidos",
      title: "Chats"
    },
    {
      disabled: !isOwner,
      href: isOwner ? "/painel/equipe" : undefined,
      icon: "users" as const,
      sub: isOwner ? "Gerencie quem acessa a loja" : "Somente o proprietário gerencia",
      title: "Equipe & permissões"
    },
    {
      href: "/painel/cupons",
      icon: "ticket" as const,
      sub: "Crie e gerencie cupons da loja",
      title: "Cupons de desconto"
    },
    {
      href: "/painel/aniversariantes",
      icon: "gift" as const,
      sub: `${birthdayCount} cliente(s) fazem aniversário`,
      title: "Aniversariantes do mês"
    },
    {
      disabled: !isOwner,
      href: isOwner ? "/painel/configuracoes" : undefined,
      icon: "edit" as const,
      sub: "Marca, PIX e link do catálogo",
      title: "Configurações da loja"
    }
  ];

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="vendor-menu-title"
        aria-modal="true"
        className="vendor-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="vendor-menu-title">Menu</h2>
          <button aria-label="Fechar" className="vendor-dashboard-icon-btn" onClick={onClose} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          <div className="vendor-menu-user">
            <VendorAvatar color="var(--vendor-green-600)" label={initial.toUpperCase()} size={42} />
            <div>
              <strong>{profileName}</strong>
              <span>{isOwner ? "Proprietário · acesso total" : "Vendedor · acesso restrito"}</span>
            </div>
          </div>

          {items.map((item) => (
            <button
              className="vendor-menu-item"
              disabled={item.disabled}
              key={item.title}
              onClick={() => {
                if (item.disabled) {
                  return;
                }

                if ("href" in item && item.href) {
                  router.push(item.href);
                  onClose();
                }
              }}
              type="button"
            >
              <span className="vendor-menu-item-icon">
                <VendorIcon name={item.icon} size={20} />
              </span>
              <span className="vendor-menu-item-copy">
                <strong>{item.title}</strong>
                {item.sub ? <small>{item.sub}</small> : null}
              </span>
              {item.disabled ? (
                <VendorIcon name="eyeOff" size={16} />
              ) : (
                <VendorIcon name="chevR" size={18} />
              )}
            </button>
          ))}

          <form action={signOutAction}>
            <button className="vendor-button vendor-button-danger vendor-button-danger-full" type="submit">
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

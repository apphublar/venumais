"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import type { OrderConversation } from "@/lib/client/queries";
import { getOrderStatusMeta } from "@/lib/client/order-status";

type ChatFilter = "all" | "unread";

function formatConversationTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function customerInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function VendorChatsScreen({
  conversations,
  storeName
}: {
  conversations: OrderConversation[];
  storeName: string;
}) {
  const [filter, setFilter] = useState<ChatFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "unread") {
      return conversations.filter((row) => row.unread_count > 0);
    }
    return conversations;
  }, [conversations, filter]);

  const unreadTotal = useMemo(
    () => conversations.reduce((total, row) => total + row.unread_count, 0),
    [conversations]
  );

  return (
    <>
      <VendorScreenHeader
        backHref="/painel"
        subtitle={`${conversations.length} conversa${conversations.length !== 1 ? "s" : ""}${unreadTotal ? ` · ${unreadTotal} não lida${unreadTotal !== 1 ? "s" : ""}` : ""}`}
        title="Chats"
      />

      <section className="vendor-screen-body vendor-chats-screen">
        <div className="vendor-chats-filter-row">
          <button
            className={`vendor-chats-filter${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
            type="button"
          >
            Todos
          </button>
          <button
            className={`vendor-chats-filter${filter === "unread" ? " is-active" : ""}`}
            onClick={() => setFilter("unread")}
            type="button"
          >
            Recebidos
            {unreadTotal ? <em>{unreadTotal}</em> : null}
          </button>
        </div>

        {!filtered.length ? (
          <div className="vendor-empty vendor-chats-empty">
            <VendorIcon name="message" size={32} />
            <strong>{filter === "unread" ? "Nenhum chat recebido" : "Nenhum chat ainda"}</strong>
            <p>
              {filter === "unread"
                ? "Quando um cliente enviar mensagem, ela aparecerá aqui."
                : "Abra um pedido e envie a primeira mensagem para iniciar a conversa."}
            </p>
            <Link className="vendor-button vendor-button-primary" href="/painel/pedidos">
              Ver pedidos
            </Link>
          </div>
        ) : (
          <div className="vendor-chats-list">
            {filtered.map((conversation) => {
              const statusMeta = getOrderStatusMeta(conversation.status);
              const name = conversation.customer_name ?? "Cliente";
              return (
                <Link
                  className={`vendor-chat-row${conversation.unread_count ? " is-unread" : ""}`}
                  href={`/painel/chats/${conversation.order_id}`}
                  key={conversation.order_id}
                >
                  <VendorAvatar
                    color="#128a5d"
                    label={customerInitials(name)}
                    size={46}
                  />
                  <div className="vendor-chat-row-copy">
                    <div className="vendor-chat-row-head">
                      <strong>{name}</strong>
                      <time>{formatConversationTime(conversation.last_message_at)}</time>
                    </div>
                    <div className="vendor-chat-row-sub">
                      <span>Pedido #{conversation.order_code}</span>
                      <span style={{ background: statusMeta.bg, color: statusMeta.fg }}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p>{conversation.last_message_body ?? "Sem mensagens"}</p>
                  </div>
                  {conversation.unread_count ? (
                    <em className="vendor-chat-unread">{conversation.unread_count}</em>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}

        <p className="vendor-chats-footnote">
          Conversas da loja <strong>{storeName}</strong>. Você também pode iniciar chat dentro de
          cada pedido.
        </p>
      </section>
    </>
  );
}

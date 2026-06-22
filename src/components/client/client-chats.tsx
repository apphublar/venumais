"use client";

import { useMemo, useState } from "react";
import { OrderChatPanel } from "@/components/shared/order-chat-panel";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import {
  listPortalOrderMessagesAction,
  markPortalOrderMessagesReadAction,
  sendPortalOrderMessageAction
} from "@/lib/client/actions";
import { getOrderStatusMeta } from "@/lib/client/order-status";
import type { OrderConversation, PublicStore } from "@/lib/client/queries";

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

export function ClientChats({
  conversations: initialConversations,
  store,
  storeId
}: {
  conversations: OrderConversation[];
  store: PublicStore;
  storeId: string;
}) {
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [activeOrder, setActiveOrder] = useState<OrderConversation | null>(null);
  const [conversations, setConversations] = useState(initialConversations);

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

  const refreshConversations = async () => {
    const { listPortalOrderConversationsAction } = await import("@/lib/client/actions");
    const result = await listPortalOrderConversationsAction(storeId);
    if (result.conversations) {
      setConversations(result.conversations);
    }
  };

  if (activeOrder) {
    const statusMeta = getOrderStatusMeta(activeOrder.status);
    return (
      <ClientOverlay>
        <ClientScreenHeader
          onBack={() => setActiveOrder(null)}
          subtitle={`Pedido #${activeOrder.order_code} · ${statusMeta.label}`}
          title="Chat com a loja"
        />
        <div className="client-chat-thread-body">
          <OrderChatPanel
            emptyHint="Envie uma mensagem para a loja sobre este pedido."
            loadMessages={() => listPortalOrderMessagesAction(storeId, activeOrder.order_id)}
            markRead={() => markPortalOrderMessagesReadAction(storeId, activeOrder.order_id)}
            onSent={refreshConversations}
            sendMessage={(body) => sendPortalOrderMessageAction(storeId, activeOrder.order_id, body)}
            viewer="client"
          />
        </div>
      </ClientOverlay>
    );
  }

  return (
    <>
      <ClientScreenHeader
        subtitle={`${conversations.length} conversa${conversations.length !== 1 ? "s" : ""}${unreadTotal ? ` · ${unreadTotal} nova${unreadTotal !== 1 ? "s" : ""}` : ""}`}
        title="Chats"
      />

      <div className="client-chats-screen">
        <div className="client-chats-filter-row">
          <button
            className={`client-chats-filter${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
            type="button"
          >
            Todos
          </button>
          <button
            className={`client-chats-filter${filter === "unread" ? " is-active" : ""}`}
            onClick={() => setFilter("unread")}
            type="button"
          >
            Recebidos
            {unreadTotal ? <em>{unreadTotal}</em> : null}
          </button>
        </div>

        {!filtered.length ? (
          <div className="client-chats-empty">
            <VendorIcon name="message" size={32} />
            <strong>{filter === "unread" ? "Nenhuma mensagem recebida" : "Nenhum chat ainda"}</strong>
            <p>
              {filter === "unread"
                ? "Quando a loja responder, a conversa aparecerá aqui."
                : "Abra um pedido e envie a primeira mensagem para falar com a loja."}
            </p>
          </div>
        ) : (
          <div className="client-chats-list">
            {filtered.map((conversation) => {
              const statusMeta = getOrderStatusMeta(conversation.status);
              return (
                <button
                  className={`client-chat-row${conversation.unread_count ? " is-unread" : ""}`}
                  key={conversation.order_id}
                  onClick={() => setActiveOrder(conversation)}
                  type="button"
                >
                  <span className="client-chat-row-icon">
                    <VendorIcon name="message" size={20} />
                  </span>
                  <span className="client-chat-row-copy">
                    <span className="client-chat-row-head">
                      <strong>{store.name}</strong>
                      <time>{formatConversationTime(conversation.last_message_at)}</time>
                    </span>
                    <span className="client-chat-row-sub">
                      Pedido #{conversation.order_code}
                      <em style={{ background: statusMeta.bg, color: statusMeta.fg }}>
                        {statusMeta.label}
                      </em>
                    </span>
                    <span className="client-chat-row-preview">
                      {conversation.last_message_body ?? "Sem mensagens"}
                    </span>
                  </span>
                  {conversation.unread_count ? (
                    <em className="client-chat-unread">{conversation.unread_count}</em>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

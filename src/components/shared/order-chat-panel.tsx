"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { VendorIcon } from "@/components/vendor/icon";

export type OrderChatMessage = {
  id: string;
  sender_type: "vendor" | "client";
  body: string;
  created_at: string;
  read_at?: string | null;
};

export function OrderChatPanel({
  emptyHint = "Envie uma mensagem sobre este pedido.",
  loadMessages,
  markRead,
  onSent,
  sendMessage,
  viewer
}: {
  emptyHint?: string;
  loadMessages: () => Promise<{ error?: string; messages?: OrderChatMessage[] }>;
  markRead?: () => Promise<void>;
  onSent?: () => void;
  sendMessage: (body: string) => Promise<{ error?: string }>;
  viewer: "vendor" | "client";
}) {
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const result = await loadMessages();
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setMessages(result.messages ?? []);
    setLoading(false);
    if (markRead) {
      await markRead().catch(() => {});
    }
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;

    setError(null);
    startTransition(async () => {
      const result = await sendMessage(body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      await refresh();
      onSent?.();
    });
  };

  return (
    <div className="order-chat-panel">
      <div className="order-chat-list" ref={listRef}>
        {loading ? <p className="order-chat-empty">Carregando mensagens…</p> : null}
        {!loading && !messages.length ? <p className="order-chat-empty">{emptyHint}</p> : null}
        {messages.map((message) => {
          const mine = message.sender_type === viewer;
          return (
            <div
              className={`order-chat-bubble${mine ? " is-mine" : " is-theirs"}`}
              key={message.id}
            >
              <p>{message.body}</p>
              <time>{formatChatTime(message.created_at)}</time>
            </div>
          );
        })}
      </div>

      {error ? <p className="order-chat-error">{error}</p> : null}

      <div className="order-chat-compose">
        <textarea
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva sua mensagem…"
          rows={2}
          value={draft}
        />
        <button
          aria-label="Enviar mensagem"
          className="order-chat-send"
          disabled={pending || !draft.trim()}
          onClick={handleSend}
          type="button"
        >
          <VendorIcon name="share" size={18} />
        </button>
      </div>
    </div>
  );
}

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

"use client";

import Link from "next/link";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { OrderChatPanel } from "@/components/shared/order-chat-panel";
import { VendorIcon } from "@/components/vendor/icon";
import {
  listVendorOrderMessagesAction,
  markVendorOrderMessagesReadAction,
  sendVendorOrderMessageAction
} from "@/lib/client/order-actions";
import { getOrderStatusMeta } from "@/lib/client/order-status";
import type { StoreOrderDetail } from "@/lib/client/order-types";
import { formatPhoneDisplay, normalizePhone } from "@/lib/customers/format";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";

export function VendorChatThread({
  order,
  storeId
}: {
  order: StoreOrderDetail;
  storeId: string;
}) {
  const statusMeta = getOrderStatusMeta(order.status);
  const phoneDigits = order.customer.phone ? normalizePhone(order.customer.phone) : "";
  const whatsappHref = phoneDigits ? `https://wa.me/55${phoneDigits}` : undefined;
  const telHref = phoneDigits ? `tel:+55${phoneDigits}` : undefined;

  return (
    <div className="vendor-chat-thread">
      <VendorScreenHeader
        backHref="/painel/chats"
        subtitle={`Pedido #${order.order_code} · ${statusMeta.label}`}
        title={order.customer.full_name}
      />

      <section className="vendor-screen-body vendor-chat-thread-body">
        <div className="vendor-chat-thread-meta">
          {order.customer.phone ? (
            <span>{formatPhoneDisplay(order.customer.phone)}</span>
          ) : null}
          <div className="vendor-chat-thread-actions">
            {telHref ? (
              <a className="vendor-button vendor-button-ghost vendor-chat-thread-action" href={telHref}>
                <VendorIcon name="phone" size={16} />
                Ligar
              </a>
            ) : null}
            {whatsappHref ? (
              <a
                className="vendor-button vendor-button-whats vendor-chat-thread-action"
                href={whatsappHref}
                rel="noreferrer"
                target="_blank"
              >
                <VendorWhatsLogo size={16} />
                WhatsApp
              </a>
            ) : null}
            <Link
              className="vendor-button vendor-button-ghost vendor-chat-thread-action"
              href={`/painel/pedidos/${order.id}`}
            >
              <VendorIcon name="receipt" size={16} />
              Pedido
            </Link>
          </div>
        </div>

        <OrderChatPanel
          emptyHint="Envie a primeira mensagem sobre este pedido."
          loadMessages={() => listVendorOrderMessagesAction(storeId, order.id)}
          markRead={() => markVendorOrderMessagesReadAction(storeId, order.id)}
          sendMessage={(body) => sendVendorOrderMessageAction(storeId, order.id, body)}
          viewer="vendor"
        />
      </section>
    </div>
  );
}

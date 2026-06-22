"use client";

import { useState } from "react";
import { OrderChatPanel } from "@/components/shared/order-chat-panel";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import {
  listVendorOrderMessagesAction,
  markVendorOrderMessagesReadAction,
  sendVendorOrderMessageAction
} from "@/lib/client/order-actions";
import { formatCustomerAddress, type StoreOrderDetail } from "@/lib/client/order-types";
import { formatPhoneDisplay, normalizePhone } from "@/lib/customers/format";

export function VendorOrderCustomerPanel({
  order,
  storeId
}: {
  order: StoreOrderDetail;
  storeId: string;
}) {
  const [open, setOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const customer = order.customer;
  const address = formatCustomerAddress(customer);
  const phoneDigits = customer.phone ? normalizePhone(customer.phone) : "";
  const whatsappHref = phoneDigits ? `https://wa.me/55${phoneDigits}` : undefined;
  const telHref = phoneDigits ? `tel:+55${phoneDigits}` : undefined;

  return (
    <section className="vendor-order-customer-panel">
      <button
        className="vendor-order-customer-panel-toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <VendorIcon name="user" size={18} />
          Dados do cliente
        </span>
        <VendorIcon name={open ? "chevU" : "chevD"} size={18} />
      </button>

      {open ? (
        <VendorCard className="vendor-order-customer-card">
          <dl className="vendor-order-customer-fields">
            <div className="vendor-order-customer-field">
              <dt>Nome</dt>
              <dd>{customer.full_name}</dd>
            </div>
            <div className="vendor-order-customer-field">
              <dt>WhatsApp / telefone</dt>
              <dd>{customer.phone ? formatPhoneDisplay(customer.phone) : "Não informado"}</dd>
            </div>
            <div className="vendor-order-customer-field">
              <dt>Email</dt>
              <dd>{customer.email?.trim() || "Não informado"}</dd>
            </div>
            <div className="vendor-order-customer-field">
              <dt>Endereço de entrega</dt>
              <dd>{address || "Não cadastrado"}</dd>
            </div>
          </dl>

          {(telHref || whatsappHref) ? (
            <div className="vendor-order-customer-actions">
              {telHref ? (
                <a className="vendor-button vendor-button-ghost vendor-order-customer-action" href={telHref}>
                  <VendorIcon name="phone" size={16} />
                  Ligar
                </a>
              ) : null}
              {whatsappHref ? (
                <a
                  className="vendor-button vendor-button-whats vendor-order-customer-action"
                  href={whatsappHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <VendorWhatsLogo size={16} />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}

          <button
            className={`vendor-order-customer-chat-toggle${chatOpen ? " is-open" : ""}`}
            onClick={() => setChatOpen((value) => !value)}
            type="button"
          >
            <VendorIcon name="message" size={18} />
            {chatOpen ? "Ocultar chat com o cliente" : "Abrir chat com o cliente"}
          </button>

          {chatOpen ? (
            <OrderChatPanel
              loadMessages={() => listVendorOrderMessagesAction(storeId, order.id)}
              markRead={() => markVendorOrderMessagesReadAction(storeId, order.id)}
              sendMessage={(body) => sendVendorOrderMessageAction(storeId, order.id, body)}
              viewer="vendor"
            />
          ) : null}
        </VendorCard>
      ) : null}
    </section>
  );
}

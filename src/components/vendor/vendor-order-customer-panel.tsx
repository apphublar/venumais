"use client";

import Link from "next/link";
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
  const mailHref = customer.email ? `mailto:${customer.email}` : undefined;

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
          <div className="vendor-order-customer-grid">
            <div>
              <span>Nome</span>
              <strong>{customer.full_name}</strong>
            </div>
            <div>
              <span>WhatsApp / telefone</span>
              <strong>{customer.phone ? formatPhoneDisplay(customer.phone) : "Não informado"}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{customer.email?.trim() || "Não informado"}</strong>
            </div>
            <div>
              <span>Endereço de entrega</span>
              <strong>{address || "Não cadastrado"}</strong>
            </div>
          </div>

          <div className="vendor-order-customer-actions">
            {mailHref ? (
              <a className="vendor-button vendor-button-ghost" href={mailHref}>
                <VendorIcon name="mail" size={16} />
                Enviar email
              </a>
            ) : (
              <button className="vendor-button vendor-button-ghost" disabled type="button">
                <VendorIcon name="mail" size={16} />
                Email indisponível
              </button>
            )}
            {whatsappHref ? (
              <a
                className="vendor-button vendor-button-ghost vendor-button-whats"
                href={whatsappHref}
                rel="noreferrer"
                target="_blank"
              >
                <VendorWhatsLogo size={16} />
                WhatsApp
              </a>
            ) : null}
            {telHref ? (
              <a className="vendor-button vendor-button-ghost" href={telHref}>
                <VendorIcon name="phone" size={16} />
                Ligar
              </a>
            ) : null}
            <Link className="vendor-button vendor-button-ghost" href={`/painel/clientes/${customer.id}`}>
              <VendorIcon name="users" size={16} />
              Ver cadastro
            </Link>
          </div>

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

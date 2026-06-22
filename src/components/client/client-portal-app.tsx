"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientAuth } from "@/components/client/client-auth";
import { ClientCatalog } from "@/components/client/client-catalog";
import { ClientChats } from "@/components/client/client-chats";
import { ClientConfirmarCompra } from "@/components/client/client-confirmar-compra";
import { ClientConta } from "@/components/client/client-conta";
import { ClientInformarPagamento } from "@/components/client/client-informar-pagamento";
import { ClientLojasTab } from "@/components/client/client-lojas-tab";
import { ClientParcelas } from "@/components/client/client-parcelas";
import { ClientPedidos } from "@/components/client/client-pedidos";
import { VendorIcon } from "@/components/vendor/icon";
import { getCustomerSaleDetailAction } from "@/lib/client/actions";
import type { ClientSessionCustomer } from "@/lib/client/actions";
import type {
  OrderConversation,
  PortalCustomer,
  PortalInstallment,
  PortalOrder,
  PortalSaleDetail,
  PortalSaleSummary,
  PublicProduct,
  PublicStore
} from "@/lib/client/queries";

const NAV_LEFT = [
  { id: "stores", icon: "store" as const, label: "Lojas" },
  { id: "catalog", icon: "box" as const, label: "Catálogo" }
] as const;

const NAV_RIGHT = [
  { id: "chat", icon: "message" as const, label: "Chat" },
  { id: "pay", icon: "wallet" as const, label: "Parcelas" }
] as const;

type ClientTab =
  | (typeof NAV_LEFT)[number]["id"]
  | "orders"
  | (typeof NAV_RIGHT)[number]["id"];

type ClientOverlay =
  | { type: "conta" }
  | { type: "pagar"; installment: PortalInstallment }
  | { type: "confirmar"; sale: PortalSaleDetail }
  | null;

export function ClientPortalApp({
  initialConversations = [],
  initialCustomer,
  initialInstallments,
  initialOrders,
  initialSales,
  products,
  sessionHint = null,
  store,
  customerStoreCount = 1
}: {
  initialConversations?: OrderConversation[];
  initialCustomer: PortalCustomer | null;
  initialInstallments: PortalInstallment[];
  initialOrders: PortalOrder[];
  initialSales: PortalSaleSummary[];
  products: PublicProduct[];
  sessionHint?: {
    email: string;
    canQuickLink: boolean;
    isLinked: boolean;
  } | null;
  store: PublicStore;
  customerStoreCount?: number;
}) {
  const [customer, setCustomer] = useState<ClientSessionCustomer | null>(initialCustomer);
  const [tab, setTab] = useState<ClientTab>("catalog");
  const orders = initialOrders;
  const sales = initialSales;
  const installments = initialInstallments;
  const [overlay, setOverlay] = useState<ClientOverlay>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const pendingConfirmationCount = useMemo(
    () =>
      sales.filter(
        (sale) => sale.payment_mode === "installment" && sale.confirmation_status === "pending"
      ).length,
    [sales]
  );

  const chatUnreadCount = useMemo(
    () => initialConversations.reduce((total, row) => total + row.unread_count, 0),
    [initialConversations]
  );

  const owedAmount = useMemo(
    () =>
      installments
        .filter((installment) => !installment.paid)
        .reduce((total, installment) => total + installment.amount, 0),
    [installments]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const switchStore = () => {
    router.push("/app?mode=client&step=stores");
  };

  const openConfirmSale = (saleId: string) => {
    startTransition(async () => {
      const result = await getCustomerSaleDetailAction(store.id, saleId);

      if (result.error || !result.sale) {
        showToast(result.error ?? "Não foi possível carregar a venda.");
        return;
      }

      setOverlay({ type: "confirmar", sale: result.sale });
    });
  };

  if (!customer) {
    return (
      <ClientAuth
        onEnter={(nextCustomer) => {
          setCustomer(nextCustomer);
          router.refresh();
        }}
        sessionHint={sessionHint}
        store={store}
      />
    );
  }

  const profileCustomer: PortalCustomer = customer;

  return (
    <div className="client-app">
      <div className="client-app-scroll">
        {tab === "stores" ? (
          <ClientLojasTab currentStore={store} onSwitchStore={switchStore} />
        ) : null}

        {tab === "catalog" ? (
          <ClientCatalog
            customer={customer}
            onOpenAccount={() => setOverlay({ type: "conta" })}
            onOrderSubmitted={(message) => {
              showToast(message);
              setTab("orders");
              router.refresh();
            }}
            onSwitchStore={switchStore}
            products={products}
            store={store}
          />
        ) : null}

        {tab === "orders" ? (
          <ClientPedidos
            onConfirmSale={openConfirmSale}
            onOpenSale={openConfirmSale}
            onToast={showToast}
            orders={orders}
            products={products}
            sales={sales}
            store={store}
          />
        ) : null}

        {tab === "chat" ? (
          <ClientChats
            conversations={initialConversations}
            store={store}
            storeId={store.id}
          />
        ) : null}

        {tab === "pay" ? (
          <ClientParcelas
            installments={installments}
            onPay={(installment) => setOverlay({ type: "pagar", installment })}
          />
        ) : null}
      </div>

      {toast ? <div className="client-toast">{toast}</div> : null}

      <nav aria-label="Navegação do cliente" className="vendor-bottom-nav">
        {NAV_LEFT.map((item) => (
          <button
            aria-current={tab === item.id ? "page" : undefined}
            className={`vendor-nav-button ${tab === item.id ? "vendor-nav-button-active" : ""}`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            <span className="vendor-nav-icon">
              <VendorIcon name={item.icon} size={22} stroke={tab === item.id ? 2.3 : 1.9} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="vendor-fab-slot">
          <button
            aria-current={tab === "orders" ? "page" : undefined}
            aria-label="Pedidos"
            className={`vendor-fab ${tab === "orders" ? "client-fab-active" : ""}`}
            onClick={() => setTab("orders")}
            type="button"
          >
            <VendorIcon name="receipt" size={26} />
            {pendingConfirmationCount > 0 ? (
              <em className="vendor-nav-badge">{pendingConfirmationCount}</em>
            ) : null}
          </button>
        </div>

        {NAV_RIGHT.map((item) => (
          <button
            aria-current={tab === item.id ? "page" : undefined}
            className={`vendor-nav-button ${tab === item.id ? "vendor-nav-button-active" : ""}`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            <span className="vendor-nav-icon">
              <VendorIcon name={item.icon} size={22} stroke={tab === item.id ? 2.3 : 1.9} />
            </span>
            <span>{item.label}</span>
            {item.id === "chat" && chatUnreadCount > 0 ? (
              <em className="vendor-nav-badge">{chatUnreadCount}</em>
            ) : null}
          </button>
        ))}
      </nav>

      {overlay?.type === "conta" ? (
        <ClientConta
          customer={profileCustomer}
          onClose={() => setOverlay(null)}
          onGoPay={() => {
            setOverlay(null);
            setTab("pay");
          }}
          onToast={showToast}
          owedAmount={owedAmount}
          onSwitchStore={switchStore}
          store={store}
        />
      ) : null}

      {overlay?.type === "pagar" ? (
        <ClientInformarPagamento
          installment={overlay.installment}
          onClose={() => setOverlay(null)}
          onToast={showToast}
          store={store}
        />
      ) : null}

      {overlay?.type === "confirmar" ? (
        <ClientConfirmarCompra
          onClose={() => setOverlay(null)}
          onGoPay={() => {
            setOverlay(null);
            setTab("pay");
          }}
          onToast={showToast}
          sale={overlay.sale}
          store={store}
        />
      ) : null}
    </div>
  );
}

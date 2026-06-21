"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientAuth } from "@/components/client/client-auth";
import { ClientCatalog } from "@/components/client/client-catalog";
import { ClientConfirmarCompra } from "@/components/client/client-confirmar-compra";
import { ClientConta } from "@/components/client/client-conta";
import { ClientInformarPagamento } from "@/components/client/client-informar-pagamento";
import { ClientParcelas } from "@/components/client/client-parcelas";
import { ClientPedidos } from "@/components/client/client-pedidos";
import { VendorIcon } from "@/components/vendor/icon";
import { getCustomerSaleDetailAction } from "@/lib/client/actions";
import type { ClientSessionCustomer } from "@/lib/client/actions";
import type {
  PortalCustomer,
  PortalInstallment,
  PortalOrder,
  PortalSaleDetail,
  PortalSaleSummary,
  PublicProduct,
  PublicStore
} from "@/lib/client/queries";

const TABS = [
  { id: "catalog", icon: "box" as const, label: "Catálogo" },
  { id: "orders", icon: "receipt" as const, label: "Pedidos" },
  { id: "pay", icon: "wallet" as const, label: "Parcelas" }
] as const;

type ClientTab = (typeof TABS)[number]["id"];

type ClientOverlay =
  | { type: "conta" }
  | { type: "pagar"; installment: PortalInstallment }
  | { type: "confirmar"; sale: PortalSaleDetail }
  | null;

export function ClientPortalApp({
  initialCustomer,
  initialInstallments,
  initialOrders,
  initialSales,
  products,
  store,
  customerStoreCount = 1
}: {
  initialCustomer: PortalCustomer | null;
  initialInstallments: PortalInstallment[];
  initialOrders: PortalOrder[];
  initialSales: PortalSaleSummary[];
  products: PublicProduct[];
  store: PublicStore;
  customerStoreCount?: number;
}) {
  const [customer, setCustomer] = useState<ClientSessionCustomer | null>(initialCustomer);
  const [isDemo, setIsDemo] = useState(false);
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

  if (!customer && !isDemo) {
    return (
      <ClientAuth
        onEnter={(nextCustomer) => {
          if (nextCustomer) {
            setCustomer(nextCustomer);
            setIsDemo(false);
          } else {
            setIsDemo(true);
          }
        }}
        store={store}
      />
    );
  }

  const profileCustomer: PortalCustomer =
    customer ??
    ({
      id: "demo",
      full_name: "Cliente demonstração",
      phone: "",
      email: null,
      avatar_color: "#11885b",
      address_postal_code: null,
      address_street: null,
      address_number: null,
      address_complement: null,
      address_neighborhood: null,
      address_city: null,
      address_state: null
    } satisfies PortalCustomer);

  return (
    <div className="client-app">
      <div className="client-app-scroll">
        {tab === "catalog" ? (
          <ClientCatalog
            customer={customer}
            isDemo={isDemo}
            onOpenAccount={() => setOverlay({ type: "conta" })}
            onOrderSubmitted={(message) => {
              showToast(message);
              setTab("orders");
              router.refresh();
            }}
            onSwitchStore={customer && customerStoreCount > 1 ? switchStore : undefined}
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

        {tab === "pay" ? (
          <ClientParcelas
            installments={installments}
            onPay={(installment) => setOverlay({ type: "pagar", installment })}
          />
        ) : null}
      </div>

      {toast ? <div className="client-toast">{toast}</div> : null}

      <nav aria-label="Navegação do cliente" className="client-bottom-nav">
        {TABS.map((item) => (
          <button
            className={`client-nav-button ${tab === item.id ? "client-nav-button-active" : ""}`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            <span className="client-nav-icon">
              <VendorIcon name={item.icon} size={22} stroke={tab === item.id ? 2.3 : 1.9} />
            </span>
            <span>{item.label}</span>
            {item.id === "orders" && pendingConfirmationCount > 0 ? (
              <em className="client-nav-badge">{pendingConfirmationCount}</em>
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
          onSwitchStore={customer && customerStoreCount > 1 ? switchStore : undefined}
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

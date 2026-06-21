import { ClientPortalApp } from "@/components/client/client-portal-app";
import {
  getPortalCustomer,
  getPublicStoreBySlug,
  listCustomerInstallmentsForPortal,
  listCustomerSalesForPortal,
  listCustomerStoresForPortal,
  listPortalOrders,
  listPublicProducts
} from "@/lib/client/queries";

type LojaPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LojaPage({ params }: LojaPageProps) {
  const { slug } = await params;

  let store = null;
  let storeError: string | null = null;

  try {
    store = await getPublicStoreBySlug(slug);
  } catch (err) {
    storeError = err instanceof Error ? err.message : "Erro desconhecido";
  }

  if (storeError) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f7f5"
        }}
      >
        <div
          style={{
            maxWidth: 400,
            textAlign: "center",
            padding: "32px 24px",
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 24px rgba(0,0,0,.07)"
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: "1.2rem", margin: "0 0 10px" }}>Erro ao carregar loja</h1>
          <p style={{ color: "#5a7366", fontSize: "0.9rem", margin: "0 0 8px" }}>
            Não foi possível conectar ao servidor. Tente novamente em instantes.
          </p>
          <p
            style={{
              color: "#a0aaa5",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              background: "#f4f7f5",
              padding: "8px 12px",
              borderRadius: 8,
              marginTop: 12,
              wordBreak: "break-all"
            }}
          >
            {storeError}
          </p>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f7f5"
        }}
      >
        <div
          style={{
            maxWidth: 400,
            textAlign: "center",
            padding: "32px 24px",
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 24px rgba(0,0,0,.07)"
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</div>
          <h1 style={{ fontSize: "1.2rem", margin: "0 0 10px" }}>Loja não encontrada</h1>
          <p style={{ color: "#5a7366", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
            A loja <strong style={{ fontFamily: "monospace" }}>/{slug}</strong> não existe ou não
            está ativa. Verifique o link com o vendedor.
          </p>
        </div>
      </main>
    );
  }

  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];
  let initialCustomer: Awaited<ReturnType<typeof getPortalCustomer>> = null;
  let customerStoreCount = 0;

  try {
    [products, initialCustomer] = await Promise.all([
      listPublicProducts(store.id),
      getPortalCustomer(store.id)
    ]);
    if (initialCustomer) {
      const stores = await listCustomerStoresForPortal().catch(() => []);
      customerStoreCount = stores.length;
    }
  } catch {
    // Products failed to load — still render the portal with empty state
  }

  const [initialOrders, initialSales, initialInstallments] = initialCustomer
    ? await Promise.all([
        listPortalOrders(store.id).catch(() => []),
        listCustomerSalesForPortal(store.id).catch(() => []),
        listCustomerInstallmentsForPortal(store.id).catch(() => [])
      ])
    : [[], [], []];
  const portalKey = [
    store.id,
    initialCustomer?.id ?? "guest",
    initialOrders.length,
    initialSales.length,
    initialInstallments.length
  ].join(":");

  return (
    <ClientPortalApp
      customerStoreCount={customerStoreCount}
      initialCustomer={initialCustomer}
      initialInstallments={initialInstallments}
      initialOrders={initialOrders}
      initialSales={initialSales}
      key={portalKey}
      products={products}
      store={store}
    />
  );
}

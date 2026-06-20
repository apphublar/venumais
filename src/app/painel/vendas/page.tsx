import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { SalesHistory } from "@/components/vendor/sales-history";
import { listStoreSales } from "@/lib/sales/queries";
import { requireStoreAccess } from "@/lib/auth/session";

type VendasPageProps = {
  searchParams: Promise<{ error?: string; cliente?: string }>;
};

export default async function VendasPage({ searchParams }: VendasPageProps) {
  const { store } = await requireStoreAccess();
  const query = await searchParams;
  const sales = await listStoreSales(store.id);

  const filteredSales = query.cliente
    ? sales.filter((sale) => sale.customer?.id === query.cliente)
    : sales;

  const subtitle = query.cliente
    ? `Extrato do cliente`
    : "Registro de vendas concluídas";

  return (
    <>
      <VendorScreenHeader
        backHref={query.cliente ? `/painel/clientes/${query.cliente}` : "/painel"}
        big
        subtitle={subtitle}
        title="Vendas"
      />

      {query.error === "payment" ? (
        <section className="vendor-screen-body">
          <p className="vendor-message vendor-message-error" role="alert">
            Não foi possível registrar o pagamento. Tente novamente.
          </p>
        </section>
      ) : null}

      <SalesHistory sales={filteredSales} />
    </>
  );
}

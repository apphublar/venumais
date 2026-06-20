import Link from "next/link";
import { notFound } from "next/navigation";
import { SaleDetailView } from "@/components/vendor/sale-detail-view";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { formatSaleCode, formatSaleDate } from "@/lib/sales/format";
import { getStoreSale } from "@/lib/sales/queries";
import { requireStoreAccess } from "@/lib/auth/session";

type VendaDetalhePageProps = {
  params: Promise<{ id: string }>;
};

export default async function VendaDetalhePage({
  params
}: VendaDetalhePageProps) {
  const { store } = await requireStoreAccess();
  const { id } = await params;
  const sale = await getStoreSale(store.id, id);

  if (!sale) {
    notFound();
  }

  const returnPath = `/painel/vendas/${sale.id}`;

  return (
    <>
      <VendorScreenHeader
        action={
          <Link
            aria-label="Ver recibo"
            className="vendor-icon-button"
            href={`/painel/vendas/${sale.id}/recibo`}
          >
            <VendorIcon name="receipt" size={20} />
          </Link>
        }
        backHref="/painel/vendas"
        subtitle={formatSaleDate(sale.sold_at)}
        title={`Venda #${formatSaleCode(sale.sale_code)}`}
      />

      <section className="vendor-screen-body">
        {/* Customer card */}
        {sale.customer ? (
          <Link href={`/painel/clientes/${sale.customer.id}`}>
            <VendorCard className="vendor-sale-customer-card">
              <VendorAvatar
                color={sale.customer.avatar_color ?? "#22a06b"}
                label={sale.customer.full_name[0].toUpperCase()}
                size={44}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{sale.customer.full_name}</strong>
                <span>{sale.customer.phone || "Sem WhatsApp"}</span>
              </div>
              <span style={{ color: "var(--vendor-ink-3)", display: "flex" }}>
                <VendorIcon name="chevR" size={20} />
              </span>
            </VendorCard>
          </Link>
        ) : null}

        {/* Interactive sale detail (badges, actions, sheets, installments) */}
        <SaleDetailView
          returnPath={returnPath}
          sale={sale}
          store={{
            name: store.name,
            pix_key: store.pix_key,
            pix_receiver_name: store.pix_receiver_name,
            slug: store.slug
          }}
        />
      </section>
    </>
  );
}

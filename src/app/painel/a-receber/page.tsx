import { VendorReceivablesAgendaClient } from "@/components/vendor/receivables-agenda-client";
import { VendorIcon } from "@/components/vendor/icon";
import Link from "next/link";
import { listReceivableInstallments } from "@/lib/sales/dashboard";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function ReceberPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { store } = await requireStoreAccess();
  const params = await searchParams;
  const installments = await listReceivableInstallments(store.id);

  return (
    <>
      <header className="vendor-page-header">
        <div className="vendor-page-header-row">
          <Link aria-label="Voltar" className="vendor-page-back" href="/painel">
            <VendorIcon name="chevL" size={20} />
          </Link>
          <div>
            <h1>A receber</h1>
            <p>Recebimentos previstos</p>
          </div>
        </div>
      </header>
      <VendorReceivablesAgendaClient
        filter={params.filter}
        installments={installments}
        store={{
          name: store.name,
          pix_key: store.pix_key,
          pix_receiver_name: store.pix_receiver_name
        }}
      />
    </>
  );
}

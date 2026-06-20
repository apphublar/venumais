import { InadimplenciaScreen } from "@/components/vendor/inadimplencia-screen";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { requireStoreAccess } from "@/lib/auth/session";
import { listReceivableInstallments } from "@/lib/sales/dashboard";

function countOverdue(installments: Awaited<ReturnType<typeof listReceivableInstallments>>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return installments.filter((installment) => {
    const due = new Date(`${installment.due_date}T00:00:00`);
    return due < today;
  }).length;
}

export default async function InadimplenciaPage() {
  const { store } = await requireStoreAccess();
  const installments = await listReceivableInstallments(store.id);
  const overdueCount = countOverdue(installments);

  return (
    <>
      <VendorScreenHeader
        backHref="/painel"
        subtitle={`${overdueCount} parcela${overdueCount === 1 ? "" : "s"} em atraso`}
        title="Inadimplência"
      />
      <InadimplenciaScreen
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

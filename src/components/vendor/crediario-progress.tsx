import type { SaleInstallment } from "@/lib/sales/types";
import { getSaleProgress } from "@/lib/sales/format";

export function VendorCrediarioProgress({
  installments
}: {
  installments: SaleInstallment[];
}) {
  const progress = getSaleProgress(installments);
  const percent = progress.total ? Math.round((progress.paidCount / progress.total) * 100) : 0;

  return (
    <div className="vendor-crediario-progress">
      <div className="vendor-crediario-progress-track">
        <div
          className={`vendor-crediario-progress-fill ${progress.remaining === 0 ? "vendor-crediario-progress-fill-done" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="vendor-crediario-progress-meta">
        <span>
          {progress.paidCount} de {progress.total} pagas
          {progress.remaining > 0 ? ` · faltam ${progress.remaining}` : ""}
        </span>
        {progress.remaining > 0 && progress.next ? (
          <span
            className={
              progress.nextLabel === "Última parcela"
                ? "vendor-crediario-progress-next-warn"
                : "vendor-crediario-progress-next"
            }
          >
            Próxima: {progress.nextLabel}
          </span>
        ) : (
          <span className="vendor-crediario-progress-next">Quitada ✓</span>
        )}
      </div>
    </div>
  );
}

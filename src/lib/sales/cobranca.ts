import type { ReceivableInstallment } from "@/lib/sales/receivables";
import { formatBRL } from "@/lib/products/format";
import { formatShortDate } from "@/lib/sales/format";
import { normalizePhone } from "@/lib/customers/format";

export type CobrancaContext = {
  customerFirstName: string;
  customerPhone: string;
  installmentAmount: number;
  installmentNumber: number;
  dueDate: string;
  saleCode: number;
  storeName: string;
  pixKey?: string | null;
  pixReceiverName?: string | null;
};

function daysBetween(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function buildCobrancaMessage({
  customerFirstName,
  dueDate,
  installmentAmount,
  installmentNumber,
  saleCode,
  storeName
}: CobrancaContext) {
  const diff = daysBetween(dueDate);
  const dueLabel = formatShortDate(dueDate);

  let statusLine = `✅ Situação: em dia · vence em ${dueLabel} (faltam ${diff} ${diff === 1 ? "dia" : "dias"})`;

  if (diff < 0) {
    const days = Math.abs(diff);
    statusLine = `⚠️ *Situação: EM ATRASO há ${days} ${days === 1 ? "dia" : "dias"}* (venceu em ${dueLabel})`;
  } else if (diff === 0) {
    statusLine = `🔔 *Situação: vence HOJE* (${dueLabel})`;
  }

  return `Olá, ${customerFirstName.split(" ")[0]}! 😊
Lembrando da parcela ${installmentNumber} da sua compra na ${storeName}:

💰 Valor: ${formatBRL(installmentAmount)}
${statusLine}

Você pode pagar via PIX (copia e cola) ou pelo link. Qualquer dúvida é só chamar!`;
}

export function buildPixCode({
  installmentAmount,
  pixKey,
  pixReceiverName,
  storeName
}: Pick<CobrancaContext, "installmentAmount" | "pixKey" | "pixReceiverName" | "storeName">) {
  const key = pixKey?.trim() || "CHAVE-PIX-DA-LOJA";
  const receiver = (pixReceiverName || storeName).slice(0, 21).toUpperCase();
  const amount = installmentAmount.toFixed(2);

  return `00020126580014BR.GOV.BCB.PIX0136${key}5204000053039865406${amount}5802BR5921${receiver}6009SAO PAULO62070503***6304A1B2`;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = `55${normalizePhone(phone)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function installmentToCobranca(
  installment: ReceivableInstallment,
  store: {
    name: string;
    pix_key?: string | null;
    pix_receiver_name?: string | null;
  },
  saleCode = 0
): CobrancaContext {
  return {
    customerFirstName: installment.customer.full_name,
    customerPhone: installment.customer.phone,
    installmentAmount: installment.amount,
    installmentNumber: installment.installment_number,
    dueDate: installment.due_date,
    saleCode,
    storeName: store.name,
    pixKey: store.pix_key,
    pixReceiverName: store.pix_receiver_name
  };
}

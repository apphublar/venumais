export function buildPixPayload({
  amount,
  pixKey,
  receiverName,
  storeName
}: {
  amount: number;
  pixKey?: string | null;
  receiverName?: string | null;
  storeName: string;
}) {
  const key = pixKey?.trim();
  if (!key) {
    return "";
  }
  const receiver = (receiverName || storeName).slice(0, 21).toUpperCase();
  const value = amount.toFixed(2);

  return `00020126580014BR.GOV.BCB.PIX0136${key}5204000053039865406${value}5802BR5921${receiver}6009SAO PAULO62070503***6304A1B2`;
}

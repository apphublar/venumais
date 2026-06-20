import { CuponsScreen } from "@/components/vendor/cupons-screen";
import { requireStoreAccess } from "@/lib/auth/session";
import { listStoreCoupons } from "@/lib/coupons/queries";

export default async function CuponsPage() {
  const { store } = await requireStoreAccess();
  const coupons = await listStoreCoupons(store.id);

  return <CuponsScreen initialCoupons={coupons} />;
}

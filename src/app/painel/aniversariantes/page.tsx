import { BirthdaysScreen } from "@/components/vendor/birthdays-screen";
import { requireStoreAccess } from "@/lib/auth/session";
import { listStoreCoupons } from "@/lib/coupons/queries";
import { listStoreCustomers } from "@/lib/customers/queries";

export default async function AniversariantesPage() {
  const { store } = await requireStoreAccess();
  const [customers, coupons] = await Promise.all([
    listStoreCustomers(store.id),
    listStoreCoupons(store.id)
  ]);

  const activeCoupons = coupons.filter((coupon) => coupon.active);

  return (
    <BirthdaysScreen activeCoupons={activeCoupons} customers={customers} storeName={store.name} />
  );
}

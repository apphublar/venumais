import type { VendorStoreOrder } from "@/lib/client/queries";
import { listVendorStoreOrders } from "@/lib/client/queries";
import type { SaleWithRelations } from "@/lib/sales/types";
import type { ReceivableInstallment } from "@/lib/sales/receivables";
export type { ReceivableInstallment } from "@/lib/sales/receivables";
export { filterInstallmentsForDailyCobranca, installmentDueBucket } from "@/lib/sales/receivables";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listStoreSales } from "@/lib/sales/queries";

type OpenInstallment = {
  amount: number;
  due_date: string;
  customer_id: string;
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysBetween(dueDate: string, today: Date) {
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function installmentBucket(dueDate: string, today: Date) {
  const diff = daysBetween(dueDate, today);

  if (diff < 0) {
    return "overdue" as const;
  }

  if (diff === 0) {
    return "today" as const;
  }

  return "future" as const;
}

async function listOpenInstallments(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_installments")
    .select("amount, due_date, sales!inner(store_id, customer_id)")
    .eq("sales.store_id", storeId)
    .eq("paid", false);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const sales = row.sales as { customer_id: string } | { customer_id: string }[];
    const sale = Array.isArray(sales) ? sales[0] : sales;

    return {
      amount: Number(row.amount),
      due_date: row.due_date,
      customer_id: sale.customer_id
    } satisfies OpenInstallment;
  });
}

async function getReceivedThisMonth(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from("sale_installments")
    .select("amount, sales!inner(store_id)")
    .eq("sales.store_id", storeId)
    .eq("paid", true)
    .gte("paid_at", monthStart.toISOString())
    .lte("paid_at", monthEnd.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((total, row) => total + Number(row.amount), 0);
}

async function getEstimatedProfit(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_items")
    .select("quantity, unit_price, unit_cost, sales!inner(store_id)")
    .eq("sales.store_id", storeId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((total, item) => {
    const margin = Number(item.unit_price) - Number(item.unit_cost);
    return total + margin * Number(item.quantity);
  }, 0);
}

async function getStockSummary(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("stock_qty")
    .eq("store_id", storeId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  return {
    totalItems: rows.reduce((total, product) => total + Number(product.stock_qty), 0),
    lowStockCount: rows.filter((product) => Number(product.stock_qty) <= 2).length
  };
}

async function countBirthdaysThisMonth(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("birth_date")
    .eq("store_id", storeId)
    .not("birth_date", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const month = new Date().getMonth() + 1;

  return (data ?? []).filter((customer) => {
    if (!customer.birth_date) {
      return false;
    }

    const [, birthMonth] = customer.birth_date.split("-").map(Number);
    return birthMonth === month;
  }).length;
}

export type DashboardReceivables = {
  today: number;
  week: number;
  month: number;
  overdue: number;
  overdueInstallmentCount: number;
  overdueCustomerIds: string[];
  todayCustomerIds: string[];
};

export type DashboardFeedItem =
  | { kind: "sale"; createdAt: string; sale: SaleWithRelations }
  | { kind: "order"; createdAt: string; order: VendorStoreOrder };

export type DashboardData = {
  receivables: DashboardReceivables;
  monthSalesTotal: number;
  monthSalesCount: number;
  receivedThisMonth: number;
  estimatedProfit: number;
  stock: {
    totalItems: number;
    lowStockCount: number;
  };
  recentSales: SaleWithRelations[];
  recentFeed: DashboardFeedItem[];
  birthdayCount: number;
};

export async function getDashboardData(storeId: string): Promise<DashboardData> {
  const today = startOfToday();
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const [installments, estimatedProfit, stock, birthdayCount, sales, receivedThisMonth, catalogOrders] =
    await Promise.all([
      listOpenInstallments(storeId),
      getEstimatedProfit(storeId),
      getStockSummary(storeId),
      countBirthdaysThisMonth(storeId),
      listStoreSales(storeId),
      getReceivedThisMonth(storeId),
      listVendorStoreOrders(storeId).catch(() => [] as VendorStoreOrder[])
    ]);

  const receivables: DashboardReceivables = {
    today: 0,
    week: 0,
    month: 0,
    overdue: 0,
    overdueInstallmentCount: 0,
    overdueCustomerIds: [],
    todayCustomerIds: []
  };

  const overdueCustomers = new Set<string>();
  const todayCustomers = new Set<string>();

  for (const installment of installments) {
    const bucket = installmentBucket(installment.due_date, today);
    const due = new Date(`${installment.due_date}T00:00:00`);
    const diff = daysBetween(installment.due_date, today);

    if (bucket === "today") {
      receivables.today += installment.amount;
      todayCustomers.add(installment.customer_id);
    }

    if (diff >= 0 && diff <= 6) {
      receivables.week += installment.amount;
    }

    if (
      due.getMonth() === month &&
      due.getFullYear() === year &&
      diff >= 0
    ) {
      receivables.month += installment.amount;
    }

    if (bucket === "overdue") {
      receivables.overdue += installment.amount;
      receivables.overdueInstallmentCount += 1;
      overdueCustomers.add(installment.customer_id);
    }
  }

  receivables.todayCustomerIds = [...todayCustomers];
  receivables.overdueCustomerIds = [...overdueCustomers];

  const monthSales = sales.filter((sale) => {
    const soldAt = new Date(sale.sold_at);
    return soldAt.getMonth() === month && soldAt.getFullYear() === year;
  });

  const recentFeed: DashboardFeedItem[] = [
    ...catalogOrders.map(
      (order) =>
        ({
          kind: "order",
          createdAt: order.created_at,
          order
        }) satisfies DashboardFeedItem
    ),
    ...sales.map(
      (sale) =>
        ({
          kind: "sale",
          createdAt: sale.sold_at,
          sale
        }) satisfies DashboardFeedItem
    )
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return {
    receivables,
    monthSalesTotal: monthSales.reduce((total, sale) => total + sale.total_amount, 0),
    monthSalesCount: monthSales.length,
    receivedThisMonth,
    estimatedProfit,
    stock,
    recentSales: sales.slice(0, 3),
    recentFeed,
    birthdayCount
  };
}

export async function listReceivableInstallments(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_installments")
    .select(
      "id, sale_id, installment_number, due_date, amount, sales!inner(store_id, customers(id, full_name, phone, avatar_color))"
    )
    .eq("sales.store_id", storeId)
    .eq("paid", false)
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const sales = row.sales as
      | {
          customers:
            | ReceivableInstallment["customer"]
            | ReceivableInstallment["customer"][];
        }
      | Array<{
          customers:
            | ReceivableInstallment["customer"]
            | ReceivableInstallment["customer"][];
        }>;
    const sale = Array.isArray(sales) ? sales[0] : sales;
    const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;

    return {
      id: row.id,
      sale_id: row.sale_id,
      installment_number: row.installment_number,
      due_date: row.due_date,
      amount: Number(row.amount),
      customer
    } satisfies ReceivableInstallment;
  });
}

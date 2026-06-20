import type {
  CustomerBalance,
  Sale,
  SaleInstallment,
  SaleItem,
  SaleWithRelations
} from "@/lib/sales/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getJoinedSaleCustomerId(sales: unknown) {
  if (Array.isArray(sales)) {
    const first = sales[0] as { customer_id?: string } | undefined;
    return first?.customer_id ?? null;
  }

  if (sales && typeof sales === "object" && "customer_id" in sales) {
    return String((sales as { customer_id: string }).customer_id);
  }

  return null;
}

function mapSaleWithRelations(
  sale: Sale & {
    customers?: { id: string; full_name: string; phone: string } | null;
    sale_items?: SaleItem[];
    sale_installments?: SaleInstallment[];
  }
): SaleWithRelations {
  return {
    ...sale,
    customer: sale.customers ?? undefined,
    items: sale.sale_items ?? [],
    installments: (sale.sale_installments ?? []).sort(
      (a, b) => a.installment_number - b.installment_number
    )
  };
}

export async function listStoreSales(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, customers(id, full_name, phone, avatar_color), sale_items(*), sale_installments(*)"
    )
    .eq("store_id", storeId)
    .order("sold_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((sale) => mapSaleWithRelations(sale as Sale & {
    customers?: { id: string; full_name: string; phone: string } | null;
    sale_items?: SaleItem[];
    sale_installments?: SaleInstallment[];
  }));
}

export async function getStoreSale(storeId: string, saleId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "*, customers(id, full_name, phone, avatar_color), sale_items(*), sale_installments(*)"
    )
    .eq("store_id", storeId)
    .eq("id", saleId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapSaleWithRelations(data as Sale & {
    customers?: { id: string; full_name: string; phone: string } | null;
    sale_items?: SaleItem[];
    sale_installments?: SaleInstallment[];
  });
}

export async function listCustomerSales(storeId: string, customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*), sale_installments(*)")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .order("sold_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((sale) => mapSaleWithRelations(sale as Sale & {
    sale_items?: SaleItem[];
    sale_installments?: SaleInstallment[];
  }));
}

export async function getCustomerBalances(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_installments")
    .select(
      "amount, paid, due_date, sales!inner(store_id, customer_id)"
    )
    .eq("sales.store_id", storeId)
    .eq("paid", false);

  if (error) {
    throw new Error(error.message);
  }

  const balances = new Map<string, CustomerBalance>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of data ?? []) {
    const customerId = getJoinedSaleCustomerId(row.sales);
    if (!customerId) {
      continue;
    }

    const current = balances.get(customerId) ?? {
      customer_id: customerId,
      owed_amount: 0,
      overdue: false
    };

    current.owed_amount += Number(row.amount);

    const due = new Date(`${row.due_date}T00:00:00`);
    if (due < today) {
      current.overdue = true;
    }

    balances.set(customerId, current);
  }

  return balances;
}

export async function getMonthSalesTotal(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabase
    .from("sales")
    .select("total_amount")
    .eq("store_id", storeId)
    .gte("sold_at", start)
    .lt("sold_at", end);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((total, sale) => total + Number(sale.total_amount), 0);
}

export async function getCustomerPaymentSummary(storeId: string, customerId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_installments")
    .select("amount, paid, due_date, sales!inner(store_id, customer_id)")
    .eq("sales.store_id", storeId)
    .eq("sales.customer_id", customerId);

  if (error) {
    throw new Error(error.message);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let owedAmount = 0;
  let paidAmount = 0;
  let overdue = false;

  for (const row of data ?? []) {
    const amount = Number(row.amount);

    if (row.paid) {
      paidAmount += amount;
      continue;
    }

    owedAmount += amount;

    const due = new Date(`${row.due_date}T00:00:00`);
    if (due < today) {
      overdue = true;
    }
  }

  return { owed_amount: owedAmount, paid_amount: paidAmount, overdue };
}

export async function getReceivablesTotal(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_installments")
    .select("amount, sales!inner(store_id)")
    .eq("sales.store_id", storeId)
    .eq("paid", false);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((total, row) => total + Number(row.amount), 0);
}

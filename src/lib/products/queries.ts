import type { Product } from "@/lib/database/types";
import { normalizeProduct } from "@/lib/products/normalize";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function listStoreProducts(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeProduct(row as Product));
}

export async function getStoreProduct(storeId: string, productId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeProduct(data as Product) : null;
}

export async function countStoreProducts(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function listStoreProductCategories(storeId: string) {
  const products = await listStoreProducts(storeId);
  return Array.from(new Set(products.map((product) => product.category))).sort();
}

export async function listLowStockProducts(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("stock_qty", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => normalizeProduct(row as Product))
    .filter((product) => product.stock_qty <= product.min_stock_qty);
}

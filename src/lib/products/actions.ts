"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreAccess } from "@/lib/auth/session";
import { countStoreProducts } from "@/lib/products/queries";
import {
  parseBRL,
  parseVariations,
  pickThumbColor
} from "@/lib/products/format";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProductActionState = {
  error?: string;
  redirectTo?: string;
};

function productErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("products_name_length")) {
    return "O nome precisa ter entre 2 e 160 caracteres.";
  }

  if (process.env.NODE_ENV === "development") {
    return `Erro técnico: ${message}`;
  }

  return "Não foi possível salvar o produto. Tente novamente.";
}

function parseProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "Geral";
  const sku = String(formData.get("sku") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cost = parseBRL(String(formData.get("cost") ?? ""));
  const price = parseBRL(String(formData.get("price") ?? ""));
  const hasPromo = formData.get("hasPromo") === "on";
  const promoPrice = hasPromo ? parseBRL(String(formData.get("promoPrice") ?? "")) : null;
  const hasWholesale = formData.get("hasWholesale") === "on";
  const wholesalePrice = hasWholesale
    ? parseBRL(String(formData.get("wholesalePrice") ?? ""))
    : null;
  const wholesaleMinQty = hasWholesale
    ? Number.parseInt(String(formData.get("wholesaleMinQty") ?? "0"), 10) || 0
    : null;
  const stockQty = Math.max(0, Number.parseInt(String(formData.get("stockQty") ?? "0"), 10) || 0);
  const minStockQty = Math.max(
    0,
    Number.parseInt(String(formData.get("minStockQty") ?? "0"), 10) || 0
  );
  const priceVisible = formData.get("priceVisible") === "on";
  const featured = formData.get("featured") === "on";
  const active = formData.get("active") !== "off";
  const variations = parseVariations(String(formData.get("variations") ?? ""));
  const barcode = String(formData.get("barcode") ?? "").trim();

  if (name.length < 2) {
    return { error: "Informe o nome do produto." };
  }

  return {
    data: {
      name,
      category,
      sku,
      description: description || null,
      cost,
      price,
      promo_price: promoPrice && promoPrice > 0 ? promoPrice : null,
      wholesale_price: wholesalePrice && wholesalePrice > 0 ? wholesalePrice : null,
      wholesale_min_qty: wholesaleMinQty,
      stock_qty: stockQty,
      min_stock_qty: minStockQty,
      price_visible: priceVisible,
      featured,
      active,
      variations,
      barcode: barcode || null
    }
  };
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const { store, user } = await requireStoreAccess();
  const parsed = parseProductForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await getSupabaseServerClient();
  const total = await countStoreProducts(store.id);

  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      created_by: user.id,
      thumb_color: pickThumbColor(total),
      ...parsed.data
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: productErrorMessage(error?.message ?? "insert_failed") };
  }

  revalidatePath("/painel/estoque");
  revalidatePath("/painel");
  return { redirectTo: `/painel/estoque/${data.id}` };
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const { store } = await requireStoreAccess();
  const parsed = parseProductForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    return { error: productErrorMessage(error.message) };
  }

  revalidatePath("/painel/estoque");
  revalidatePath(`/painel/estoque/${productId}`);
  revalidatePath("/painel");
  return { redirectTo: `/painel/estoque/${productId}` };
}

export async function deleteProductAction(productId: string) {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`/painel/estoque/${productId}?error=delete`);
  }

  revalidatePath("/painel/estoque");
  revalidatePath("/painel");
  redirect("/painel/estoque");
}

export async function adjustProductStockAction(
  productId: string,
  delta: number
) {
  const { store } = await requireStoreAccess();
  const product = await getSupabaseServerClient().then(async (supabase) => {
    const { data } = await supabase
      .from("products")
      .select("stock_qty")
      .eq("id", productId)
      .eq("store_id", store.id)
      .maybeSingle();

    return data;
  });

  if (!product) {
    redirect("/painel/estoque");
  }

  const supabase = await getSupabaseServerClient();
  const nextStock = Math.max(0, product.stock_qty + delta);

  await supabase
    .from("products")
    .update({ stock_qty: nextStock })
    .eq("id", productId)
    .eq("store_id", store.id);

  revalidatePath("/painel/estoque");
  revalidatePath(`/painel/estoque/${productId}`);
  revalidatePath("/painel");
  redirect(`/painel/estoque/${productId}`);
}

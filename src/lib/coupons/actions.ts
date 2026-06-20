"use server";

import { revalidatePath } from "next/cache";
import { requireStoreAccess } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type CreateCouponInput = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  description?: string;
};

export async function createCouponAction(
  input: CreateCouponInput
): Promise<{ error?: string }> {
  const { store, user } = await requireStoreAccess();

  const code = input.code.trim().toUpperCase();
  if (code.length < 3) {
    return { error: "Código deve ter ao menos 3 caracteres." };
  }
  if (input.value <= 0) {
    return { error: "Valor do desconto deve ser maior que zero." };
  }
  if (input.type === "percent" && input.value > 90) {
    return { error: "Desconto percentual não pode ultrapassar 90%." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("store_coupons").insert({
    store_id: store.id,
    code,
    type: input.type,
    value: input.value,
    description: input.description?.trim() || null,
    created_by: user.id
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cupom com esse código." };
    }
    return { error: "Não foi possível criar o cupom. Tente novamente." };
  }

  revalidatePath("/painel/cupons");
  return {};
}

export async function toggleCouponAction(
  couponId: string,
  active: boolean
): Promise<{ error?: string }> {
  const { store } = await requireStoreAccess();

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("store_coupons")
    .update({ active })
    .eq("id", couponId)
    .eq("store_id", store.id);

  if (error) {
    return { error: "Não foi possível atualizar o cupom." };
  }

  revalidatePath("/painel/cupons");
  return {};
}

export async function deleteCouponAction(
  couponId: string
): Promise<{ error?: string }> {
  const { store } = await requireStoreAccess();

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("store_coupons")
    .delete()
    .eq("id", couponId)
    .eq("store_id", store.id);

  if (error) {
    return { error: "Não foi possível excluir o cupom." };
  }

  revalidatePath("/painel/cupons");
  return {};
}

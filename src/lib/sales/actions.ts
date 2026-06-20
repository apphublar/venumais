"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreAccess } from "@/lib/auth/session";
import type {
  CreateSaleInstallmentInput,
  CreateSaleItemInput,
  OccurrenceType,
  PaymentMethod,
  PaymentMode
} from "@/lib/sales/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SaleActionState = {
  error?: string;
  redirectTo?: string;
};

function saleErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("estoque insuficiente")) {
    return message;
  }

  if (normalized.includes("sem permissão")) {
    return "Você não tem permissão para registrar vendas.";
  }

  if (process.env.NODE_ENV === "development") {
    return `Erro técnico: ${message}`;
  }

  return "Não foi possível registrar a venda. Tente novamente.";
}

export async function createSaleAction(input: {
  customerId: string;
  paymentMode: PaymentMode;
  paymentMethod: PaymentMethod;
  deliveryType: "pickup" | "delivery";
  notes?: string;
  discountAmount?: number;
  items: CreateSaleItemInput[];
  installments: CreateSaleInstallmentInput[];
}): Promise<SaleActionState> {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc("register_sale", {
    p_store_id: store.id,
    p_customer_id: input.customerId,
    p_payment_mode: input.paymentMode,
    p_payment_method: input.paymentMethod,
    p_delivery_type: input.deliveryType,
    p_notes: input.notes ?? "",
    p_discount_amount: input.discountAmount ?? 0,
    p_items: input.items,
    p_installments: input.installments
  });

  if (error) {
    return { error: saleErrorMessage(error.message) };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/vendas");
  revalidatePath("/painel/clientes");
  revalidatePath("/painel/estoque");
  revalidatePath(`/painel/clientes/${input.customerId}`);

  return { redirectTo: `/painel/vendas/${data}` };
}

export async function markInstallmentPaidAction(
  saleId: string,
  installmentId: string,
  paymentMethod: PaymentMethod,
  returnPath?: string
) {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("mark_installment_paid", {
    p_store_id: store.id,
    p_installment_id: installmentId,
    p_payment_method: paymentMethod
  });

  if (error) {
    redirect(returnPath ? `${returnPath}?error=payment` : `/painel/vendas/${saleId}?error=payment`);
  }

  revalidatePath("/painel");
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel/vendas");
  revalidatePath(`/painel/vendas/${saleId}`);
  revalidatePath("/painel/clientes");

  redirect(returnPath ?? `/painel/vendas/${saleId}`);
}

export async function confirmInstallmentPaidAction(
  installmentId: string,
  paymentMethod: PaymentMethod = "pix"
) {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("mark_installment_paid", {
    p_store_id: store.id,
    p_installment_id: installmentId,
    p_payment_method: paymentMethod
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel/vendas");
  revalidatePath("/painel/clientes");

  return { success: true as const };
}

export async function markMultipleInstallmentsPaidAction(
  saleId: string,
  installmentIds: string[],
  paymentMethod: PaymentMethod,
  returnPath: string
) {
  if (!installmentIds.length) return;
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("mark_multiple_installments_paid", {
    p_store_id: store.id,
    p_sale_id: saleId,
    p_installment_ids: installmentIds,
    p_payment_method: paymentMethod
  });

  if (error) {
    redirect(`${returnPath}?error=payment`);
  }

  revalidatePath("/painel");
  revalidatePath("/painel/a-receber");
  revalidatePath("/painel/vendas");
  revalidatePath(`/painel/vendas/${saleId}`);
  revalidatePath("/painel/clientes");

  redirect(returnPath);
}

export async function saveOccurrenceAction(
  saleId: string,
  type: OccurrenceType,
  obs: string,
  loss: number,
  products: string[],
  returnPath: string
) {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("save_sale_occurrence", {
    p_store_id: store.id,
    p_sale_id: saleId,
    p_type: type,
    p_obs: obs,
    p_loss: loss,
    p_products: products
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/painel/vendas/${saleId}`);
  revalidatePath("/painel/vendas");
  revalidatePath("/painel");

  redirect(returnPath);
}

export async function removeOccurrenceAction(saleId: string, returnPath: string) {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("remove_sale_occurrence", {
    p_store_id: store.id,
    p_sale_id: saleId
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/painel/vendas/${saleId}`);
  revalidatePath("/painel/vendas");
  revalidatePath("/painel");

  redirect(returnPath);
}

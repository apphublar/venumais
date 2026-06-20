"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreAccess } from "@/lib/auth/session";
import {
  formatPhoneDisplay,
  normalizePhone,
  pickAvatarColor
} from "@/lib/customers/format";
import {
  buildFormattedAddress,
  parseCustomerAddressForm
} from "@/lib/customers/address";
import { countStoreCustomers } from "@/lib/customers/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerActionState = {
  error?: string;
  redirectTo?: string;
};

function customerErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("customers_phone_length")) {
    return "Informe um WhatsApp válido com DDD.";
  }

  if (normalized.includes("customers_full_name_length")) {
    return "O nome precisa ter entre 2 e 120 caracteres.";
  }

  if (process.env.NODE_ENV === "development") {
    return `Erro técnico: ${message}`;
  }

  return "Não foi possível salvar o cliente. Tente novamente.";
}

function parseCustomerForm(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const addressParts = parseCustomerAddressForm(formData);
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (fullName.length < 2) {
    return { error: "Informe o nome completo do cliente." };
  }

  if (phone.length < 10) {
    return { error: "Informe um WhatsApp válido com DDD." };
  }

  return {
    data: {
      full_name: fullName,
      phone: formatPhoneDisplay(phone),
      email: email || null,
      address: buildFormattedAddress(addressParts),
      address_postal_code: addressParts.postal_code,
      address_street: addressParts.street,
      address_number: addressParts.number,
      address_complement: addressParts.complement,
      address_neighborhood: addressParts.neighborhood,
      address_city: addressParts.city,
      address_state: addressParts.state,
      birth_date: birthDate || null,
      notes: notes || null
    }
  };
}

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const { store, user } = await requireStoreAccess();
  const parsed = parseCustomerForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await getSupabaseServerClient();
  const total = await countStoreCustomers(store.id);

  const { data, error } = await supabase
    .from("customers")
    .insert({
      store_id: store.id,
      created_by: user.id,
      avatar_color: pickAvatarColor(total),
      ...parsed.data
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: customerErrorMessage(error?.message ?? "insert_failed") };
  }

  revalidatePath("/painel/clientes");
  return { redirectTo: `/painel/clientes/${data.id}` };
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const { store } = await requireStoreAccess();
  const parsed = parseCustomerForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", customerId)
    .eq("store_id", store.id);

  if (error) {
    return { error: customerErrorMessage(error.message) };
  }

  revalidatePath("/painel/clientes");
  revalidatePath(`/painel/clientes/${customerId}`);
  return { redirectTo: `/painel/clientes/${customerId}` };
}

export async function deleteCustomerAction(customerId: string) {
  const { store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`/painel/clientes/${customerId}?error=delete`);
  }

  revalidatePath("/painel/clientes");
  redirect("/painel/clientes");
}

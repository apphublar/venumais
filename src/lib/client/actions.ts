"use server";

import { revalidatePath } from "next/cache";
import { pickAvatarColor, normalizePhone } from "@/lib/customers/format";
import { getCustomerSaleForPortal, getPortalOrderForEdit } from "@/lib/client/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClientActionState = {
  error?: string;
  customer?: ClientSessionCustomer;
};

export type ClientSessionCustomer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_color: string;
  address_postal_code: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function clientAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }

  if (normalized.includes("user already registered")) {
    return "Este email já possui cadastro. Faça login.";
  }

  if (normalized.includes("password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }

  if (normalized.includes("cliente não vinculado")) {
    return "Conta sem cadastro nesta loja. Crie sua conta primeiro.";
  }

  if (process.env.NODE_ENV === "development") {
    return message;
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

async function loadCustomerForStore(storeId: string): Promise<ClientSessionCustomer | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_customer_for_store", {
    p_store_id: storeId
  });

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    id: row.id,
    full_name: row.full_name ?? "Cliente",
    phone: row.phone ?? "",
    email: row.email ?? null,
    avatar_color: row.avatar_color,
    address_postal_code: row.address_postal_code ?? null,
    address_street: row.address_street ?? null,
    address_number: row.address_number ?? null,
    address_complement: row.address_complement ?? null,
    address_neighborhood: row.address_neighborhood ?? null,
    address_city: row.address_city ?? null,
    address_state: row.address_state ?? null
  };
}

export async function clientSignUpAction(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const storeId = String(formData.get("storeId") ?? "");
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!storeId) {
    return { error: "Loja inválida." };
  }

  if (fullName.length < 2) {
    return { error: "Informe seu nome completo." };
  }

  if (!email.includes("@")) {
    return { error: "Informe um email válido." };
  }

  if (phone.length < 8) {
    return { error: "Informe um WhatsApp válido." };
  }

  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone
      }
    }
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  if (data.user && !data.session) {
    return {
      error: "Conta criada. Confirme seu email e faça login para continuar."
    };
  }

  const avatarColor = pickAvatarColor(fullName.length);
  const { data: customerId, error: registerError } = await supabase.rpc(
    "register_client_for_store",
    {
      p_store_id: storeId,
      p_full_name: fullName,
      p_phone: phone,
      p_email: email,
      p_avatar_color: avatarColor
    }
  );

  if (registerError) {
    return { error: clientAuthError(registerError.message) };
  }

  const customer = await loadCustomerForStore(storeId);

  if (!customer) {
    return {
      customer: {
        id: String(customerId),
        full_name: fullName,
        phone,
        email,
        avatar_color: avatarColor,
        address_postal_code: null,
        address_street: null,
        address_number: null,
        address_complement: null,
        address_neighborhood: null,
        address_city: null,
        address_state: null
      }
    };
  }

  revalidatePath(`/loja/${storeSlug}`);
  return { customer };
}

export async function clientSignInAction(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const storeId = String(formData.get("storeId") ?? "");
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!storeId) {
    return { error: "Loja inválida." };
  }

  if (!email || !password) {
    return { error: "Informe email e senha." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  const customer = await loadCustomerForStore(storeId);

  if (!customer) {
    return { error: clientAuthError("Cliente não vinculado à loja.") };
  }

  revalidatePath(`/loja/${storeSlug}`);
  return { customer };
}

export type CreateClientOrderInput = {
  storeId: string;
  storeSlug: string;
  deliveryType: "pickup" | "delivery";
  notes: string;
  couponCode?: string;
  items: Array<{ productId: string; quantity: number }>;
};

export async function createClientOrderAction(input: CreateClientOrderInput) {
  if (!input.items.length) {
    return { error: "Adicione itens ao pedido." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_client_order", {
    p_store_id: input.storeId,
    p_delivery_type: input.deliveryType,
    p_notes: input.notes,
    p_coupon_code: input.couponCode ?? "",
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity
    }))
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${input.storeSlug}`);
  revalidatePath("/painel/pedidos");

  return { orderId: String(data) };
}

export async function clientSignOutAction(storeSlug: string) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath(`/loja/${storeSlug}`);
}

export async function confirmCustomerSaleAction(storeId: string, storeSlug: string, saleId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("confirm_customer_sale", {
    p_store_id: storeId,
    p_sale_id: saleId
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${storeSlug}`);
  return { success: true as const };
}

export async function getCustomerSaleDetailAction(storeId: string, saleId: string) {
  const sale = await getCustomerSaleForPortal(storeId, saleId);

  if (!sale) {
    return { error: "Venda não encontrada." };
  }

  return { sale };
}

export async function getCustomerOrderDetailAction(storeId: string, orderId: string) {
  const order = await getPortalOrderForEdit(storeId, orderId);

  if (!order) {
    return { error: "Orçamento não encontrado." };
  }

  return { order };
}

export async function updateClientOrderAction(input: {
  storeId: string;
  storeSlug: string;
  orderId: string;
  deliveryType: "pickup" | "delivery";
  notes: string;
  items: Array<{ productId: string; quantity: number }>;
}): Promise<{ error?: string }> {
  if (!input.items.length) {
    return { error: "Adicione ao menos 1 item no pedido." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("update_customer_order_for_portal", {
    p_store_id: input.storeId,
    p_order_id: input.orderId,
    p_delivery_type: input.deliveryType,
    p_notes: input.notes,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity
    }))
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${input.storeSlug}`);
  revalidatePath("/painel/pedidos");
  return {};
}

export async function cancelClientOrderAction(input: {
  storeId: string;
  storeSlug: string;
  orderId: string;
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_customer_order_for_portal", {
    p_store_id: input.storeId,
    p_order_id: input.orderId
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${input.storeSlug}`);
  revalidatePath("/painel/pedidos");
  return {};
}

export async function finalizeClientOrderAction(input: {
  storeId: string;
  storeSlug: string;
  orderId: string;
  paymentMethod: "pix" | "cash" | "card";
  paymentNote?: string;
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("finalize_customer_order_for_portal", {
    p_store_id: input.storeId,
    p_order_id: input.orderId,
    p_payment_method: input.paymentMethod,
    p_payment_note: input.paymentNote?.trim() || null
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${input.storeSlug}`);
  revalidatePath("/painel/pedidos");
  return {};
}

export async function reportOrderPaymentAction(formData: FormData): Promise<{ error?: string }> {
  const storeId = String(formData.get("storeId") ?? "");
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const receipt = formData.get("receipt");

  if (!storeId || !storeSlug || !orderId) {
    return { error: "Dados inválidos para informar pagamento." };
  }

  if (!(receipt instanceof File) || receipt.size <= 0) {
    return { error: "Anexe um comprovante para enviar o pagamento." };
  }

  if (receipt.size > 5 * 1024 * 1024) {
    return { error: "O comprovante deve ter no máximo 5MB." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(receipt.type)) {
    return { error: "Formato inválido. Envie JPG, PNG, WEBP ou PDF." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "Sessão inválida. Faça login novamente." };
  }

  const safeName = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${user.id}/${storeSlug}/${orderId}-${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from("order-payment-proofs").upload(filePath, receipt, {
    cacheControl: "3600",
    upsert: false
  });

  if (upload.error) {
    return { error: "Não foi possível enviar o comprovante do pedido." };
  }

  const { data: publicData } = supabase.storage.from("order-payment-proofs").getPublicUrl(filePath);
  const { error } = await supabase.rpc("report_order_payment_for_portal", {
    p_store_id: storeId,
    p_order_id: orderId,
    p_proof_url: publicData.publicUrl,
    p_proof_name: receipt.name
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${storeSlug}`);
  revalidatePath("/painel/pedidos");
  return {};
}

export type UpdateClientProfileInput = {
  storeId: string;
  storeSlug: string;
  email?: string;
  phone?: string;
  address_postal_code?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
};

export async function updateClientProfileAction(
  input: UpdateClientProfileInput
): Promise<{ error?: string; customer?: ClientSessionCustomer }> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_customer_profile_for_portal", {
    p_store_id: input.storeId,
    p_email: input.email ?? null,
    p_phone: input.phone ?? null,
    p_address_postal_code: input.address_postal_code ?? null,
    p_address_street: input.address_street ?? null,
    p_address_number: input.address_number ?? null,
    p_address_complement: input.address_complement ?? null,
    p_address_neighborhood: input.address_neighborhood ?? null,
    p_address_city: input.address_city ?? null,
    p_address_state: input.address_state ?? null
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;

  revalidatePath(`/loja/${input.storeSlug}`);

  return {
    customer: {
      id: row.id,
      full_name: row.full_name ?? "Cliente",
      phone: row.phone ?? "",
      email: row.email ?? null,
      avatar_color: row.avatar_color,
      address_postal_code: row.address_postal_code ?? null,
      address_street: row.address_street ?? null,
      address_number: row.address_number ?? null,
      address_complement: row.address_complement ?? null,
      address_neighborhood: row.address_neighborhood ?? null,
      address_city: row.address_city ?? null,
      address_state: row.address_state ?? null
    }
  };
}

export async function updateClientPasswordAction(input: {
  storeSlug: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ error?: string; success?: true }> {
  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Preencha todos os campos de senha." };
  }

  if (newPassword.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "A confirmação da nova senha não confere." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Sessão inválida. Entre novamente para alterar sua senha." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (signInError) {
    return { error: "Senha atual incorreta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    return { error: clientAuthError(updateError.message) };
  }

  revalidatePath(`/loja/${input.storeSlug}`);
  return { success: true };
}

export async function reportInstallmentPaymentAction(
  formData: FormData
): Promise<{ error?: string }> {
  const storeId = String(formData.get("storeId") ?? "");
  const storeSlug = String(formData.get("storeSlug") ?? "");
  const installmentId = String(formData.get("installmentId") ?? "");
  const receipt = formData.get("receipt");

  if (!storeId || !storeSlug || !installmentId) {
    return { error: "Dados inválidos para informar pagamento." };
  }

  const supabase = await getSupabaseServerClient();
  let receiptUrl: string | null = null;
  let receiptName: string | null = null;

  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > 5 * 1024 * 1024) {
      return { error: "O comprovante deve ter no máximo 5MB." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(receipt.type)) {
      return { error: "Formato inválido. Envie JPG, PNG, WEBP ou PDF." };
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return { error: "Sessão inválida. Faça login novamente." };
    }

    const safeName = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${storeSlug}/${installmentId}-${Date.now()}-${safeName}`;
    const upload = await supabase.storage.from("payment-receipts").upload(filePath, receipt, {
      cacheControl: "3600",
      upsert: false
    });

    if (upload.error) {
      return { error: "Não foi possível enviar o comprovante." };
    }

    const { data: publicData } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);
    receiptUrl = publicData.publicUrl;
    receiptName = receipt.name;
  }

  const { error } = await supabase.rpc("report_installment_payment", {
    p_store_id: storeId,
    p_installment_id: installmentId,
    p_receipt_url: receiptUrl,
    p_receipt_name: receiptName
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${storeSlug}`);
  revalidatePath("/painel/a-receber");
  return {};
}

export async function requestClientAccountDeletionAction(input: {
  storeId: string;
  storeSlug: string;
  reason?: string;
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("request_customer_deletion_for_portal", {
    p_store_id: input.storeId,
    p_reason: input.reason?.trim() || null
  });

  if (error) {
    return { error: clientAuthError(error.message) };
  }

  revalidatePath(`/loja/${input.storeSlug}`);
  return {};
}

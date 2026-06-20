"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAppUrl } from "@/lib/env";
import { isValidStoreSlug, slugifyStoreName } from "@/lib/stores/slug";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }

  if (normalized.includes("user already registered")) {
    return "Este email já possui cadastro. Faça login ou recupere a senha.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar.";
  }

  if (normalized.includes("password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }

  if (
    normalized.includes("email_address_invalid") ||
    normalized.includes("unable to validate email")
  ) {
    return "Informe um email válido.";
  }

  if (normalized.includes("over_email_send_rate_limit") || normalized.includes("rate limit")) {
    return "Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.";
  }

  if (normalized.includes("fetch failed") || normalized.includes("network")) {
    return "Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.";
  }

  if (normalized.includes("duplicate key") || normalized.includes("stores_slug")) {
    return "Este endereço da loja já está em uso. Escolha outro.";
  }

  if (normalized.includes("redirect") && normalized.includes("not allowed")) {
    return "URL de redirecionamento não autorizada no Supabase. Avise o suporte técnico.";
  }

  if (process.env.NODE_ENV === "development") {
    return `Erro técnico: ${message}`;
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/painel");

  if (!email || !password) {
    return { error: "Informe email e senha." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  return { redirectTo: nextPath.startsWith("/") ? nextPath : "/painel" };
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (fullName.length < 2) {
    return { error: "Informe seu nome completo." };
  }

  if (!email.includes("@")) {
    return { error: "Informe um email válido." };
  }

  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await getSupabaseServerClient();
  const appUrl = getAppUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone
      },
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/criar-conta?step=loja")}`
    }
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  if (data.user && !data.session) {
    return {
      success:
        "Conta criada. Verifique seu email e clique no link de confirmação para continuar."
    };
  }

  if (phone && data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ phone, full_name: fullName })
      .eq("id", data.user.id);

    if (profileError) {
      return { error: authErrorMessage(profileError.message) };
    }
  }

  return { redirectTo: "/criar-conta?step=loja" };
}

export async function createStoreAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const storeName = String(formData.get("storeName") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugInput || slugifyStoreName(storeName);

  if (storeName.length < 2) {
    return { error: "Informe o nome da loja." };
  }

  if (!isValidStoreSlug(slug)) {
    return {
      error:
        "O endereço da loja precisa ter pelo menos 2 caracteres, apenas letras minúsculas, números e hífens."
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?next=/criar-conta?step=loja");
  }

  const { data: existingMembership } = await supabase
    .from("store_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    return { redirectTo: "/painel" };
  }

  const { error } = await supabase.from("stores").insert({
    owner_user_id: user.id,
    name: storeName,
    slug
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  revalidatePath("/painel");
  return { redirectTo: "/painel" };
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!email.includes("@")) {
    return { error: "Informe um email válido." };
  }

  const supabase = await getSupabaseServerClient();
  const appUrl = getAppUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/auth/redefinir-senha")}`
  });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  return {
    success:
      "Se existir uma conta com este email, enviamos um link para redefinir a senha."
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: authErrorMessage(error.message) };
  }

  redirect("/painel");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

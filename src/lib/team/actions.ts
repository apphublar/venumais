"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireStoreAccess } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function createInviteAction(
  role: "seller" | "admin" = "seller"
): Promise<{ error?: string; inviteUrl?: string; token?: string }> {
  const { store, user } = await requireStoreAccess();

  if (store.role !== "owner" && store.role !== "admin") {
    return { error: "Apenas o proprietário ou admin pode convidar membros." };
  }

  const token = randomBytes(24).toString("hex");
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from("store_invites").insert({
    store_id: store.id,
    role,
    token,
    invited_by: user.id
  });

  if (error) {
    return { error: "Não foi possível gerar o convite." };
  }

  revalidatePath("/painel/equipe");
  const inviteUrl = `${getAppUrl()}/convite?token=${token}`;
  return { inviteUrl, token };
}

export async function cancelInviteAction(
  inviteId: string
): Promise<{ error?: string }> {
  const { store } = await requireStoreAccess();

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("store_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId)
    .eq("store_id", store.id);

  if (error) {
    return { error: "Não foi possível cancelar o convite." };
  }

  revalidatePath("/painel/equipe");
  return {};
}

export async function removeMemberAction(
  memberId: string
): Promise<{ error?: string }> {
  const { store } = await requireStoreAccess();

  if (store.role !== "owner" && store.role !== "admin") {
    return { error: "Apenas o proprietário ou admin pode remover membros." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("store_members")
    .update({ status: "disabled" })
    .eq("id", memberId)
    .eq("store_id", store.id)
    .neq("role", "owner");

  if (error) {
    return { error: "Não foi possível remover o membro." };
  }

  revalidatePath("/painel/equipe");
  return {};
}

export async function acceptInviteAction(
  token: string
): Promise<{ error?: string; storeId?: string }> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc("accept_store_invite", {
    p_token: token
  });

  if (error || !data) {
    return { error: "Não foi possível aceitar o convite." };
  }

  const result = data as { error?: string; store_id?: string };
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/painel");
  return { storeId: result.store_id };
}

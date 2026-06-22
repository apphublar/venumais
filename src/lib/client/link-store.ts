import { pickAvatarColor } from "@/lib/customers/format";
import { getPortalCustomer, listCustomerStoresForPortal } from "@/lib/client/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClientProfileSnapshot = {
  fullName: string;
  phone: string;
  email: string;
  avatarColor: string;
};

export async function getClientProfileFromUser(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<ClientProfileSnapshot> {
  const { data: customers } = await supabase
    .from("customers")
    .select("full_name, phone, email, avatar_color")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const row = customers?.[0];
  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const metadataPhone =
    typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "";

  const fullName = row?.full_name?.trim() || metadataName.trim() || "Cliente";
  const phone = row?.phone?.trim() || metadataPhone.trim() || "";
  const email = row?.email?.trim() || user.email?.trim() || "";

  return {
    fullName,
    phone,
    email,
    avatarColor: row?.avatar_color ?? pickAvatarColor(fullName.length)
  };
}

export async function registerClientForStore(
  storeId: string,
  profile: ClientProfileSnapshot
) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("register_client_for_store", {
    p_store_id: storeId,
    p_full_name: profile.fullName,
    p_phone: profile.phone,
    p_email: profile.email,
    p_avatar_color: profile.avatarColor
  });

  return { error: error?.message ?? null };
}

export async function ensurePortalCustomerForStore(storeId: string) {
  const existing = await getPortalCustomer(storeId);
  if (existing) {
    return existing;
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const linkedStores = await listCustomerStoresForPortal();
  if (!linkedStores.length) {
    return null;
  }

  const profile = await getClientProfileFromUser(supabase, user);
  if (profile.phone.length < 8) {
    return null;
  }

  const { error } = await registerClientForStore(storeId, profile);
  if (error) {
    return null;
  }

  return getPortalCustomer(storeId);
}

export async function getClientSessionHint(storeId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const customer = await getPortalCustomer(storeId);
  if (customer) {
    return {
      email: user.email ?? "",
      canQuickLink: false,
      isLinked: true
    };
  }

  const linkedStores = await listCustomerStoresForPortal();

  return {
    email: user.email ?? "",
    canQuickLink: linkedStores.length > 0,
    isLinked: false
  };
}

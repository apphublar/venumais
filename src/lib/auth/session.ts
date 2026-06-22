import { redirect } from "next/navigation";
import type { Profile, Store, UserStore } from "@/lib/database/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireUser(nextPath = "/painel") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/app?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return data;
}

export async function getActiveStore(userId: string): Promise<UserStore | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("store_members")
    .select(
      "role, stores(id, name, slug, logo_url, brand_color, brand_text_color, brand_customized, status, currency, timezone, pix_key, pix_receiver_name, catalog_tagline)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const store = data?.stores as Store | null | undefined;

  if (!data || !store) {
    return null;
  }

  return {
    role: data.role,
    ...store
  };
}

export async function requireStoreAccess() {
  const user = await requireUser();
  const [profile, store] = await Promise.all([
    getCurrentProfile(user.id),
    getActiveStore(user.id)
  ]);

  if (!store) {
    redirect("/criar-conta?step=loja");
  }

  return { user, profile, store };
}

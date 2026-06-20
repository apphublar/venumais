import { getSupabaseServerClient } from "@/lib/supabase/server";

export type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
};

export type StoreInvite = {
  id: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export async function listTeamMembers(storeId: string): Promise<TeamMember[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("store_members")
    .select("id, user_id, role, status, joined_at, profiles(full_name, avatar_url)")
    .eq("store_id", storeId)
    .eq("status", "active")
    .neq("role", "owner")
    .order("joined_at", { ascending: true });

  if (!data) return [];

  return data.map((row) => {
    const profile = row.profiles as unknown as { full_name: string; avatar_url: string | null } | null;
    return {
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      status: row.status,
      joined_at: row.joined_at,
      full_name: profile?.full_name ?? "Vendedor",
      email: null,
      avatar_url: profile?.avatar_url ?? null
    };
  });
}

export async function listPendingInvites(storeId: string): Promise<StoreInvite[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("store_invites")
    .select("id, role, token, status, expires_at, created_at")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data as StoreInvite[]) ?? [];
}

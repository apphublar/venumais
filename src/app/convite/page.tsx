import { redirect } from "next/navigation";
import { AcceptInvitePage } from "@/components/vendor/accept-invite-page";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ConvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ConvitePage({ searchParams }: ConvitePageProps) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    redirect("/painel");
  }

  const supabase = await getSupabaseServerClient();
  const { data: inviteData } = await supabase.rpc("get_store_invite", { p_token: token });
  const invite = inviteData as {
    store_name: string;
    store_slug: string;
    role: string;
    expires_at: string;
    valid: boolean;
  } | null;

  const user = await getCurrentUser();

  return (
    <AcceptInvitePage invite={invite} isLoggedIn={!!user} token={token} />
  );
}

import { redirect } from "next/navigation";
import { TeamScreen } from "@/components/vendor/team-screen";
import { requireStoreAccess } from "@/lib/auth/session";
import { listPendingInvites, listTeamMembers } from "@/lib/team/queries";

export default async function EquipePage() {
  const { profile, store, user } = await requireStoreAccess();

  if (store.role !== "owner" && store.role !== "admin") {
    redirect("/painel");
  }

  const [members, invites] = await Promise.all([
    listTeamMembers(store.id),
    listPendingInvites(store.id)
  ]);

  return (
    <TeamScreen
      initialInvites={invites}
      initialMembers={members}
      ownerEmail={user.email ?? "proprietario@email.com"}
      ownerName={profile?.full_name ?? store.name}
    />
  );
}

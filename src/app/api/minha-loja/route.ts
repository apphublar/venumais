import { NextResponse } from "next/server";
import { getActiveStore, getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const store = await getActiveStore(user.id);

  if (!store) {
    return NextResponse.json({ error: "Nenhuma loja encontrada" }, { status: 404 });
  }

  const appUrl = getAppUrl();

  return NextResponse.json({
    id: store.id,
    name: store.name,
    slug: store.slug,
    status: store.status,
    portal_url: `${appUrl}/loja/${store.slug}`,
    panel_url: `${appUrl}/painel`
  });
}

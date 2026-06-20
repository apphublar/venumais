import { NextResponse } from "next/server";
import { getPublicStoreBySlug } from "@/lib/client/queries";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const store = await getPublicStoreBySlug(slug);

    if (!store) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      name: store.name,
      slug: store.slug,
      portal_url: `/loja/${store.slug}`
    });
  } catch (error) {
    return NextResponse.json(
      {
        exists: false,
        error: error instanceof Error ? error.message : "Erro ao verificar loja"
      },
      { status: 500 }
    );
  }
}

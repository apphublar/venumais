import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const { url, publishableKey } = getPublicSupabaseEnv();

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      cache: "no-store",
      headers: {
        apikey: publishableKey
      },
      signal: AbortSignal.timeout(5_000)
    });

    if (!response.ok) {
      return NextResponse.json(
        { service: "supabase", status: "unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      service: "supabase",
      status: "connected"
    });
  } catch {
    return NextResponse.json(
      { service: "supabase", status: "unavailable" },
      { status: 503 }
    );
  }
}

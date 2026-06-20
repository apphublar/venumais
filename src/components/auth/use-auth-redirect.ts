"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthActionState } from "@/lib/auth/actions";

export function useAuthRedirect(state: AuthActionState) {
  const router = useRouter();

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [router, state.redirectTo]);
}

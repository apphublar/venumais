"use client";

import type { ReactNode } from "react";

export function ClientOverlay({ children }: { children: ReactNode }) {
  return <div className="client-overlay">{children}</div>;
}

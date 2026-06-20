"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none"
      })
      .catch(() => {
        // Falha silenciosa: PWA continua instalável em alguns navegadores sem SW ativo.
      });
  }, []);

  return null;
}

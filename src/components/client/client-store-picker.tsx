"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StoreBrandLogo } from "@/components/client/store-brand-logo";
import { VendorIcon } from "@/components/vendor/icon";
import type { PublicStore } from "@/lib/client/queries";

export function ClientStorePicker({
  onBack,
  stores,
  title = "Suas lojas"
}: {
  onBack?: () => void;
  stores: PublicStore[];
  title?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(term) ||
        store.slug.toLowerCase().includes(term) ||
        store.catalog_tagline.toLowerCase().includes(term)
    );
  }, [query, stores]);

  return (
    <main className="app-shell">
      <div className="client-store-picker-hero">
        {onBack ? (
          <button aria-label="Voltar" className="app-hero-back" onClick={onBack} type="button">
            <VendorIcon name="chevL" size={20} />
          </button>
        ) : null}
        <h1>{title}</h1>
        <p>Escolha a loja para ver o catálogo, pedidos e parcelas.</p>
      </div>

      <section className="client-store-picker-body">
        <div className="client-search client-store-picker-search">
          <VendorIcon name="search" size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar loja..."
            type="search"
            value={query}
          />
          {query ? (
            <button aria-label="Limpar busca" onClick={() => setQuery("")} type="button">
              <VendorIcon name="x" size={13} />
            </button>
          ) : null}
        </div>

        <div className="client-store-picker-list">
          {filtered.length ? (
            filtered.map((store) => (
              <button
                className="client-store-picker-card"
                key={store.id}
                onClick={() => router.push(`/loja/${store.slug}`)}
                type="button"
              >
                <StoreBrandLogo label={store.name} logoUrl={store.logo_url} size={48} radius={14} />
                <span className="client-store-picker-card-copy">
                  <strong>{store.name}</strong>
                  <span>{store.catalog_tagline || store.slug}</span>
                </span>
                <VendorIcon name="chevR" size={18} />
              </button>
            ))
          ) : (
            <p className="client-store-picker-empty">
              {query ? "Nenhuma loja encontrada com esse termo." : "Você ainda não tem lojas vinculadas."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

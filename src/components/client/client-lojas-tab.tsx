"use client";

import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorIcon } from "@/components/vendor/icon";
import type { PublicStore } from "@/lib/client/queries";

export function ClientLojasTab({
  currentStore,
  onSwitchStore
}: {
  currentStore: PublicStore;
  onSwitchStore: () => void;
}) {
  return (
    <div className="client-lojas-tab">
      <ClientScreenHeader subtitle="Troque de loja ou acesse outra conta" title="Minhas lojas" />

      <div className="client-lojas-current">
        <VendorBrandMark label={currentStore.name} onLight size={52} />
        <div>
          <strong>{currentStore.name}</strong>
          <span>Loja atual</span>
        </div>
      </div>

      <button className="client-lojas-switch-btn" onClick={onSwitchStore} type="button">
        <VendorIcon name="split" size={18} />
        Trocar de loja
      </button>

      <p className="client-lojas-hint">
        Você será levado à lista de lojas vinculadas à sua conta para escolher outra ou acessar uma
        nova.
      </p>
    </div>
  );
}

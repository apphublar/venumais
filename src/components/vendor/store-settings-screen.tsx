"use client";

import { useState, useTransition } from "react";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { updateStoreAction } from "@/lib/stores/actions";
import type { Store } from "@/lib/database/types";

const BRAND_PRESETS = ["#11885b", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f766e"];

export function StoreSettingsScreen({ store }: { store: Store }) {
  const [name, setName] = useState(store.name);
  const [tagline, setTagline] = useState(store.catalog_tagline ?? "");
  const [pixKey, setPixKey] = useState(store.pix_key ?? "");
  const [pixReceiver, setPixReceiver] = useState(store.pix_receiver_name ?? "");
  const [brandColor, setBrandColor] = useState(store.brand_color ?? "#11885b");
  const [logoUrl, setLogoUrl] = useState(store.logo_url ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const portalUrl = `/loja/${store.slug}`;

  const handleSave = () => {
    startTransition(async () => {
      setStatus("idle");
      const result = await updateStoreAction({
        name,
        brand_color: brandColor,
        logo_url: logoUrl,
        catalog_tagline: tagline,
        pix_key: pixKey,
        pix_receiver_name: pixReceiver
      });
      if (result.error) {
        setErrorMsg(result.error);
        setStatus("error");
      } else {
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 2500);
      }
    });
  };

  return (
    <>
      <VendorScreenHeader
        backHref="/painel"
        subtitle="Marca, PIX e link do catálogo"
        title="Configurações da loja"
      />

      <section className="vendor-screen-body vendor-settings-screen">
        {status === "saved" ? (
          <div className="vendor-hint-card" role="status">
            <VendorIcon name="check" size={17} />
            <p>Alterações salvas com sucesso.</p>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="vendor-hint-card vendor-hint-card-error" role="alert">
            <VendorIcon name="alert" size={17} />
            <p>{errorMsg}</p>
          </div>
        ) : null}

        <label className="vendor-field">
          <span>Nome da loja</span>
          <input onChange={(event) => setName(event.target.value)} value={name} />
        </label>

        <div className="vendor-section-label">Personalização da marca</div>

        <div className="vendor-settings-brand-card">
          {logoUrl ? (
            <img alt={`Logo da loja ${name}`} className="vendor-settings-logo-preview" src={logoUrl} />
          ) : (
            <VendorBrandMark label={name} onLight size={56} />
          )}
          <div className="vendor-settings-brand-copy">
            <strong>Identidade da loja</strong>
            <span>Essa aparência será aplicada no app do vendedor e no portal do cliente.</span>
          </div>
        </div>

        <label className="vendor-field">
          <span>URL da logo (opcional)</span>
          <input
            onChange={(event) => setLogoUrl(event.target.value)}
            placeholder="https://sua-loja.com/logo.png"
            value={logoUrl}
          />
          <small className="vendor-settings-slug">Use uma imagem quadrada para melhor resultado.</small>
        </label>

        <label className="vendor-field">
          <span>Cor principal da marca</span>
          <div className="vendor-settings-color-input-row">
            <input
              className="vendor-settings-color-input"
              onChange={(event) => setBrandColor(event.target.value)}
              type="color"
              value={brandColor}
            />
            <input
              onChange={(event) => setBrandColor(event.target.value)}
              placeholder="#11885b"
              value={brandColor}
            />
          </div>
          <div className="vendor-settings-color-row">
            {BRAND_PRESETS.map((color) => (
              <button
                aria-label={`Aplicar cor ${color}`}
                className={`vendor-settings-color-chip ${brandColor.toLowerCase() === color ? "is-active" : ""}`}
                key={color}
                onClick={() => setBrandColor(color)}
                style={{ background: color }}
                type="button"
              />
            ))}
          </div>
        </label>

        <div className="vendor-field">
          <span>Link do catálogo (app do cliente)</span>
          <div className="vendor-portal-link-row">
            <input readOnly value={`localhost:3000${portalUrl}`} />
            <a
              className="vendor-button vendor-button-ghost vendor-portal-link-btn"
              href={portalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <VendorIcon name="box" size={16} />
              Abrir
            </a>
          </div>
          <small className="vendor-settings-slug">
            Compartilhe este link com seus clientes para que eles acessem o catálogo.
          </small>
        </div>

        <label className="vendor-field">
          <span>
            Frase do catálogo <em>(opcional)</em>
          </span>
          <input
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Ex.: Moda e acessórios com carinho"
            value={tagline}
          />
        </label>

        <div className="vendor-section-label">Recebimento PIX</div>

        <label className="vendor-field">
          <span>Chave PIX</span>
          <input
            onChange={(event) => setPixKey(event.target.value)}
            placeholder="email, telefone, CPF/CNPJ ou aleatória"
            value={pixKey}
          />
        </label>

        <label className="vendor-field">
          <span>Nome do recebedor</span>
          <input
            onChange={(event) => setPixReceiver(event.target.value)}
            placeholder="Como aparece na conta"
            value={pixReceiver}
          />
        </label>

        <button
          className="vendor-button vendor-button-primary"
          disabled={isPending}
          onClick={handleSave}
          type="button"
        >
          {isPending ? "Salvando…" : "Salvar configurações"}
        </button>

        <div className="vendor-dashboard-spacer" />
      </section>
    </>
  );
}

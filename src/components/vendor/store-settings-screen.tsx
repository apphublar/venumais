"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { updateStoreAction, uploadStoreLogoAction } from "@/lib/stores/actions";
import type { Store } from "@/lib/database/types";

const BRAND_PRESETS = ["#11885b", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f766e"];
const BRAND_TEXT_PRESETS = ["#ffffff", "#f8fafc", "#1f2937", "#111827", "#0f172a"];
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://venumais.vercel.app").replace(/\/+$/, "");

export function StoreSettingsScreen({ store }: { store: Store }) {
  const [name, setName] = useState(store.name);
  const [tagline, setTagline] = useState(store.catalog_tagline ?? "");
  const [pixKey, setPixKey] = useState(store.pix_key ?? "");
  const [pixReceiver, setPixReceiver] = useState(store.pix_receiver_name ?? "");
  const [brandColor, setBrandColor] = useState(store.brand_color ?? "#11885b");
  const [brandTextColor, setBrandTextColor] = useState(store.brand_text_color ?? "#ffffff");
  const [logoUrl, setLogoUrl] = useState(store.logo_url ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const portalUrl = `/loja/${store.slug}`;
  const catalogLink = `${APP_BASE_URL}${portalUrl}`;

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      if (logoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      setLogoFile(null);
      setLogoFileName("");
      setLogoPreviewUrl("");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      return;
    }

    if (selected.size > 3 * 1024 * 1024) {
      setStatus("error");
      setErrorMsg("A logo deve ter no máximo 3MB.");
      setLogoFile(null);
      setLogoFileName("");
      setLogoPreviewUrl("");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(selected.type)) {
      setStatus("error");
      setErrorMsg("Formato inválido. Envie PNG, JPG, WEBP ou SVG.");
      setLogoFile(null);
      setLogoFileName("");
      setLogoPreviewUrl("");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      return;
    }

    setStatus("idle");
    if (logoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoFile(selected);
    setLogoFileName(selected.name);
    setLogoPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSave = () => {
    startTransition(async () => {
      setStatus("idle");
      let nextLogoUrl = logoUrl;

      if (logoFile) {
        const upload = await uploadStoreLogoAction(logoFile);
        if (upload.error || !upload.url) {
          setErrorMsg(upload.error ?? "Não foi possível enviar a logo.");
          setStatus("error");
          return;
        }
        nextLogoUrl = upload.url;
      }

      const result = await updateStoreAction({
        name,
        brand_color: brandColor,
        brand_text_color: brandTextColor,
        logo_url: nextLogoUrl,
        catalog_tagline: tagline,
        pix_key: pixKey,
        pix_receiver_name: pixReceiver
      });
      if (result.error) {
        setErrorMsg(result.error);
        setStatus("error");
      } else {
        setLogoUrl(nextLogoUrl);
        setLogoFile(null);
        setLogoFileName("");
        setLogoPreviewUrl("");
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 2500);
      }
    });
  };

  return (
    <div className="vendor-form-screen">
      <VendorScreenHeader
        backHref="/painel"
        subtitle="Marca, PIX e link do catálogo"
        title="Configurações da loja"
      />

      <div className="vendor-form-page">
        <div className="vendor-form-page-body vendor-settings-screen">
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
          {logoPreviewUrl || logoUrl ? (
            <Image
              alt={`Logo da loja ${name}`}
              className="vendor-settings-logo-preview"
              height={56}
              loader={({ src }) => src}
              src={logoPreviewUrl || logoUrl}
              unoptimized
              width={56}
            />
          ) : (
            <VendorBrandMark label={name} onLight size={56} />
          )}
          <div className="vendor-settings-brand-copy">
            <strong>Identidade da loja</strong>
            <span>Essa aparência será aplicada no app do vendedor e no portal do cliente.</span>
          </div>
        </div>

        <label className="vendor-field">
          <span>Logo da loja (anexo)</span>
          <div className="vendor-settings-file-row">
            <input
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="vendor-settings-file-input"
              id="store-logo-upload"
              onChange={handleLogoSelect}
              ref={logoInputRef}
              type="file"
            />
            <label className="vendor-button vendor-button-ghost vendor-settings-upload-btn" htmlFor="store-logo-upload">
              <VendorIcon name="share" size={16} />
              Anexar logotipo
            </label>
            <span className="vendor-settings-file-name">
              {logoFileName || (logoUrl ? "Logotipo atual configurado" : "Nenhum arquivo escolhido")}
            </span>
          </div>
          {logoUrl || logoPreviewUrl ? (
            <button
              className="vendor-button vendor-button-ghost vendor-settings-clear-logo"
              onClick={() => {
                if (logoPreviewUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(logoPreviewUrl);
                }
                setLogoUrl("");
                setLogoFile(null);
                setLogoFileName("");
                setLogoPreviewUrl("");
                if (logoInputRef.current) {
                  logoInputRef.current.value = "";
                }
              }}
              type="button"
            >
              Remover logo
            </button>
          ) : null}
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

        <label className="vendor-field">
          <span>Cor dos textos sobre a cor da marca</span>
          <div className="vendor-settings-color-input-row">
            <input
              className="vendor-settings-color-input"
              onChange={(event) => setBrandTextColor(event.target.value)}
              type="color"
              value={brandTextColor}
            />
            <input
              onChange={(event) => setBrandTextColor(event.target.value)}
              placeholder="#FFFFFF"
              value={brandTextColor}
            />
          </div>
          <div className="vendor-settings-color-row">
            {BRAND_TEXT_PRESETS.map((color) => (
              <button
                aria-label={`Aplicar texto ${color}`}
                className={`vendor-settings-color-chip ${brandTextColor.toLowerCase() === color ? "is-active" : ""}`}
                key={color}
                onClick={() => setBrandTextColor(color)}
                style={{ background: color }}
                type="button"
              />
            ))}
          </div>
          <small className="vendor-settings-slug">
            Ajuste para manter contraste quando usar uma cor de marca clara.
          </small>
        </label>

        <div className="vendor-field">
          <span>Link do catálogo (app do cliente)</span>
          <div className="vendor-portal-link-row">
            <input readOnly value={catalogLink} />
            <a
              className="vendor-button vendor-button-ghost vendor-portal-link-btn"
              href={catalogLink}
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
        </div>
      </div>
    </div>
  );
}

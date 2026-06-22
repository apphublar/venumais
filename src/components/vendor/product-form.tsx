"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorBottomBar } from "@/components/vendor/vendor-bottom-bar";
import { VendorFormShell } from "@/components/vendor/vendor-form-shell";
import { VendorToggle } from "@/components/vendor/vendor-toggle";
import type { ProductActionState } from "@/lib/products/actions";
import { formatBRL, formatVariations, parseBRL } from "@/lib/products/format";
import type { Product } from "@/lib/database/types";

type ProductFormProps = {
  action: (
    prevState: ProductActionState,
    formData: FormData
  ) => Promise<ProductActionState>;
  categories: string[];
  product?: Product;
  submitLabel: string;
};

function sanitizeBarcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 40);
}

export function ProductForm({
  action,
  categories,
  product,
  submitLabel
}: ProductFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(product?.image_url ?? null);
  const [photoCleared, setPhotoCleared] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [cost, setCost] = useState(product ? String(product.cost).replace(".", ",") : "");
  const [price, setPrice] = useState(product ? String(product.price).replace(".", ",") : "");
  const [hasPromo, setHasPromo] = useState(Boolean(product?.promo_price));
  const [promoPrice, setPromoPrice] = useState(
    product?.promo_price ? String(product.promo_price).replace(".", ",") : ""
  );
  const [hasWholesale, setHasWholesale] = useState(Boolean(product?.wholesale_price));
  const [wholesalePrice, setWholesalePrice] = useState(
    product?.wholesale_price ? String(product.wholesale_price).replace(".", ",") : ""
  );
  const [wholesaleMinQty, setWholesaleMinQty] = useState(
    product?.wholesale_min_qty ? String(product.wholesale_min_qty) : ""
  );
  const [variations, setVariations] = useState(
    product ? formatVariations(product.variations) : ""
  );
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [priceVisible, setPriceVisible] = useState(product?.price_visible ?? true);
  const [sellWithoutStock, setSellWithoutStock] = useState(product?.sell_without_stock ?? false);
  const [stockVisible, setStockVisible] = useState(product?.stock_visible ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [stockQty, setStockQty] = useState(String(product?.stock_qty ?? 0));
  const [minStockQty, setMinStockQty] = useState(String(product?.min_stock_qty ?? 3));
  const [heightCm, setHeightCm] = useState(
    product?.height_cm != null ? String(product.height_cm).replace(".", ",") : ""
  );
  const [widthCm, setWidthCm] = useState(
    product?.width_cm != null ? String(product.width_cm).replace(".", ",") : ""
  );
  const [lengthCm, setLengthCm] = useState(
    product?.length_cm != null ? String(product.length_cm).replace(".", ",") : ""
  );
  const [weightKg, setWeightKg] = useState(
    product?.weight_kg != null ? String(product.weight_kg).replace(".", ",") : ""
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerHint, setScannerHint] = useState("Posicione o código de barras dentro da área da câmera.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(
    action,
    {}
  );

  useAuthRedirect(state);

  const margin = useMemo(() => {
    const costValue = parseBRL(cost);
    const priceValue = hasPromo && promoPrice ? parseBRL(promoPrice) : parseBRL(price);
    const profit = priceValue - costValue;

    if (priceValue <= 0) {
      return null;
    }

    return {
      profit,
      percent: Math.round((profit / priceValue) * 100)
    };
  }, [cost, hasPromo, price, promoPrice]);

  const promoPercent =
    hasPromo && parseBRL(promoPrice) > 0 && parseBRL(price) > 0
      ? Math.round((1 - parseBRL(promoPrice) / parseBRL(price)) * 100)
      : 0;

  const variationTags = variations
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPhotoCleared(false);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoPreview(null);
    setPhotoCleared(Boolean(product?.image_url));
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  const stopScanner = () => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const closeScanner = () => {
    stopScanner();
    setScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    async function startScanner() {
      if (!scannerOpen) return;

      setScannerError(null);
      setScannerHint("Posicione o código de barras dentro da área da câmera.");

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Seu dispositivo não suporta acesso à câmera neste navegador.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const BarcodeDetectorCtor = (
          window as Window & {
            BarcodeDetector?: new (options?: { formats?: string[] }) => {
              detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
            };
          }
        ).BarcodeDetector;

        if (!BarcodeDetectorCtor) {
          setScannerError("Leitor automático indisponível neste navegador. Use a digitação manual.");
          return;
        }

        const detector = new BarcodeDetectorCtor({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"]
        });

        const detectLoop = async () => {
          if (!videoRef.current || !scannerOpen) return;
          try {
            const result = await detector.detect(videoRef.current);
            const value = result[0]?.rawValue?.trim();
            if (value) {
              setBarcode(sanitizeBarcode(value));
              setScannerHint("Código detectado com sucesso.");
              closeScanner();
              return;
            }
          } catch {
            // Mantém o loop; alguns navegadores podem falhar em frames isolados.
          }

          scanTimerRef.current = window.setTimeout(detectLoop, 250);
        };

        detectLoop();
      } catch {
        setScannerError("Não foi possível abrir a câmera. Verifique as permissões.");
      }
    }

    startScanner();

    if (!scannerOpen) {
      stopScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  return (
    <form action={formAction} className="vendor-form-page-form" encType="multipart/form-data">
      <VendorFormShell
        footer={
          <>
            {state.error ? (
              <p className="vendor-message vendor-message-error" role="alert">
                {state.error}
              </p>
            ) : null}
            <VendorBottomBar
              disabled={pending || name.trim().length < 2}
              icon="check"
              label={submitLabel}
              pending={pending}
              type="submit"
            />
          </>
        }
      >
        <input
          accept="image/*"
          hidden
          name="productImage"
          onChange={onPhotoChange}
          ref={fileRef}
          type="file"
        />
        <input name="clearImage" type="hidden" value={photoCleared ? "on" : "off"} />

        <div className="vendor-photo-row">
          {photoPreview ? (
            <div className="vendor-photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={photoPreview} />
              <button
                className="vendor-photo-remove"
                onClick={removePhoto}
                type="button"
              >
                <VendorIcon name="x" size={13} />
              </button>
            </div>
          ) : (
            <button
              className="vendor-photo-picker"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <VendorIcon name="box" size={22} />
              <span>Foto</span>
            </button>
          )}
          <div>
            <strong style={{ fontSize: "0.88rem" }}>Foto do produto</strong>
            <p className="vendor-field-hint" style={{ marginTop: 2 }}>
              Opcional. Toque no quadro para escolher uma imagem.
            </p>
          </div>
        </div>

        <label className="vendor-field">
          <span>Nome *</span>
          <input
            minLength={2}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Perfume Floral 100ml"
            required
            type="text"
            value={name}
          />
        </label>

        <label className="vendor-field">
          <span>Categoria</span>
          <input
            name="category"
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Ex.: Perfumaria"
            type="text"
            value={category}
          />
        </label>

        {categories.length ? (
          <div className="vendor-chip-row">
            {categories.map((item) => (
              <button
                className={`vendor-chip ${category === item ? "vendor-chip-active" : ""}`}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <div className="vendor-form-section-title">Preços</div>

        <div className="vendor-field-grid">
          <label className="vendor-field">
            <span>Custo (R$)</span>
            <div className="vendor-money-box">
              <span>R$</span>
              <input
                inputMode="decimal"
                name="cost"
                onChange={(event) => setCost(event.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0,00"
                type="text"
                value={cost}
              />
            </div>
          </label>
          <label className="vendor-field">
            <span>Preço de venda (R$)</span>
            <div className="vendor-money-box">
              <span>R$</span>
              <input
                inputMode="decimal"
                name="price"
                onChange={(event) => setPrice(event.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0,00"
                type="text"
                value={price}
              />
            </div>
          </label>
        </div>

        <VendorCard className="vendor-setting-card vendor-setting-card-stack">
          <div className="vendor-setting-card-head">
            <span
              className="vendor-setting-card-icon"
              style={{
                background: hasPromo ? "#fde9e9" : "var(--vendor-chip)",
                color: hasPromo ? "#dc2626" : "var(--vendor-ink-3)",
                fontWeight: 800,
                fontSize: "1.05rem"
              }}
            >
              %
            </span>
            <div className="vendor-setting-card-body">
              <strong>Preço promocional</strong>
              <span>Mostra o preço antigo riscado</span>
            </div>
            <VendorToggle on={hasPromo} onChange={() => setHasPromo((value) => !value)} />
          </div>

          {hasPromo ? (
            <div className="vendor-money-box vendor-setting-inline-money">
              <span>R$</span>
              <input
                inputMode="decimal"
                name="promoPrice"
                onChange={(event) => setPromoPrice(event.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="Preço com desconto"
                type="text"
                value={promoPrice}
              />
              {promoPercent > 0 ? (
                <span style={{ color: "#dc2626", fontWeight: 800, fontSize: "0.75rem" }}>
                  -{promoPercent}%
                </span>
              ) : null}
            </div>
          ) : null}
        </VendorCard>

        <input name="hasPromo" type="hidden" value={hasPromo ? "on" : "off"} />

        {margin ? (
          <p
            className={`vendor-margin-hint ${
              margin.profit >= 0 ? "vendor-margin-hint-positive" : "vendor-margin-hint-negative"
            }`}
          >
            Lucro de {formatBRL(margin.profit)} por unidade · margem {margin.percent}%
          </p>
        ) : null}

        <VendorCard className="vendor-setting-card vendor-setting-card-stack">
          <div className="vendor-setting-card-head">
            <span
              className="vendor-setting-card-icon"
              style={{
                background: hasWholesale ? "var(--vendor-green-50)" : "var(--vendor-chip)",
                color: hasWholesale ? "var(--vendor-green-700)" : "var(--vendor-ink-3)"
              }}
            >
              <VendorIcon name="box" size={20} />
            </span>
            <div className="vendor-setting-card-body">
              <strong>Preço de atacado</strong>
              <span>Preço menor a partir de uma quantidade mínima</span>
            </div>
            <VendorToggle on={hasWholesale} onChange={() => setHasWholesale((value) => !value)} />
          </div>

          {hasWholesale ? (
            <div className="vendor-field-grid vendor-setting-inline-grid">
              <label className="vendor-field">
                <span>Preço atacado (R$)</span>
                <div className="vendor-money-box">
                  <span>R$</span>
                  <input
                    inputMode="decimal"
                    name="wholesalePrice"
                    onChange={(event) =>
                      setWholesalePrice(event.target.value.replace(/[^\d.,]/g, ""))
                    }
                    placeholder="0,00"
                    type="text"
                    value={wholesalePrice}
                  />
                </div>
              </label>
              <label className="vendor-field">
                <span>Qtd. mínima</span>
                <input
                  inputMode="numeric"
                  name="wholesaleMinQty"
                  onChange={(event) => setWholesaleMinQty(event.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 6"
                  type="text"
                  value={wholesaleMinQty}
                />
              </label>
            </div>
          ) : null}
        </VendorCard>

        <input name="hasWholesale" type="hidden" value={hasWholesale ? "on" : "off"} />

        <div className="vendor-form-section-title">Estoque</div>

        <div className="vendor-field-grid">
          <label className="vendor-field">
            <span>Quantidade</span>
            <input
              inputMode="numeric"
              min={0}
              name="stockQty"
              onChange={(event) => setStockQty(event.target.value.replace(/\D/g, ""))}
              type="number"
              value={stockQty}
            />
          </label>
          <label className="vendor-field">
            <span>Estoque mínimo</span>
            <input
              inputMode="numeric"
              min={0}
              name="minStockQty"
              onChange={(event) => setMinStockQty(event.target.value.replace(/\D/g, ""))}
              type="number"
              value={minStockQty}
            />
          </label>
        </div>

        <p className="vendor-field-hint">
          Você é avisado quando o estoque chegar nesse mínimo.
        </p>

        <VendorCard className="vendor-setting-card">
          <span
            className="vendor-setting-card-icon"
            style={{
              background: sellWithoutStock ? "#fff7ed" : "var(--vendor-chip)",
              color: sellWithoutStock ? "#b45309" : "var(--vendor-ink-3)"
            }}
          >
            <VendorIcon name="box" size={20} />
          </span>
          <div className="vendor-setting-card-body">
            <strong>Vender sem estoque</strong>
            <span>Cliente pode pedir mesmo com quantidade zerada</span>
          </div>
          <VendorToggle
            on={sellWithoutStock}
            onChange={() => setSellWithoutStock((value) => !value)}
          />
        </VendorCard>

        <VendorCard className="vendor-setting-card">
          <span
            className="vendor-setting-card-icon"
            style={{
              background: stockVisible ? "var(--vendor-green-50)" : "var(--vendor-chip)",
              color: stockVisible ? "var(--vendor-green-700)" : "var(--vendor-ink-3)"
            }}
          >
            <VendorIcon name="store" size={20} />
          </span>
          <div className="vendor-setting-card-body">
            <strong>Exibir quantidade no catálogo</strong>
            <span>Cliente vê quantas unidades estão disponíveis</span>
          </div>
          <VendorToggle on={stockVisible} onChange={() => setStockVisible((value) => !value)} />
        </VendorCard>

        <div className="vendor-form-section-title">Identificação</div>

        <label className="vendor-field">
          <span>Código SKU (opcional)</span>
          <input defaultValue={product?.sku ?? ""} name="sku" placeholder="Ex.: PF-100" type="text" />
        </label>

        <label className="vendor-field">
          <span>Código de barras (opcional)</span>
          <div style={{ display: "flex", gap: 9 }}>
            <input
              inputMode="numeric"
              onChange={(event) => setBarcode(sanitizeBarcode(event.target.value))}
              name="barcode"
              placeholder="Digite ou escaneie"
              style={{ flex: 1 }}
              type="text"
              value={barcode}
              maxLength={40}
            />
            <button
              className="vendor-icon-button"
              onClick={() => setScannerOpen(true)}
              style={{
                width: 52,
                borderColor: "var(--vendor-green-600)",
                background: "var(--vendor-green-50)",
                color: "var(--vendor-green-700)"
              }}
              title="Escanear"
              type="button"
            >
              <VendorIcon name="scan" size={22} />
            </button>
          </div>
        </label>

        <div className="vendor-form-section-title">Variações</div>

        <label className="vendor-field">
          <span>Tamanhos / cores (opcional)</span>
          <input
            name="variations"
            onChange={(event) => setVariations(event.target.value)}
            placeholder="Ex.: P, M, G, GG  ou  Preto, Branco"
            type="text"
            value={variations}
          />
        </label>

        <p className="vendor-field-hint">
          Separe por vírgula. O cliente escolhe a variação no pedido.
        </p>

        {variationTags.length ? (
          <div className="vendor-variation-tags">
            {variationTags.map((tag, index) => (
              <span className="vendor-variation-tag" key={`${tag}-${index}`}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="vendor-form-section-title">Dimensões e peso (para entrega)</div>

        <div className="vendor-field-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            ["heightCm", "Alt (cm)"],
            ["widthCm", "Larg (cm)"],
            ["lengthCm", "Comp (cm)"]
          ].map(([name, label]) => (
            <label className="vendor-field" key={name}>
              <span>{label}</span>
              <div className="vendor-money-box" style={{ padding: "10px 12px" }}>
                <input
                  inputMode="decimal"
                  name={name}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^\d.,]/g, "");
                    if (name === "heightCm") setHeightCm(value);
                    if (name === "widthCm") setWidthCm(value);
                    if (name === "lengthCm") setLengthCm(value);
                  }}
                  placeholder="0"
                  type="text"
                  value={name === "heightCm" ? heightCm : name === "widthCm" ? widthCm : lengthCm}
                />
              </div>
            </label>
          ))}
        </div>

        <label className="vendor-field">
          <span>Peso (kg)</span>
          <div className="vendor-money-box">
            <input
              inputMode="decimal"
              name="weightKg"
              onChange={(event) => setWeightKg(event.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,000"
              type="text"
              value={weightKg}
            />
            <span>kg</span>
          </div>
        </label>

        <div className="vendor-form-section-title">Descrição e visibilidade</div>

        <label className="vendor-field">
          <textarea
            defaultValue={product?.description ?? ""}
            name="description"
            placeholder="Detalhes do produto, material, indicações..."
            rows={4}
          />
        </label>

        <VendorCard className="vendor-setting-card">
          <span
            className="vendor-setting-card-icon"
            style={{
              background: featured ? "var(--vendor-green-50)" : "var(--vendor-chip)",
              color: featured ? "var(--vendor-green-700)" : "var(--vendor-ink-3)"
            }}
          >
            <VendorIcon name="star" size={20} />
          </span>
          <div className="vendor-setting-card-body">
            <strong>Mostrar no topo da loja</strong>
            <span>Aparece em destaque no catálogo</span>
          </div>
          <VendorToggle on={featured} onChange={() => setFeatured((value) => !value)} />
        </VendorCard>

        <VendorCard className="vendor-setting-card">
          <span
            className="vendor-setting-card-icon"
            style={{
              background: priceVisible ? "var(--vendor-green-50)" : "#fff7ed",
              color: priceVisible ? "var(--vendor-green-700)" : "#b45309"
            }}
          >
            <VendorIcon name={priceVisible ? "eye" : "eyeOff"} size={20} />
          </span>
          <div className="vendor-setting-card-body">
            <strong>Exibir preço no catálogo</strong>
            <span>{priceVisible ? "Cliente vê o valor" : "Cliente pede orçamento"}</span>
          </div>
          <VendorToggle on={priceVisible} onChange={() => setPriceVisible((value) => !value)} />
        </VendorCard>

        <VendorCard className="vendor-setting-card">
          <span
            className="vendor-setting-card-icon"
            style={{
              background: active ? "var(--vendor-green-50)" : "var(--vendor-chip)",
              color: active ? "var(--vendor-green-700)" : "var(--vendor-ink-3)"
            }}
          >
            <VendorIcon name="check" size={20} />
          </span>
          <div className="vendor-setting-card-body">
            <strong>Produto ativo</strong>
            <span>{active ? "Disponível para venda" : "Oculto / pausado"}</span>
          </div>
          <VendorToggle on={active} onChange={() => setActive((value) => !value)} />
        </VendorCard>

        <input name="priceVisible" type="hidden" value={priceVisible ? "on" : "off"} />
        <input name="sellWithoutStock" type="hidden" value={sellWithoutStock ? "on" : "off"} />
        <input name="stockVisible" type="hidden" value={stockVisible ? "on" : "off"} />
        <input name="featured" type="hidden" value={featured ? "on" : "off"} />
        <input name="active" type="hidden" value={active ? "on" : "off"} />
      </VendorFormShell>
      {scannerOpen ? (
        <div className="vendor-sheet-backdrop" onClick={closeScanner} role="presentation">
          <div
            aria-labelledby="barcode-scanner-title"
            aria-modal="true"
            className="vendor-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="vendor-sheet-handle" />
            <div className="vendor-sheet-header">
              <h2 id="barcode-scanner-title">Escanear código de barras</h2>
              <button aria-label="Fechar" className="vendor-sheet-close" onClick={closeScanner} type="button">
                <VendorIcon name="x" size={20} />
              </button>
            </div>
            <div className="vendor-sheet-body" style={{ display: "grid", gap: 12 }}>
              <video
                autoPlay
                muted
                playsInline
                ref={videoRef}
                style={{
                  width: "100%",
                  maxHeight: 240,
                  borderRadius: 14,
                  background: "#000",
                  objectFit: "cover"
                }}
              />
              <p className="vendor-field-hint" style={{ margin: 0 }}>
                {scannerError ?? scannerHint}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="vendor-button vendor-button-ghost"
                  onClick={() => {
                    const manual = window.prompt("Digite o código de barras:");
                    if (manual?.trim()) {
                      setBarcode(sanitizeBarcode(manual));
                      closeScanner();
                    }
                  }}
                  style={{ flex: 1 }}
                  type="button"
                >
                  Digitar código
                </button>
                <button className="vendor-button vendor-button-primary" onClick={closeScanner} style={{ flex: 1 }} type="button">
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

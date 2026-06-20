"use client";

import { useMemo, useState, useTransition } from "react";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import { VendorToggle } from "@/components/vendor/vendor-toggle";
import { createCouponAction, deleteCouponAction, toggleCouponAction } from "@/lib/coupons/actions";
import type { StoreCoupon } from "@/lib/coupons/types";
import { formatBRL, parseBRL } from "@/lib/products/format";

function NovoCupomSheet({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (coupon: StoreCoupon) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"percent" | "fixed">("percent");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const valN = parseBRL(valor);
  const valid = codigo.trim().length >= 3 && valN > 0 && (tipo !== "percent" || valN <= 90);

  const handleCreate = () => {
    if (!valid) return;
    startTransition(async () => {
      setError("");
      const result = await createCouponAction({
        code: codigo,
        type: tipo,
        value: valN,
        description: descricao
      });
      if (result.error) {
        setError(result.error);
      } else {
        onCreate({
          id: `optimistic-${Date.now()}`,
          store_id: "",
          code: codigo.trim().toUpperCase(),
          type: tipo,
          value: valN,
          description: descricao.trim() || null,
          uses_count: 0,
          active: true,
          created_at: new Date().toISOString()
        });
        onClose();
      }
    });
  };

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="novo-cupom-title"
        aria-modal="true"
        className="vendor-sheet vendor-sheet-tall"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="novo-cupom-title">Novo cupom</h2>
          <button aria-label="Fechar" className="vendor-dashboard-icon-btn" onClick={onClose} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          {error ? (
            <p className="vendor-message vendor-message-error">{error}</p>
          ) : null}

          <label className="vendor-field">
            <span>Código do cupom *</span>
            <input
              className="vendor-field-mono"
              onChange={(event) =>
                setCodigo(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="EX.: PROMO10"
              value={codigo}
            />
          </label>

          <div className="vendor-field">
            <span>Tipo de desconto</span>
            <div className="vendor-cupom-type-row">
              {(
                [
                  ["percent", "Percentual (%)"],
                  ["fixed", "Valor fixo (R$)"]
                ] as const
              ).map(([key, label]) => (
                <button
                  className={`vendor-cupom-type-btn ${tipo === key ? "vendor-cupom-type-btn-active" : ""}`.trim()}
                  key={key}
                  onClick={() => setTipo(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="vendor-field">
            <span>{tipo === "percent" ? "Percentual de desconto" : "Valor do desconto"}</span>
            <div className="vendor-cupom-value-box">
              <span>{tipo === "percent" ? "%" : "R$"}</span>
              <input
                inputMode="decimal"
                onChange={(event) => setValor(event.target.value.replace(/[^\d.,]/g, ""))}
                placeholder={tipo === "percent" ? "10" : "15,00"}
                value={valor}
              />
            </div>
            {tipo === "percent" && valN > 90 ? (
              <p className="vendor-message vendor-message-error">Máximo de 90%.</p>
            ) : null}
          </div>

          <label className="vendor-field">
            <span>
              Descrição <em>(opcional)</em>
            </span>
            <input
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Ex.: Promo de aniversário"
              value={descricao}
            />
          </label>

          <button
            className="vendor-button vendor-button-primary"
            disabled={!valid || isPending}
            onClick={handleCreate}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {isPending ? "Criando…" : "Criar cupom"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CouponRow({
  coupon,
  onDelete,
  onToggle
}: {
  coupon: StoreCoupon;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <VendorCard className="vendor-cupom-row">
      <span className={`vendor-cupom-row-icon ${coupon.active ? "" : "vendor-cupom-row-icon-inactive"}`.trim()}>
        <VendorIcon name="ticket" size={22} />
      </span>
      <div className="vendor-cupom-row-copy">
        <div>
          <strong>{coupon.code}</strong>
          <em>
            {coupon.type === "percent" ? `${coupon.value}%` : formatBRL(coupon.value)}
          </em>
        </div>
        <span>
          {coupon.description || (coupon.type === "percent" ? "Desconto percentual" : "Desconto fixo")} ·{" "}
          {coupon.uses_count} usos
        </span>
      </div>
      <VendorToggle on={coupon.active} onChange={onToggle} />
      <button
        aria-label="Excluir cupom"
        className="vendor-cupom-delete-btn"
        onClick={(event) => {
          event.stopPropagation();
          if (window.confirm(`Excluir o cupom "${coupon.code}"?`)) {
            onDelete();
          }
        }}
        type="button"
      >
        <VendorIcon name="x" size={16} />
      </button>
    </VendorCard>
  );
}

export function CuponsScreen({ initialCoupons }: { initialCoupons: StoreCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [novoOpen, setNovoOpen] = useState(false);

  const active = useMemo(() => coupons.filter((coupon) => coupon.active), [coupons]);
  const inactive = useMemo(() => coupons.filter((coupon) => !coupon.active), [coupons]);

  const toggleCoupon = (id: string, currentActive: boolean) => {
    setCoupons((current) =>
      current.map((coupon) => (coupon.id === id ? { ...coupon, active: !currentActive } : coupon))
    );
    toggleCouponAction(id, !currentActive);
  };

  const deleteCoupon = (id: string) => {
    setCoupons((current) => current.filter((coupon) => coupon.id !== id));
    deleteCouponAction(id);
  };

  return (
    <>
      <VendorScreenHeader
        action={
          <button
            aria-label="Novo cupom"
            className="vendor-icon-button vendor-icon-button-primary"
            onClick={() => setNovoOpen(true)}
            type="button"
          >
            <VendorIcon name="plus" size={20} />
          </button>
        }
        backHref="/painel"
        subtitle={`${active.length} ativo${active.length !== 1 ? "s" : ""}`}
        title="Cupons de desconto"
      />

      <section className="vendor-screen-body vendor-cupons-screen">
        <div className="vendor-info-banner">
          <VendorIcon name="ticket" size={18} />
          <p>
            Crie cupons para suas promoções. O cliente aplica o código no carrinho do app, e você pode usar na
            hora de fechar uma venda.
          </p>
        </div>

        <VendorSectionLabel>Ativos</VendorSectionLabel>
        {active.map((coupon) => (
          <CouponRow
            coupon={coupon}
            key={coupon.id}
            onDelete={() => deleteCoupon(coupon.id)}
            onToggle={() => toggleCoupon(coupon.id, coupon.active)}
          />
        ))}
        {!active.length ? (
          <div className="vendor-empty vendor-empty-compact">
            <p>Nenhum cupom ativo.</p>
          </div>
        ) : null}

        {inactive.length ? (
          <>
            <VendorSectionLabel>Inativos</VendorSectionLabel>
            {inactive.map((coupon) => (
              <CouponRow
                coupon={coupon}
                key={coupon.id}
                onDelete={() => deleteCoupon(coupon.id)}
                onToggle={() => toggleCoupon(coupon.id, coupon.active)}
              />
            ))}
          </>
        ) : null}

        <div className="vendor-dashboard-spacer" />
      </section>

      {novoOpen ? (
        <NovoCupomSheet
          onClose={() => setNovoOpen(false)}
          onCreate={(coupon) => setCoupons((current) => [coupon, ...current])}
        />
      ) : null}
    </>
  );
}

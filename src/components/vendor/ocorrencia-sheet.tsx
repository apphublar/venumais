"use client";

import { useState, useTransition } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import { removeOccurrenceAction, saveOccurrenceAction } from "@/lib/sales/actions";
import type { OccurrenceType, SaleItem, SaleWithRelations } from "@/lib/sales/types";

const OC_META: Record<
  OccurrenceType,
  { label: string; icon: string; bg: string; fg: string }
> = {
  reclamacao: { label: "Reclamação", icon: "alert", bg: "#fef3c7", fg: "#92660b" },
  troca: { label: "Produto trocado", icon: "split", bg: "#dbeafe", fg: "#1e478f" },
  reembolso: { label: "Reembolsado", icon: "arrowDown", bg: "#fee2e2", fg: "#b1182a" }
};

const TIPOS: OccurrenceType[] = ["reclamacao", "troca", "reembolso"];

function brMoney(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
}
function parseBRL(v: string) {
  return Number.parseFloat(v.replace(/\./g, "").replace(",", ".").trim()) || 0;
}

export function OcorrenciaSheet({
  sale,
  returnPath,
  onClose
}: {
  sale: SaleWithRelations;
  returnPath: string;
  onClose: () => void;
}) {
  const ex = sale.occurrence_type
    ? {
        tipo: sale.occurrence_type,
        obs: sale.occurrence_obs ?? "",
        prejuizo: sale.occurrence_loss ?? 0,
        produtos: (sale.occurrence_products as string[]) ?? []
      }
    : null;

  const [tipo, setTipo] = useState<OccurrenceType>(ex ? ex.tipo : "reclamacao");
  const [obs, setObs] = useState(ex ? ex.obs : "");
  const [temPrejuizo, setTemPrejuizo] = useState(ex ? ex.prejuizo > 0 : false);
  const [prejuizo, setPrejuizo] = useState(
    ex && ex.prejuizo ? brMoney(ex.prejuizo) : ""
  );
  const [prodSel, setProdSel] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    (ex?.produtos ?? []).forEach((pid) => {
      m[pid] = true;
    });
    return m;
  });
  const [isPending, startTransition] = useTransition();

  const toggleProd = (pid: string) => {
    setProdSel((prev) => {
      const next = { ...prev, [pid]: !prev[pid] };
      const soma = sale.items
        .filter((i) => next[i.product_id ?? ""])
        .reduce((a, i) => a + i.unit_price * i.quantity, 0);
      if (soma > 0) setPrejuizo(brMoney(soma));
      return next;
    });
  };

  const salvar = () => {
    if (isPending) return;
    const produtos = temPrejuizo
      ? Object.keys(prodSel).filter((k) => prodSel[k])
      : [];
    startTransition(async () => {
      await saveOccurrenceAction(
        sale.id,
        tipo,
        obs.trim(),
        temPrejuizo ? parseBRL(prejuizo) : 0,
        produtos,
        returnPath
      );
    });
  };

  const remover = () => {
    if (isPending) return;
    startTransition(async () => {
      await removeOccurrenceAction(sale.id, returnPath);
    });
  };

  return (
    <>
      <div className="vendor-sheet-overlay" onClick={onClose} />
      <div className="vendor-sheet">
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <span className="vendor-sheet-title">Ocorrência</span>
          <button
            aria-label="Fechar"
            className="vendor-sheet-close"
            onClick={onClose}
            type="button"
          >
            <VendorIcon name="x" size={20} />
          </button>
        </div>

        <div className="vendor-sheet-body">
          <p className="vendor-pagamento-desc">
            Registre uma reclamação, troca ou reembolso desta venda e informe
            se houve prejuízo.
          </p>

          <div className="vendor-section-label">O que aconteceu?</div>
          <div className="vendor-oc-tipo-row">
            {TIPOS.map((k) => {
              const meta = OC_META[k];
              const on = tipo === k;
              return (
                <button
                  className={`vendor-oc-tipo-btn ${on ? "is-active" : ""}`}
                  key={k}
                  onClick={() => setTipo(k)}
                  style={
                    on
                      ? { borderColor: "var(--vendor-green-600)", background: meta.bg, color: meta.fg }
                      : {}
                  }
                  type="button"
                >
                  <VendorIcon
                    name={meta.icon as Parameters<typeof VendorIcon>[0]["name"]}
                    size={20}
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="vendor-section-label">Observação</div>
          <textarea
            className="vendor-oc-textarea"
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: cliente trocou pelo tamanho maior; produto com defeito…"
            value={obs}
          />

          <div className="vendor-oc-prejuizo-toggle">
            <div
              className="vendor-oc-prejuizo-icon"
              style={
                temPrejuizo
                  ? { background: "#fee2e2", color: "#b1182a" }
                  : {}
              }
            >
              <VendorIcon name="arrowDown" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <strong>Teve prejuízo?</strong>
              <span>Valor perdido com troca/reembolso</span>
            </div>
            <button
              aria-label={temPrejuizo ? "Desativar" : "Ativar"}
              className={`vendor-toggle ${temPrejuizo ? "is-on" : ""}`}
              onClick={() => setTemPrejuizo((v) => !v)}
              type="button"
            />
          </div>

          {temPrejuizo && (
            <>
              <div className="vendor-section-label" style={{ marginTop: 14 }}>
                Produtos afetados
              </div>
              {sale.items.map((item: SaleItem) => {
                const pid = item.product_id ?? item.id;
                const on = !!prodSel[pid];
                const sub = item.unit_price * item.quantity;
                return (
                  <div
                    className={`vendor-oc-prod-item ${on ? "is-selected" : ""}`}
                    key={item.id}
                    onClick={() => toggleProd(pid)}
                    role="checkbox"
                    aria-checked={on}
                  >
                    <div
                      className={`vendor-oc-prod-check ${on ? "is-on" : ""}`}
                    >
                      {on && <VendorIcon name="check" size={14} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong className="vendor-oc-prod-name">
                        {item.product_name}
                      </strong>
                      <span className="vendor-oc-prod-sub">
                        {item.quantity} × {formatBRL(item.unit_price)}
                      </span>
                    </div>
                    <span className="vendor-oc-prod-total">{formatBRL(sub)}</span>
                  </div>
                );
              })}

              <p className="vendor-oc-hint">
                Selecione os itens com prejuízo. O valor é preenchido
                automaticamente — ajuste para{" "}
                <b>total ou parcial</b> conforme o caso.
              </p>

              <div className="vendor-section-label">Valor do prejuízo</div>
              <div className="vendor-oc-valor-row">
                <span>R$</span>
                <input
                  className="vendor-oc-valor-input"
                  inputMode="decimal"
                  onChange={(e) =>
                    setPrejuizo(e.target.value.replace(/[^\d.,]/g, ""))
                  }
                  placeholder="0,00"
                  value={prejuizo}
                />
              </div>
            </>
          )}

          <div style={{ height: 16 }} />

          <button
            className="vendor-button vendor-button-primary vendor-button-lg"
            disabled={isPending}
            onClick={salvar}
            style={{ width: "100%" }}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            {isPending ? "Salvando…" : ex ? "Salvar alterações" : "Registrar ocorrência"}
          </button>

          {ex && (
            <button
              className="vendor-oc-remover-btn"
              disabled={isPending}
              onClick={remover}
              type="button"
            >
              Remover ocorrência
            </button>
          )}

          <div style={{ height: 8 }} />
        </div>
      </div>
    </>
  );
}

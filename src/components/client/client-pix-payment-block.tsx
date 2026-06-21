"use client";

import { useMemo, useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { buildPixPayload } from "@/lib/pix/build-pix-code";
import { formatBRL } from "@/lib/products/format";
import type { PublicStore } from "@/lib/client/queries";

export function ClientPixPaymentBlock({
  amount,
  receiptControl,
  store
}: {
  amount: number;
  store: PublicStore;
  receiptControl?: React.ReactNode;
}) {
  const [keyCopied, setKeyCopied] = useState(false);
  const [emvCopied, setEmvCopied] = useState(false);

  const pixKey = store.pix_key?.trim() ?? "";
  const hasPixKey = pixKey.length > 0;

  const emvPayload = useMemo(
    () =>
      hasPixKey
        ? buildPixPayload({
            amount,
            pixKey,
            receiverName: store.pix_receiver_name,
            storeName: store.name
          })
        : "",
    [amount, hasPixKey, pixKey, store.name, store.pix_receiver_name]
  );

  const copyText = (text: string, setCopied: (value: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="client-cart-pix-step">
      <div className="client-pay-pix-amount-card">
        <span>Pague com PIX</span>
        <strong>{formatBRL(amount)}</strong>
        {store.pix_receiver_name ? (
          <small>para {store.pix_receiver_name}</small>
        ) : (
          <small>para {store.name}</small>
        )}
      </div>

      {hasPixKey ? (
        <>
          <p className="client-pix-key-label">Chave PIX da loja</p>
          <button
            className="client-pix-key-display"
            onClick={() => copyText(pixKey, setKeyCopied)}
            type="button"
          >
            <code>{pixKey}</code>
            <span>
              <VendorIcon name={keyCopied ? "check" : "copy"} size={16} />
              {keyCopied ? "Copiado" : "Copiar chave"}
            </span>
          </button>

          {emvPayload ? (
            <button
              className="client-cart-pix-copy"
              onClick={() => copyText(emvPayload, setEmvCopied)}
              type="button"
            >
              <code>{emvPayload}</code>
              <span>
                <VendorIcon name={emvCopied ? "check" : "copy"} size={16} />
                {emvCopied ? "Copiado" : "Copiar código"}
              </span>
            </button>
          ) : null}
        </>
      ) : (
        <p className="client-cart-pix-hint" style={{ textAlign: "left", marginTop: 4 }}>
          A loja ainda não configurou a chave PIX. Entre em contato para pagar.
        </p>
      )}

      {receiptControl}
    </div>
  );
}

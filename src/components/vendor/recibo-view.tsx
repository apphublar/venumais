"use client";

import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { formatPhoneDisplay } from "@/lib/customers/format";
import type { Store } from "@/lib/database/types";
import { formatBRL } from "@/lib/products/format";
import { formatSaleCode, formatShortDate } from "@/lib/sales/format";
import type { SaleWithRelations } from "@/lib/sales/types";

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function buildReceiptText(sale: SaleWithRelations, store: Pick<Store, "name">) {
  const customerName = sale.customer?.full_name ?? "Cliente";
  const lines = [
    `*${store.name}*`,
    `Recibo de venda #${formatSaleCode(sale.sale_code)}`,
    formatLongDate(sale.sold_at),
    "",
    `Cliente: ${customerName}`,
    ""
  ];

  sale.items.forEach((item) => {
    lines.push(`${item.quantity}x ${item.product_name} — ${formatBRL(item.unit_price * item.quantity)}`);
  });

  if (sale.discount_amount > 0) {
    lines.push("", `Desconto: -${formatBRL(sale.discount_amount)}`);
  }

  lines.push("", `*Total: ${formatBRL(sale.total_amount)}*`);
  lines.push(
    "",
    sale.payment_mode === "cash"
      ? "Pagamento: à vista"
      : `Parcelado em ${sale.installments.length}x`
  );

  return lines.join("\n");
}

export function ReciboView({
  backHref,
  sale,
  store
}: {
  backHref: string;
  sale: SaleWithRelations;
  store: Pick<Store, "name" | "slug">;
}) {
  const subtotal = sale.items.reduce((total, item) => total + item.unit_price * item.quantity, 0);
  const receiptText = buildReceiptText(sale, store);
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;

  const printReceipt = () => {
    window.print();
  };

  return (
    <>
      <VendorScreenHeader
        action={
          <button
            aria-label="Imprimir recibo"
            className="vendor-icon-button"
            onClick={printReceipt}
            type="button"
          >
            <VendorIcon name="print" size={19} />
          </button>
        }
        backHref={backHref}
        title={`Recibo #${formatSaleCode(sale.sale_code)}`}
      />

      <section className="vendor-screen-body vendor-recibo-screen">
        <div className="vendor-recibo-paper">
          <div className="vendor-recibo-brand">
            <VendorBrandMark label={store.name} radius={13} size={48} />
            <div>
              <strong>{store.name}</strong>
              <span>{store.slug}.vendas.app</span>
            </div>
            <div className="vendor-recibo-brand-meta">
              <small>RECIBO</small>
              <strong>#{formatSaleCode(sale.sale_code)}</strong>
            </div>
          </div>

          <div className="vendor-recibo-body">
            <div className="vendor-recibo-meta">
              <div>
                <small>Cliente</small>
                <strong>{sale.customer?.full_name ?? "Cliente"}</strong>
                {sale.customer?.phone ? <span>{formatPhoneDisplay(sale.customer.phone)}</span> : null}
              </div>
              <div>
                <small>Data</small>
                <strong>{formatShortDate(sale.sold_at.slice(0, 10))}</strong>
                <span>
                  {sale.payment_mode === "cash" ? "À vista" : `${sale.installments.length}x`}
                </span>
              </div>
            </div>

            <div className="vendor-recibo-items">
              {sale.items.map((item) => (
                <div className="vendor-recibo-item" key={item.id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>
                      {item.quantity} × {formatBRL(item.unit_price)}
                    </span>
                  </div>
                  <strong>{formatBRL(item.unit_price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            {sale.discount_amount > 0 ? (
              <>
                <div className="vendor-recibo-total-line">
                  <span>Subtotal</span>
                  <strong>{formatBRL(subtotal)}</strong>
                </div>
                <div className="vendor-recibo-total-line">
                  <span>Desconto</span>
                  <strong className="vendor-text-danger">− {formatBRL(sale.discount_amount)}</strong>
                </div>
              </>
            ) : null}

            <div className="vendor-recibo-grand-total">
              <span>TOTAL</span>
              <strong>{formatBRL(sale.total_amount)}</strong>
            </div>

            {sale.delivery_type ? (
              <div className="vendor-recibo-delivery">
                <VendorIcon name={sale.delivery_type === "delivery" ? "truck" : "store"} size={16} />
                <span>
                  {sale.delivery_type === "delivery"
                    ? "Entrega no endereço do cliente"
                    : "Retirada no local"}
                </span>
              </div>
            ) : null}

            <p className="vendor-recibo-thanks">
              Obrigado pela preferência! 💚
              <br />
              Emitido por {store.name} via app
            </p>
          </div>
        </div>

        <div className="vendor-recibo-actions">
          <a
            className="vendor-cobranca-whats-btn"
            href={shareUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <VendorWhatsLogo size={17} />
            Compartilhar
          </a>
          <button className="vendor-button vendor-button-ghost" onClick={printReceipt} type="button">
            <VendorIcon name="print" size={18} />
            Imprimir
          </button>
        </div>

        <p className="vendor-recibo-footnote">
          Este recibo também fica disponível para {sale.customer?.full_name.split(" ")[0] ?? "o cliente"} no
          app dela, dentro do pedido.
        </p>

        <div className="vendor-dashboard-spacer" />
      </section>
    </>
  );
}

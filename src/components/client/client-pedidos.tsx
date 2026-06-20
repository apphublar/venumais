"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import {
  cancelClientOrderAction,
  getCustomerOrderDetailAction,
  updateClientOrderAction
} from "@/lib/client/actions";
import { formatBRL } from "@/lib/products/format";
import { formatSaleCode } from "@/lib/sales/format";
import type {
  PortalOrder,
  PortalOrderDetail,
  PortalSaleSummary,
  PublicProduct,
  PublicStore
} from "@/lib/client/queries";

type OrderFilter = "todos" | "orcamento" | "aberto" | "quitado";

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function ClientPedidos({
  onConfirmSale,
  onOpenSale,
  onToast,
  orders,
  products,
  sales
  ,
  store
}: {
  onConfirmSale: (saleId: string) => void;
  onOpenSale: (saleId: string) => void;
  onToast: (message: string) => void;
  orders: PortalOrder[];
  products: PublicProduct[];
  sales: PortalSaleSummary[];
  store: PublicStore;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<OrderFilter>("todos");
  const [editingOrder, setEditingOrder] = useState<PortalOrderDetail | null>(null);
  const [isLoadingOrder, startLoadingOrder] = useTransition();
  const [isPendingAction, startPendingAction] = useTransition();

  const pendingConfirmation = useMemo(
    () =>
      sales.filter(
        (sale) => sale.payment_mode === "installment" && sale.confirmation_status === "pending"
      ),
    [sales]
  );

  const openSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          !(
            sale.payment_mode === "installment" && sale.confirmation_status === "pending"
          ) && sale.open_amount > 0.001
      ),
    [sales]
  );

  const paidSales = useMemo(
    () => sales.filter((sale) => sale.open_amount <= 0.001),
    [sales]
  );

  const counts = {
    todos: orders.length + sales.length,
    orcamento: orders.length,
    aberto: openSales.length + pendingConfirmation.length,
    quitado: paidSales.length
  };

  const tabs: Array<[OrderFilter, string]> = [
    ["todos", "Todos"],
    ["orcamento", "Orçamentos"],
    ["aberto", "Em aberto"],
    ["quitado", "Quitados"]
  ];

  const show = (key: OrderFilter) => filter === "todos" || filter === key;

  const empty = (message: string) => (
    <div className="client-empty-inline">{message}</div>
  );

  const handleOpenQuoteEditor = (orderId: string) => {
    startLoadingOrder(async () => {
      const result = await getCustomerOrderDetailAction(store.id, orderId);
      if (result.error || !result.order) {
        onToast(result.error ?? "Não foi possível abrir o orçamento.");
        return;
      }
      setEditingOrder(result.order);
    });
  };

  const handleCancelQuote = (orderId: string) => {
    if (!window.confirm("Cancelar este orçamento? Essa ação não pode ser desfeita.")) {
      return;
    }

    startPendingAction(async () => {
      const result = await cancelClientOrderAction({
        storeId: store.id,
        storeSlug: store.slug,
        orderId
      });
      if (result.error) {
        onToast(result.error);
        return;
      }
      onToast("Orçamento cancelado.");
      setEditingOrder(null);
      router.refresh();
    });
  };

  const handleSaveQuote = (input: {
    orderId: string;
    deliveryType: "pickup" | "delivery";
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
  }) => {
    startPendingAction(async () => {
      const result = await updateClientOrderAction({
        storeId: store.id,
        storeSlug: store.slug,
        orderId: input.orderId,
        deliveryType: input.deliveryType,
        notes: input.notes,
        items: input.items
      });
      if (result.error) {
        onToast(result.error);
        return;
      }
      onToast("Orçamento atualizado.");
      setEditingOrder(null);
      router.refresh();
    });
  };

  return (
    <div className="client-main">
      <ClientScreenHeader big subtitle="Compras e orçamentos" title="Meus pedidos" />
      <div className="client-screen-body">
        <div className="client-filter-chips">
          {tabs.map(([key, label]) => (
            <button
              className={filter === key ? "client-filter-chip-active" : "client-filter-chip"}
              key={key}
              onClick={() => setFilter(key)}
              type="button"
            >
              {label} <em>{counts[key]}</em>
            </button>
          ))}
        </div>

        {(filter === "todos" || filter === "aberto") && pendingConfirmation.length > 0 ? (
          <>
            <VendorSectionLabel>Aguardando sua confirmação</VendorSectionLabel>
            {pendingConfirmation.map((sale) => (
              <VendorCard
                className="client-confirm-banner"
                key={sale.id}
                onClick={() => onConfirmSale(sale.id)}
              >
                <span className="client-confirm-banner-icon">
                  <VendorIcon name="receipt" size={21} />
                </span>
                <div>
                  <strong>Confirme sua compra</strong>
                  <span>
                    Pedido #{formatSaleCode(sale.sale_code)} · {formatBRL(sale.total_amount)}
                  </span>
                </div>
                <VendorIcon name="chevR" size={20} />
              </VendorCard>
            ))}
          </>
        ) : null}

        {show("orcamento") ? (
          <>
            <VendorSectionLabel>Aguardando orçamento do vendedor</VendorSectionLabel>
            {orders.length ? (
              orders.map((order) => (
                <VendorCard className="client-quote-card" key={order.id}>
                  <div className="client-sale-card-head">
                    <div>
                      <strong>Orçamento #{order.order_code}</strong>
                      <span>
                        {formatLongDate(order.created_at)} · {order.item_count}{" "}
                        {order.item_count === 1 ? "item" : "itens"}
                        {order.edited_at ? " · editado" : ""}
                      </span>
                    </div>
                    <span className="client-badge client-badge-warn">Aguardando</span>
                  </div>
                  <div className="client-quote-note">
                    <VendorIcon name="clock" size={15} />
                    <span>Aguardando valores da loja</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10
                    }}
                  >
                    <button
                      className="vendor-button vendor-button-ghost"
                      onClick={() => handleOpenQuoteEditor(order.id)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      <VendorIcon name="edit" size={15} />
                      Editar
                    </button>
                    <button
                      className="vendor-button vendor-button-danger"
                      onClick={() => handleCancelQuote(order.id)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      <VendorIcon name="x" size={15} />
                      Excluir
                    </button>
                  </div>
                </VendorCard>
              ))
            ) : filter === "orcamento" ? (
              empty("Nenhum orçamento pendente.")
            ) : null}
          </>
        ) : null}

        {show("aberto") ? (
          <>
            <VendorSectionLabel>Em aberto</VendorSectionLabel>
            {openSales.length ? (
              openSales.map((sale) => (
                <SaleCard key={sale.id} onOpen={() => onOpenSale(sale.id)} sale={sale} />
              ))
            ) : filter === "aberto" && !pendingConfirmation.length ? (
              empty("Nenhuma compra em aberto.")
            ) : null}
          </>
        ) : null}

        {show("quitado") ? (
          <>
            <VendorSectionLabel>Quitados</VendorSectionLabel>
            {paidSales.length ? (
              paidSales.map((sale) => (
                <SaleCard key={sale.id} onOpen={() => onOpenSale(sale.id)} sale={sale} />
              ))
            ) : (
              empty("Nenhuma compra quitada ainda.")
            )}
          </>
        ) : null}
      </div>
      {isLoadingOrder ? (
        <div className="client-toast">Carregando orçamento…</div>
      ) : null}
      {editingOrder ? (
        <QuoteEditOverlay
          isPending={isPendingAction}
          onCancelOrder={() => handleCancelQuote(editingOrder.id)}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveQuote}
          order={editingOrder}
          products={products}
        />
      ) : null}
    </div>
  );
}

function QuoteEditOverlay({
  isPending,
  onCancelOrder,
  onClose,
  onSave,
  order,
  products
}: {
  isPending: boolean;
  onCancelOrder: () => void;
  onClose: () => void;
  onSave: (input: {
    orderId: string;
    deliveryType: "pickup" | "delivery";
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
  }) => void;
  order: PortalOrderDetail;
  products: PublicProduct[];
}) {
  const initialCart = useMemo(() => {
    const map: Record<string, number> = {};
    order.items.forEach((item) => {
      if (item.product_id) {
        map[item.product_id] = item.quantity;
      }
    });
    return map;
  }, [order.items]);

  const [cart, setCart] = useState<Record<string, number>>(initialCart);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(order.delivery_type);
  const [notes, setNotes] = useState(order.notes ?? "");

  const cartEntries = Object.entries(cart).filter(([, quantity]) => quantity > 0);

  const updateQty = (productId: string, delta: number) => {
    setCart((current) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return current;
      const nextQty = Math.max(0, Math.min(product.stock_qty, (current[productId] ?? 0) + delta));
      if (nextQty === 0) {
        const copy = { ...current };
        delete copy[productId];
        return copy;
      }
      return { ...current, [productId]: nextQty };
    });
  };

  return (
    <ClientOverlay>
      <ClientScreenHeader
        onBack={onClose}
        subtitle={`Orçamento #${String(order.order_code).padStart(4, "0")}`}
        title="Editar orçamento"
      />
      <div className="client-screen-body">
        <VendorSectionLabel>Entrega</VendorSectionLabel>
        <div className="client-cart-delivery">
          <button
            className={deliveryType === "pickup" ? "is-active" : ""}
            onClick={() => setDeliveryType("pickup")}
            type="button"
          >
            <VendorIcon name="store" size={16} />
            Retirada
          </button>
          <button
            className={deliveryType === "delivery" ? "is-active" : ""}
            onClick={() => setDeliveryType("delivery")}
            type="button"
          >
            <VendorIcon name="truck" size={16} />
            Entrega
          </button>
        </div>

        <VendorSectionLabel>Itens</VendorSectionLabel>
        {cartEntries.map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          if (!product) return null;
          return (
            <VendorCard className="client-sale-card" key={productId}>
              <div className="client-sale-card-head">
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.price_visible ? formatBRL(product.promo_price ?? product.price) : "Sob orçamento"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="vendor-step-button" onClick={() => updateQty(productId, -1)} type="button">
                    <VendorIcon name="arrowDown" size={14} />
                  </button>
                  <strong>{quantity}</strong>
                  <button className="vendor-step-button vendor-step-button-primary" onClick={() => updateQty(productId, 1)} type="button">
                    <VendorIcon name="arrowUp" size={14} />
                  </button>
                </div>
              </div>
            </VendorCard>
          );
        })}

        <VendorSectionLabel>Adicionar item</VendorSectionLabel>
        <div style={{ display: "grid", gap: 8 }}>
          {products
            .filter((product) => product.stock_qty > 0 && !cart[product.id])
            .slice(0, 8)
            .map((product) => (
              <button
                key={product.id}
                onClick={() => updateQty(product.id, 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--client-line)",
                  borderRadius: 12,
                  background: "var(--client-card)",
                  cursor: "pointer"
                }}
                type="button"
              >
                <span>{product.name}</span>
                <VendorIcon name="plus" size={16} />
              </button>
            ))}
        </div>

        <VendorSectionLabel>Observações</VendorSectionLabel>
        <textarea
          className="client-cart-notes"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: trocar cor, ponto de referência..."
          rows={3}
          value={notes}
        />
      </div>
      <div className="client-overlay-footer" style={{ display: "grid", gap: 8 }}>
        <button
          className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
          disabled={isPending || cartEntries.length === 0}
          onClick={() =>
            onSave({
              orderId: order.id,
              deliveryType,
              notes,
              items: cartEntries.map(([productId, quantity]) => ({ productId, quantity }))
            })
          }
          type="button"
        >
          <VendorIcon name="check" size={16} />
          Salvar alterações
        </button>
        <button
          className="vendor-button vendor-button-danger vendor-button-lg vendor-button-full"
          disabled={isPending}
          onClick={onCancelOrder}
          type="button"
        >
          <VendorIcon name="x" size={16} />
          Excluir orçamento
        </button>
      </div>
    </ClientOverlay>
  );
}

function SaleCard({
  onOpen,
  sale
}: {
  onOpen: () => void;
  sale: PortalSaleSummary;
}) {
  const awaiting =
    sale.payment_mode === "installment" && sale.confirmation_status === "pending";

  return (
    <VendorCard className="client-sale-card" onClick={onOpen}>
      <div className="client-sale-card-head">
        <div>
          <strong>Pedido #{formatSaleCode(sale.sale_code)}</strong>
          <span>
            {formatLongDate(sale.sold_at)} · {sale.item_count}{" "}
            {sale.item_count === 1 ? "item" : "itens"}
          </span>
        </div>
        {awaiting ? (
          <span className="client-badge client-badge-warn">Confirmar</span>
        ) : sale.open_amount > 0.001 ? (
          <span className="client-badge client-badge-open">Em aberto</span>
        ) : (
          <span className="client-badge client-badge-paid">Quitado</span>
        )}
      </div>
      <div className="client-sale-card-foot">
        <div>
          <span>Total</span>
          <strong>{formatBRL(sale.total_amount)}</strong>
        </div>
        <div>
          <span>{sale.open_amount > 0.001 ? "Restante" : "Status"}</span>
          {sale.open_amount > 0.001 ? (
            <strong>{formatBRL(sale.open_amount)}</strong>
          ) : (
            <strong className="client-text-success">Quitado ✓</strong>
          )}
        </div>
      </div>
    </VendorCard>
  );
}

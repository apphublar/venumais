"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { ClientCatalogOrderDetail } from "@/components/client/client-catalog-order-detail";
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
import { getOrderStatusMeta, isQuoteAnswered, orderNeedsClientAction } from "@/lib/client/order-status";
import type {
  PortalOrder,
  PortalOrderDetail,
  PortalSaleSummary,
  PublicProduct,
  PublicStore
} from "@/lib/client/queries";

type OrderFilter = "todos" | "orcamento" | "aberto" | "quitado";

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function ClientPedidos({
  onConfirmSale,
  onOpenSale,
  onToast,
  orders,
  products,
  sales,
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
  const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PortalOrderDetail | null>(null);
  const [isLoadingOrder, startLoadingOrder] = useTransition();
  const [isPendingAction, startPendingAction] = useTransition();

  const pendingConfirmation = useMemo(
    () => sales.filter((s) => s.payment_mode === "installment" && s.confirmation_status === "pending"),
    [sales]
  );
  const openSales = useMemo(
    () =>
      sales.filter(
        (s) => !(s.payment_mode === "installment" && s.confirmation_status === "pending") && s.open_amount > 0.001
      ),
    [sales]
  );
  const paidSales = useMemo(() => sales.filter((s) => s.open_amount <= 0.001), [sales]);

  // ── Categorias de pedidos (protótipo) ───────────────────────────────────────
  const quoteOrders = orders.filter((o) => o.status === "quote");
  const pedidosCat = orders.filter((o) =>
    [
      "new",
      "quote_answered",
      "quoted",
      "awaiting_payment",
      "awaiting_card",
      "cash_on_delivery",
      "payment_review"
    ].includes(o.status)
  );
  const pedidosPagos = orders.filter((o) =>
    ["paid", "delivering", "delivered"].includes(o.status)
  );

  const counts = {
    todos: orders.length + sales.length,
    orcamento: quoteOrders.length,
    aberto: pedidosCat.length + openSales.length + pendingConfirmation.length,
    quitado: pedidosPagos.length + paidSales.length
  };

  const tabs: Array<[OrderFilter, string]> = [
    ["todos", "Todos"],
    ["orcamento", "Orçamentos"],
    ["aberto", "Em aberto"],
    ["quitado", "Pagos"]
  ];

  const show = (key: OrderFilter) => filter === "todos" || filter === key;
  const empty = (msg: string) => <div className="client-empty-inline">{msg}</div>;

  const handleOpenDetail = (order: PortalOrder) => setSelectedOrder(order);

  const handleOpenEditor = (orderId: string) => {
    startLoadingOrder(async () => {
      const result = await getCustomerOrderDetailAction(store.id, orderId);
      if (result.error || !result.order) {
        onToast(result.error ?? "Não foi possível abrir o pedido.");
        return;
      }
      setEditingOrder(result.order);
    });
  };

  const handleCancelOrder = (orderId: string) => {
    if (!window.confirm("Cancelar este pedido? Essa ação não pode ser desfeita.")) return;
    startPendingAction(async () => {
      const result = await cancelClientOrderAction({ storeId: store.id, storeSlug: store.slug, orderId });
      if (result.error) { onToast(result.error); return; }
      onToast("Pedido cancelado.");
      setEditingOrder(null);
      router.refresh();
    });
  };

  const handleSaveOrder = (input: {
    orderId: string;
    deliveryType: "pickup" | "delivery";
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
  }) => {
    startPendingAction(async () => {
      const result = await updateClientOrderAction({
        storeId: store.id,
        storeSlug: store.slug,
        ...input
      });
      if (result.error) { onToast(result.error); return; }
      onToast("Pedido atualizado.");
      setEditingOrder(null);
      router.refresh();
    });
  };

  // ── OrcamentoCard (âmbar) — aguardando loja precificar ───────────────────────
  const renderOrcamentoCard = (order: PortalOrder) => (
    <div
      className="client-orcamento-card"
      key={order.id}
      onClick={() => handleOpenDetail(order)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleOpenDetail(order)}
    >
      <div className="client-orcamento-card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="order-code">Orçamento #{String(order.order_code).padStart(4, "0")}</div>
          <div className="order-date">
            {formatShortDate(order.created_at)} · {order.item_count}{" "}
            {order.item_count === 1 ? "item" : "itens"}
            {order.edited_at ? " · editado" : ""}
          </div>
        </div>
        <span className="client-orcamento-badge">Aguardando</span>
      </div>

      <div className="client-orcamento-status-row">
        <VendorIcon name="clock" size={15} />
        <span>Aguardando valores da loja</span>
      </div>

      <div className="client-orcamento-card-foot" onClick={(e) => e.stopPropagation()}>
        <button
          className="vendor-button vendor-button-ghost"
          disabled={isLoadingOrder || isPendingAction}
          onClick={() => handleOpenEditor(order.id)}
          style={{ fontSize: "0.78rem", padding: "6px 12px", flex: 1 }}
          type="button"
        >
          <VendorIcon name="edit" size={14} />
          Editar
        </button>
        <button
          className="vendor-button vendor-button-danger"
          disabled={isPendingAction}
          onClick={() => handleCancelOrder(order.id)}
          style={{ fontSize: "0.78rem", padding: "6px 12px", flex: 1 }}
          type="button"
        >
          <VendorIcon name="x" size={14} />
          Excluir
        </button>
      </div>
    </div>
  );

  // ── PedidoCatCard — pedido finalizado com pagamento ──────────────────────────
  const renderCatOrderCard = (order: PortalOrder) => {
    const needsAction = orderNeedsClientAction(order.status, order.payment_informed);
    const payMethod = order.customer_payment_method;
    const m = getOrderStatusMeta(order.status);

    return (
      <div
        className={`client-cat-order-card${needsAction ? " needs-action" : ""}`}
        key={order.id}
        onClick={() => handleOpenDetail(order)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpenDetail(order)}
      >
        <div className="client-cat-order-card-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="order-code">Pedido #{String(order.order_code).padStart(4, "0")}</div>
            <div className="order-date">
              {formatShortDate(order.created_at)} · {order.item_count}{" "}
              {order.item_count === 1 ? "item" : "itens"}
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: m.bg,
              color: m.fg,
              borderRadius: 999,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot }} />
            {m.label}
          </span>
        </div>

        {needsAction && isQuoteAnswered(order.status) ? (
          <div className="client-cat-order-action-hint">
            <VendorIcon name="chevR" size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Toque para fechar ou recusar
          </div>
        ) : needsAction && order.status === "awaiting_card" && !order.payment_informed ? (
          <div className="client-cat-order-action-hint">
            <VendorIcon name="chevR" size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Toque para pagar
          </div>
        ) : needsAction && order.status === "awaiting_payment" && payMethod === "pix" ? (
          <div className="client-cat-order-action-hint">
            <VendorIcon name="chevR" size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Toque para pagar
          </div>
        ) : null}

        <div className="client-cat-order-card-foot">
          <div className="client-cat-order-card-meta">
            {payMethod ? (
              <>
                <VendorIcon
                  name={payMethod === "pix" ? "pix" : payMethod === "card" ? "cards" : "wallet"}
                  size={14}
                />
                {payMethod === "pix" ? "PIX" : payMethod === "card" ? "Cartão" : "Dinheiro"}
              </>
            ) : null}
            {payMethod ? <span>·</span> : null}
            <VendorIcon name={order.delivery_type === "delivery" ? "truck" : "store"} size={14} />
            {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
          </div>
          {order.total_amount != null ? (
            <strong style={{ fontSize: "0.9rem", color: "var(--client-ink-1)" }}>
              {formatBRL(order.total_amount)}
            </strong>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="client-main">
      <ClientScreenHeader big subtitle="Compras e orçamentos" title="Meus pedidos" />
      <div className="client-screen-body">
        {/* ── Filtros ── */}
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

        {/* ── Aguardando confirmação (vendas parceladas) ── */}
        {show("aberto") && pendingConfirmation.length > 0 ? (
          <>
            <VendorSectionLabel>Aguardando sua confirmação</VendorSectionLabel>
            {pendingConfirmation.map((sale) => (
              <VendorCard className="client-confirm-banner" key={sale.id} onClick={() => onConfirmSale(sale.id)}>
                <span className="client-confirm-banner-icon"><VendorIcon name="receipt" size={21} /></span>
                <div>
                  <strong>Confirme sua compra</strong>
                  <span>Pedido #{formatSaleCode(sale.sale_code)} · {formatBRL(sale.total_amount)}</span>
                </div>
                <VendorIcon name="chevR" size={20} />
              </VendorCard>
            ))}
          </>
        ) : null}

        {/* ── Orçamentos respondidos (destaque verde) ── */}
        {show("orcamento") ? (
          <>
            <VendorSectionLabel>Aguardando orçamento do vendedor</VendorSectionLabel>
            {quoteOrders.length ? (
              quoteOrders.map(renderOrcamentoCard)
            ) : filter === "orcamento" ? (
              empty("Nenhum orçamento pendente.")
            ) : null}
          </>
        ) : null}

        {show("aberto") && pedidosCat.length > 0 ? (
          <>
            <VendorSectionLabel>Pedidos do catálogo</VendorSectionLabel>
            {pedidosCat.map(renderCatOrderCard)}
          </>
        ) : null}

        {show("aberto") ? (
          <>
            <VendorSectionLabel>Compras em aberto</VendorSectionLabel>
            {openSales.length ? (
              openSales.map((sale) => (
                <SaleCard key={sale.id} onOpen={() => onOpenSale(sale.id)} sale={sale} />
              ))
            ) : filter === "aberto" && !pendingConfirmation.length && !pedidosCat.length ? (
              empty("Nenhuma compra em aberto.")
            ) : null}
          </>
        ) : null}

        {show("quitado") ? (
          <>
            <VendorSectionLabel>Pagos</VendorSectionLabel>
            {pedidosPagos.map(renderCatOrderCard)}
            {paidSales.length ? (
              paidSales.map((sale) => (
                <SaleCard key={sale.id} onOpen={() => onOpenSale(sale.id)} sale={sale} />
              ))
            ) : !pedidosPagos.length ? (
              empty("Nenhuma compra paga ainda.")
            ) : null}
          </>
        ) : null}
      </div>

      {isLoadingOrder ? <div className="client-toast">Carregando…</div> : null}

      {/* ── Overlay de detalhe do pedido do catálogo ── */}
      {selectedOrder ? (
        <ClientCatalogOrderDetail
          key={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onEdit={() => {
            const orderId = selectedOrder.id;
            setSelectedOrder(null);
            handleOpenEditor(orderId);
          }}
          onRefresh={() => router.refresh()}
          order={selectedOrder}
          products={products}
          store={store}
          storeId={store.id}
          storeSlug={store.slug}
        />
      ) : null}

      {/* ── Overlay de edição de orçamento ── */}
      {editingOrder ? (
        <QuoteEditOverlay
          isPending={isPendingAction}
          onCancelOrder={() => handleCancelOrder(editingOrder.id)}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveOrder}
          order={editingOrder}
          products={products}
        />
      ) : null}
    </div>
  );
}

// ── QuoteEditOverlay — editar itens/entrega de um pedido editável ────────────
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
      if (item.product_id) map[item.product_id] = item.quantity;
    });
    return map;
  }, [order.items]);

  const [cart, setCart] = useState<Record<string, number>>(initialCart);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(order.delivery_type);
  const [notes, setNotes] = useState(order.notes ?? "");

  const cartEntries = Object.entries(cart).filter(([, q]) => q > 0);

  const updateQty = (productId: string, delta: number) => {
    setCart((current) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return current;
      const limit = product.sell_without_stock ? 999 : product.stock_qty;
      const nextQty = Math.max(0, Math.min(limit, (current[productId] ?? 0) + delta));
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
        subtitle={`Pedido #${String(order.order_code).padStart(4, "0")}`}
        title="Editar pedido"
      />
      <div className="client-screen-body">
        <VendorSectionLabel>Entrega</VendorSectionLabel>
        <div className="client-cart-delivery">
          {(
            [
              ["pickup", "Retirada", "store"],
              ["delivery", "Entrega", "truck"]
            ] as const
          ).map(([key, label, icon]) => (
            <button
              className={deliveryType === key ? "is-active" : ""}
              key={key}
              onClick={() => setDeliveryType(key)}
              type="button"
            >
              <VendorIcon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>

        <VendorSectionLabel>Itens</VendorSectionLabel>
        {cartEntries.map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId);
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
            .filter((p) => (p.sell_without_stock || p.stock_qty > 0) && !cart[p.id])
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
          onChange={(e) => setNotes(e.target.value)}
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
          Excluir pedido
        </button>
      </div>
    </ClientOverlay>
  );
}

// ── SaleCard ─────────────────────────────────────────────────────────────────
function SaleCard({ onOpen, sale }: { onOpen: () => void; sale: PortalSaleSummary }) {
  const awaiting = sale.payment_mode === "installment" && sale.confirmation_status === "pending";

  const formatLongDate = (value: string) =>
    new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <VendorCard className="client-sale-card" onClick={onOpen}>
      <div className="client-sale-card-head">
        <div>
          <strong>Pedido #{formatSaleCode(sale.sale_code)}</strong>
          <span>
            {formatLongDate(sale.sold_at)} · {sale.item_count} {sale.item_count === 1 ? "item" : "itens"}
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

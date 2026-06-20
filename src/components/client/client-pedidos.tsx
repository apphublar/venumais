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
  finalizeClientOrderWithPaymentAction,
  getCustomerOrderDetailAction,
  notifyOrderPaymentAction,
  reportOrderPaymentAction,
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

type OrderPaymentMethod = "pix" | "cash" | "card";

function orderStatusMeta(status: string) {
  switch (status) {
    case "quote":
    case "quoted":
      return { label: "Orçamento enviado", tone: "open" as const };
    case "awaiting_payment":
      return { label: "Aguardando pagamento", tone: "warn" as const };
    case "payment_review":
      return { label: "Comprovante enviado", tone: "open" as const };
    case "paid":
      return { label: "Pago", tone: "paid" as const };
    case "delivering":
      return { label: "Em entrega", tone: "open" as const };
    case "delivered":
      return { label: "Entregue", tone: "paid" as const };
    default:
      return { label: "Novo pedido", tone: "warn" as const };
  }
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
  const [checkoutOrder, setCheckoutOrder] = useState<PortalOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("pix");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [checkoutProofFile, setCheckoutProofFile] = useState<File | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
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

  const orderOpenStatuses = ["new", "quote", "quoted", "awaiting_payment", "payment_review", "delivering"] as const;

  const counts = {
    todos: orders.length + sales.length,
    orcamento: orders.filter((order) => order.status === "new" || order.status === "quote" || order.status === "quoted").length,
    aberto: openSales.length + pendingConfirmation.length + orders.filter((order) => orderOpenStatuses.includes(order.status as (typeof orderOpenStatuses)[number])).length,
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

  const hasPix = Boolean(store.pix_key?.trim());
  const pixName = store.pix_receiver_name ?? store.name;
  const pixCode = hasPix
    ? `00020126580014BR.GOV.BCB.PIX0136${store.pix_key!.trim()}5204000053039865802BR5921${pixName}6304A1B2`
    : "";

  const copyPix = async () => {
    if (!hasPix) {
      onToast("A loja ainda não configurou chave PIX.");
      return;
    }
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiedPix(true);
      onToast("Código PIX copiado!");
      window.setTimeout(() => setCopiedPix(false), 1800);
    } catch {
      onToast("Não foi possível copiar o PIX.");
    }
  };

  const handleFinalizeOrder = () => {
    if (!checkoutOrder) return;
    startPendingAction(async () => {
      const formData = new FormData();
      formData.set("storeId", store.id);
      formData.set("storeSlug", store.slug);
      formData.set("orderId", checkoutOrder.id);
      formData.set("paymentMethod", paymentMethod);
      formData.set("paymentNote", paymentNote);
      if (paymentMethod === "pix" && checkoutProofFile) {
        formData.set("receipt", checkoutProofFile);
      }
      const result = await finalizeClientOrderWithPaymentAction(formData);
      if (result.error) {
        onToast(result.error);
        return;
      }
      onToast("Pedido enviado para confirmação da loja.");
      setCheckoutOrder(null);
      setPaymentNote("");
      setPaymentMethod("pix");
      setCheckoutProofFile(null);
      setCopiedPix(false);
      router.refresh();
    });
  };

  const handleReportOrderPayment = (order: PortalOrder) => {
    if (!paymentProofFile) {
      onToast("Anexe o comprovante para enviar.");
      return;
    }
    startPendingAction(async () => {
      const formData = new FormData();
      formData.set("storeId", store.id);
      formData.set("storeSlug", store.slug);
      formData.set("orderId", order.id);
      formData.set("receipt", paymentProofFile);
      const result = await reportOrderPaymentAction(formData);
      if (result.error) {
        onToast(result.error);
        return;
      }
      setPaymentProofFile(null);
      onToast("Comprovante enviado para análise da loja.");
      router.refresh();
    });
  };

  const handleNotifyOrderPayment = (orderId: string) => {
    startPendingAction(async () => {
      const result = await notifyOrderPaymentAction({
        storeId: store.id,
        storeSlug: store.slug,
        orderId
      });
      if (result.error) {
        onToast(result.error);
        return;
      }
      onToast("Pagamento informado para a loja.");
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
                      <strong>Pedido #{order.order_code}</strong>
                      <span>
                        {formatLongDate(order.created_at)} · {order.item_count}{" "}
                        {order.item_count === 1 ? "item" : "itens"}
                        {order.edited_at ? " · editado" : ""}
                      </span>
                    </div>
                    {(() => {
                      const meta = orderStatusMeta(order.status);
                      return (
                        <span className={`client-badge client-badge-${meta.tone}`}>{meta.label}</span>
                      );
                    })()}
                  </div>
                  {order.total_amount !== null ? (
                    <div className="client-sale-card-foot">
                      <div>
                        <span>Total</span>
                        <strong>{formatBRL(order.total_amount)}</strong>
                      </div>
                      <div>
                        <span>Tipo</span>
                        <strong>{order.delivery_type === "delivery" ? "Entrega" : "Retirada"}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="client-quote-note">
                      <VendorIcon name="clock" size={15} />
                      <span>Aguardando valores da loja</span>
                    </div>
                  )}
                  {order.status === "awaiting_payment" && order.customer_payment_method === "card" ? (
                    <div className="client-quote-note">
                      <VendorIcon name="wallet" size={15} />
                      <span>
                        {order.vendor_payment_link ? (
                          <a href={order.vendor_payment_link} rel="noopener noreferrer" target="_blank">
                            Abrir link de pagamento
                          </a>
                        ) : (
                          "Aguardando a loja enviar o link de pagamento"
                        )}
                      </span>
                    </div>
                  ) : null}
                  {order.status === "delivering" && order.tracking_url ? (
                    <div className="client-quote-note">
                      <VendorIcon name="truck" size={15} />
                      <span>
                        <a href={order.tracking_url} rel="noopener noreferrer" target="_blank">
                          Rastrear entrega ({order.tracking_code || "link"})
                        </a>
                      </span>
                    </div>
                  ) : null}
                  <div className="client-order-actions">
                    <button
                      className="vendor-button vendor-button-ghost client-order-action-button"
                      disabled={isPendingAction || !(order.status === "new" || order.status === "quote" || order.status === "quoted")}
                      onClick={() => handleOpenQuoteEditor(order.id)}
                      type="button"
                    >
                      <VendorIcon name="edit" size={15} />
                      Editar
                    </button>
                    {order.total_amount !== null && (order.status === "new" || order.status === "quote" || order.status === "quoted") ? (
                      <button
                        className="vendor-button vendor-button-primary client-order-action-button"
                        onClick={() => setCheckoutOrder(order)}
                        type="button"
                      >
                        <VendorIcon name="check" size={15} />
                        Finalizar pedido
                      </button>
                    ) : null}
                    {order.status === "awaiting_payment" && order.customer_payment_method === "pix" ? (
                      <>
                        <label className="client-order-proof-upload">
                          <input
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(event) => setPaymentProofFile(event.target.files?.[0] ?? null)}
                            type="file"
                          />
                          <VendorIcon name="share" size={14} />
                          {paymentProofFile ? paymentProofFile.name : "Anexar comprovante"}
                        </label>
                        <button
                          className="vendor-button vendor-button-primary client-order-action-button"
                          disabled={isPendingAction}
                          onClick={() => handleReportOrderPayment(order)}
                          type="button"
                        >
                          <VendorIcon name="check" size={15} />
                          Enviar comprovante
                        </button>
                      </>
                    ) : null}
                    {order.status === "awaiting_payment" &&
                    order.customer_payment_method !== "pix" ? (
                      <button
                        className="vendor-button vendor-button-primary client-order-action-button"
                        disabled={isPendingAction}
                        onClick={() => handleNotifyOrderPayment(order.id)}
                        type="button"
                      >
                        <VendorIcon name="check" size={15} />
                        Avisar pagamento
                      </button>
                    ) : null}
                    <button
                      className="vendor-button vendor-button-danger client-order-action-button"
                      disabled={isPendingAction || !(order.status === "new" || order.status === "quote" || order.status === "quoted")}
                      onClick={() => handleCancelQuote(order.id)}
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
      {checkoutOrder ? (
        <ClientOverlay>
          <ClientScreenHeader
            onBack={() => setCheckoutOrder(null)}
            subtitle={`Pedido #${String(checkoutOrder.order_code).padStart(4, "0")}`}
            title="Finalizar pedido"
          />
          <div className="client-screen-body">
            <VendorSectionLabel>Forma de pagamento</VendorSectionLabel>
            <div className="client-cart-delivery">
              <button className={paymentMethod === "pix" ? "is-active" : ""} onClick={() => setPaymentMethod("pix")} type="button">
                PIX
              </button>
              <button className={paymentMethod === "cash" ? "is-active" : ""} onClick={() => setPaymentMethod("cash")} type="button">
                Dinheiro
              </button>
              <button className={paymentMethod === "card" ? "is-active" : ""} onClick={() => setPaymentMethod("card")} type="button">
                Cartão
              </button>
            </div>
            <VendorSectionLabel>Observação do pagamento</VendorSectionLabel>
            <textarea
              className="client-cart-notes"
              onChange={(event) => setPaymentNote(event.target.value)}
              placeholder="Ex.: Vou pagar na entrega / cartão no link..."
              rows={3}
              value={paymentNote}
            />
            {paymentMethod === "pix" ? (
              <>
                <VendorSectionLabel>Pagamento via PIX</VendorSectionLabel>
                <button className="client-pay-pix-box" disabled={!hasPix} onClick={copyPix} type="button">
                  <code>{hasPix ? pixCode : "A loja ainda não cadastrou chave PIX."}</code>
                  <span>
                    <VendorIcon name={copiedPix ? "check" : "copy"} size={16} />
                    {hasPix ? (copiedPix ? "Copiado" : "Copiar") : "Indisponível"}
                  </span>
                </button>
                <label className={`client-pay-receipt ${checkoutProofFile ? "is-attached" : ""}`}>
                  <input
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setCheckoutProofFile(event.target.files?.[0] ?? null)}
                    style={{ display: "none" }}
                    type="file"
                  />
                  <VendorIcon name={checkoutProofFile ? "check" : "share"} size={22} />
                  <span>{checkoutProofFile ? checkoutProofFile.name : "Anexar comprovante PIX"}</span>
                </label>
              </>
            ) : null}
            <VendorCard className="client-sale-card">
              <div className="client-sale-card-foot" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                <div>
                  <span>Total do pedido</span>
                  <strong>{formatBRL(checkoutOrder.total_amount ?? 0)}</strong>
                </div>
              </div>
            </VendorCard>
          </div>
          <div className="client-overlay-footer" style={{ display: "grid", gap: 8 }}>
            <button
              className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
              disabled={isPendingAction || (paymentMethod === "pix" && !checkoutProofFile)}
              onClick={handleFinalizeOrder}
              type="button"
            >
              <VendorIcon name="check" size={16} />
              {paymentMethod === "pix" ? "Enviar comprovante e finalizar pedido" : "Finalizar pedido"}
            </button>
          </div>
        </ClientOverlay>
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

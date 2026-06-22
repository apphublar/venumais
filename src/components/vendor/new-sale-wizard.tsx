"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { DatePickerSheet } from "@/components/vendor/date-picker-sheet";
import { ProductThumb } from "@/components/vendor/product-thumb";
import { VendorBottomBar } from "@/components/vendor/vendor-bottom-bar";
import { formatCustomerAddress } from "@/lib/customers/address";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL, getEffectivePrice } from "@/lib/products/format";
import { createSaleAction } from "@/lib/sales/actions";
import {
  addDays,
  addMonthsKeepDay,
  brStr,
  couponDiscount,
  formatShortDate,
  parseBRL,
  splitInstallments,
  toISODate
} from "@/lib/sales/format";
import type { StoreCoupon } from "@/lib/coupons/types";
import type { PaymentMethod, PaymentMode } from "@/lib/sales/types";
import type { Customer } from "@/lib/database/types";
import type { Product } from "@/lib/database/types";

type Step = "cliente" | "itens" | "pagamento" | "sucesso";
type InstallmentType = "auto" | "manual";
type InstallmentPeriod = "weekly" | "biweekly" | "monthly";

type SaleResult = {
  saleId: string;
  total: number;
  customerName: string;
  customerPhone: string;
  paymentMode: PaymentMode;
  installmentCount: number;
  paymentMethod: PaymentMethod;
  cashReceived: boolean;
};

type ManualInstallment = {
  uid: string;
  due_date: string;
  raw: string;
};

const PERIOD_LABELS: Record<InstallmentPeriod, string> = {
  weekly: "semanal",
  biweekly: "quinzenal",
  monthly: "mensal"
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro"
};

type NewSaleWizardProps = {
  coupons: StoreCoupon[];
  customers: Customer[];
  initialCustomerId?: string;
  products: Product[];
  storeName: string;
  storeSlug: string;
};

export function NewSaleWizard({
  coupons,
  customers,
  initialCustomerId,
  products,
  storeName,
  storeSlug
}: NewSaleWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialCustomerId ? "itens" : "cliente");
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("installment");
  const [installmentType, setInstallmentType] = useState<InstallmentType>("auto");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cashReceived, setCashReceived] = useState(true);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentPeriod, setInstallmentPeriod] = useState<InstallmentPeriod>("monthly");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const manualUid = useRef(3);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedCustomerAddress = selectedCustomer
    ? formatCustomerAddress(selectedCustomer)
    : null;
  const cartEntries = Object.entries(cart).filter(([, quantity]) => quantity > 0);
  const subtotal = cartEntries.reduce((sum, [productId, quantity]) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return sum;
    }

    return sum + getEffectivePrice(product) * quantity;
  }, 0);

  const coupon = couponCode
    ? (coupons.find(
        (c) => c.active && c.code.toUpperCase() === couponCode.toUpperCase()
      ) ?? null)
    : null;
  const discount = couponDiscount(coupon, subtotal);
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  const [manualInstallments, setManualInstallments] = useState<ManualInstallment[]>(() => {
    const amounts = splitInstallments(subtotal, 2);
    return [
      { uid: "m1", due_date: toISODate(addDays(new Date(), 7)), raw: brStr(amounts[0]) },
      { uid: "m2", due_date: toISODate(addDays(new Date(), 21)), raw: brStr(amounts[1]) }
    ];
  });

  const manualTotal = manualInstallments.reduce(
    (sum, installment) => sum + parseBRL(installment.raw),
    0
  );
  const manualOk = Math.abs(manualTotal - total) < 0.01;

  const autoPreview = useMemo(() => {
    const amounts = splitInstallments(total, installmentCount);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return amounts.map((amount, index) => {
      let dueDate = today;

      if (installmentPeriod === "monthly") {
        dueDate = addMonthsKeepDay(today, index + 1);
      } else {
        dueDate = addDays(today, (installmentPeriod === "weekly" ? 7 : 15) * (index + 1));
      }

      return {
        installment_number: index + 1,
        due_date: toISODate(dueDate),
        amount
      };
    });
  }, [installmentCount, installmentPeriod, total]);

  const stepIndex = ["cliente", "itens", "pagamento"].indexOf(step);
  const categories = useMemo(
    () => ["todas", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  function updateCart(productId: string, delta: number) {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    setCart((current) => {
      const next = Math.max(0, Math.min(product.stock_qty, (current[productId] ?? 0) + delta));
      return { ...current, [productId]: next };
    });
  }

  function handleBack() {
    if (step === "cliente" || (step === "itens" && initialCustomerId)) {
      router.push("/painel");
      return;
    }

    if (step === "itens") {
      setStep("cliente");
      return;
    }

    if (step === "pagamento") {
      setStep("itens");
    }
  }

  function buildInstallments() {
    if (paymentMode === "cash") {
      return [
        {
          installment_number: 1,
          due_date: toISODate(new Date()),
          amount: total,
          paid: cashReceived,
          paid_at: cashReceived ? new Date().toISOString() : null
        }
      ];
    }

    if (installmentType === "auto") {
      return autoPreview.map((installment) => ({
        ...installment,
        paid: false
      }));
    }

    return [...manualInstallments]
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((installment, index) => ({
        installment_number: index + 1,
        due_date: installment.due_date,
        amount: parseBRL(installment.raw),
        paid: false
      }));
  }

  function handleConfirm() {
    if (!customerId || !cartEntries.length) {
      return;
    }

    if (paymentMode === "installment" && installmentType === "manual" && !manualOk) {
      return;
    }

    const items = cartEntries.map(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId)!;
      return {
        product_id: productId,
        quantity,
        unit_price: getEffectivePrice(product)
      };
    });

    startTransition(async () => {
      setError(null);
      const result = await createSaleAction({
        customerId,
        paymentMode,
        paymentMethod,
        deliveryType,
        notes,
        discountAmount: discount,
        items,
        installments: buildInstallments()
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const saleId = result.redirectTo?.split("/").pop() ?? "";
      const customer = customers.find((c) => c.id === customerId);
      const actualInstallmentCount =
        paymentMode === "cash"
          ? 1
          : installmentType === "auto"
            ? installmentCount
            : manualInstallments.length;

      setSaleResult({
        saleId,
        total,
        customerName: customer?.full_name ?? "",
        customerPhone: customer?.phone ?? "",
        paymentMode,
        installmentCount: actualInstallmentCount,
        paymentMethod,
        cashReceived
      });
      setStep("sucesso");
    });
  }

  const confirmDisabled =
    total <= 0 ||
    (paymentMode === "installment" && installmentType === "manual" && !manualOk);

  const confirmSub =
    paymentMode === "installment"
      ? installmentType === "auto"
        ? `${installmentCount}x ${PERIOD_LABELS[installmentPeriod]}`
        : `${manualInstallments.length} parcelas`
      : "à vista";

  return (
    <div className="vendor-wizard">
      {step !== "sucesso" ? (
        <>
          <header className="vendor-screen-header vendor-wizard-header">
            <div className="vendor-screen-header-main">
              <button aria-label="Voltar" className="vendor-icon-button" onClick={handleBack} type="button">
                <VendorIcon name="chevL" size={20} />
              </button>
              <div>
                <h1>
                  {step === "cliente"
                    ? "Escolher cliente"
                    : step === "itens"
                      ? "Adicionar produtos"
                      : "Pagamento"}
                </h1>
              </div>
            </div>
          </header>

          <div className="vendor-step-progress">
            {["cliente", "itens", "pagamento"].map((item, index) => (
              <span className={index <= stepIndex ? "is-active" : ""} key={item} />
            ))}
          </div>
        </>
      ) : null}

      {step === "cliente" ? (
        <CustomerStep customers={customers} onSelect={(id) => {
          setCustomerId(id);
          setStep("itens");
        }} />
      ) : null}

      {step === "itens" ? (
        <ItemsStep
          cart={cart}
          categories={categories}
          onContinue={() => setStep("pagamento")}
          products={products.filter((product) => product.stock_qty > 0 && product.active)}
          total={subtotal}
          updateCart={updateCart}
        />
      ) : null}

      {step === "pagamento" ? (
        <>
          <div className="vendor-wizard-scroll">
            <PaymentStep
              cashReceived={cashReceived}
              coupon={coupon}
              couponCode={couponCode}
              coupons={coupons}
              customerAddress={selectedCustomerAddress}
              deliveryType={deliveryType}
              discount={discount}
              error={error}
              installmentCount={installmentCount}
              installmentPeriod={installmentPeriod}
              installmentType={installmentType}
              manualInstallments={manualInstallments}
              manualOk={manualOk}
              manualTotal={manualTotal}
              notes={notes}
              onAddManualInstallment={() => {
                setManualInstallments((current) => {
                  const last = current[current.length - 1];
                  return [
                    ...current,
                    {
                      uid: `m${manualUid.current++}`,
                      due_date: toISODate(addDays(new Date(`${last.due_date}T00:00:00`), 30)),
                      raw: "0,00"
                    }
                  ];
                });
              }}
              onRemoveManualInstallment={(index) => {
                setManualInstallments((current) => current.filter((_, i) => i !== index));
              }}
              onUpdateManualDate={(index, dueDate) => {
                setManualInstallments((current) =>
                  current
                    .map((item, i) => (i === index ? { ...item, due_date: dueDate } : item))
                    .sort((a, b) => a.due_date.localeCompare(b.due_date))
                );
              }}
              onUpdateManualRaw={(index, raw) => {
                setManualInstallments((current) =>
                  current.map((item, i) => (i === index ? { ...item, raw } : item))
                );
              }}
              paymentMethod={paymentMethod}
              paymentMode={paymentMode}
              preview={autoPreview}
              setCashReceived={setCashReceived}
              setCouponCode={setCouponCode}
              setDeliveryType={setDeliveryType}
              setInstallmentCount={setInstallmentCount}
              setInstallmentPeriod={setInstallmentPeriod}
              setInstallmentType={setInstallmentType}
              setNotes={setNotes}
              setPaymentMethod={setPaymentMethod}
              setPaymentMode={setPaymentMode}
              subtotal={subtotal}
              total={total}
            />
          </div>
          <VendorBottomBar
            disabled={confirmDisabled || isPending}
            label={isPending ? "Registrando..." : "Confirmar venda"}
            onClick={handleConfirm}
            pending={isPending}
            sub={confirmSub}
          />
        </>
      ) : null}

      {step === "sucesso" && saleResult ? (
        <SucessoStep
          onViewOrders={() => router.push("/painel/pedidos")}
          result={saleResult}
          storeName={storeName}
          storeSlug={storeSlug}
        />
      ) : null}
    </div>
  );
}

function CustomerStep({
  customers,
  onSelect
}: {
  customers: Customer[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = customers.filter((customer) => {
    const normalized = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, "");
    return (
      customer.full_name.toLowerCase().includes(normalized) ||
      (digits.length > 0 && customer.phone.replace(/\D/g, "").includes(digits))
    );
  });

  return (
    <div className="vendor-wizard-scroll">
      <div className="vendor-search">
        <VendorIcon name="search" size={18} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou WhatsApp"
          type="search"
          value={query}
        />
        {query ? (
          <button className="vendor-search-clear" onClick={() => setQuery("")} type="button">
            <VendorIcon name="x" size={13} />
          </button>
        ) : null}
      </div>

      <Link className="vendor-new-customer-cta" href="/painel/clientes/novo">
        <span className="vendor-new-customer-cta-icon">
          <VendorIcon name="plus" size={22} />
        </span>
        <span className="vendor-new-customer-cta-copy">
          <strong>Cadastrar novo cliente</strong>
          <span>Adicione na hora e continue a venda</span>
        </span>
      </Link>

      <div className="vendor-list">
        {filtered.map((customer) => (
          <button
            className="vendor-card vendor-customer-card"
            key={customer.id}
            onClick={() => onSelect(customer.id)}
            type="button"
          >
            <VendorAvatar
              color={customer.avatar_color}
              label={getCustomerInitials(customer.full_name)}
              size={44}
            />
            <div className="vendor-customer-card-body">
              <strong>{customer.full_name}</strong>
              <span>{customer.phone || "Sem WhatsApp"}</span>
            </div>
            <VendorIcon name="chevR" size={20} />
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="vendor-empty vendor-empty-compact">
          <strong>Nenhum cliente encontrado</strong>
          <p>Use &quot;Cadastrar novo cliente&quot; acima.</p>
        </div>
      ) : null}
    </div>
  );
}

function ItemsStep({
  products,
  categories,
  cart,
  updateCart,
  total,
  onContinue
}: {
  products: Product[];
  categories: string[];
  cart: Record<string, number>;
  updateCart: (productId: string, delta: number) => void;
  total: number;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");

  const filtered = products.filter((product) => {
    const normalized = query.trim().toLowerCase();
    const matchesCategory = category === "todas" || product.category === category;
    const matchesQuery =
      product.name.toLowerCase().includes(normalized) ||
      product.sku.toLowerCase().includes(normalized);
    return matchesCategory && matchesQuery;
  });

  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <>
      <div className="vendor-wizard-scroll">
        <div className="vendor-search">
          <VendorIcon name="search" size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou SKU"
            type="search"
            value={query}
          />
          {query ? (
            <button className="vendor-search-clear" onClick={() => setQuery("")} type="button">
              <VendorIcon name="x" size={13} />
            </button>
          ) : null}
        </div>

        <div className="vendor-category-row">
          {categories.map((item) => (
            <button
              className={`vendor-category-chip ${category === item ? "vendor-category-chip-active" : ""}`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item === "todas" ? "Todas" : item}
            </button>
          ))}
        </div>

        <div className="vendor-list">
          {filtered.map((product) => {
            const quantity = cart[product.id] ?? 0;
            const atLimit = quantity >= product.stock_qty;

            return (
              <VendorCard className="vendor-product-card" key={product.id}>
                <ProductThumb product={product} size={46} />
                <div className="vendor-product-card-body">
                  <strong>{product.name}</strong>
                  <span>
                    {product.price_visible ? formatBRL(getEffectivePrice(product)) : "A combinar"}
                    {quantity > 0 && atLimit ? (
                      <span className="vendor-text-warning"> · só restam {product.stock_qty} un.</span>
                    ) : null}
                  </span>
                </div>
                {quantity > 0 ? (
                  <div className="vendor-qty-controls">
                    <button onClick={() => updateCart(product.id, -1)} type="button">
                      <VendorIcon name="arrowDown" size={16} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      className={!atLimit ? "vendor-qty-plus-active" : ""}
                      disabled={atLimit}
                      onClick={() => updateCart(product.id, 1)}
                      type="button"
                    >
                      <VendorIcon name="arrowUp" size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="vendor-add-button"
                    onClick={() => updateCart(product.id, 1)}
                    type="button"
                  >
                    Adicionar
                  </button>
                )}
              </VendorCard>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="vendor-empty vendor-empty-compact">
            <strong>Nenhum produto encontrado</strong>
          </div>
        ) : null}
      </div>

      <VendorBottomBar
        disabled={itemCount === 0}
        label={itemCount ? `Continuar · ${formatBRL(total)}` : "Selecione produtos"}
        onClick={onContinue}
        sub={itemCount ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}` : null}
      />
    </>
  );
}

function PaymentStep({
  subtotal,
  total,
  discount,
  couponCode,
  coupon,
  coupons,
  setCouponCode,
  customerAddress,
  deliveryType,
  setDeliveryType,
  notes,
  setNotes,
  paymentMode,
  setPaymentMode,
  installmentType,
  setInstallmentType,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  installmentCount,
  setInstallmentCount,
  installmentPeriod,
  setInstallmentPeriod,
  preview,
  manualInstallments,
  manualTotal,
  manualOk,
  onUpdateManualDate,
  onUpdateManualRaw,
  onRemoveManualInstallment,
  onAddManualInstallment,
  error
}: {
  subtotal: number;
  total: number;
  discount: number;
  couponCode: string;
  coupon: StoreCoupon | null;
  coupons: StoreCoupon[];
  setCouponCode: (value: string) => void;
  customerAddress?: string | null;
  deliveryType: "pickup" | "delivery";
  setDeliveryType: (value: "pickup" | "delivery") => void;
  notes: string;
  setNotes: (value: string) => void;
  paymentMode: PaymentMode;
  setPaymentMode: (value: PaymentMode) => void;
  installmentType: InstallmentType;
  setInstallmentType: (value: InstallmentType) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  cashReceived: boolean;
  setCashReceived: (value: boolean) => void;
  installmentCount: number;
  setInstallmentCount: (value: number) => void;
  installmentPeriod: InstallmentPeriod;
  setInstallmentPeriod: (value: InstallmentPeriod) => void;
  preview: Array<{ installment_number: number; due_date: string; amount: number }>;
  manualInstallments: ManualInstallment[];
  manualTotal: number;
  manualOk: boolean;
  onUpdateManualDate: (index: number, dueDate: string) => void;
  onUpdateManualRaw: (index: number, raw: string) => void;
  onRemoveManualInstallment: (index: number) => void;
  onAddManualInstallment: () => void;
  error: string | null;
}) {
  const todayLabel = formatShortDate(toISODate(new Date()));
  const [datePickerIdx, setDatePickerIdx] = useState<number | null>(null);
  const todayISO = toISODate(new Date());

  return (
    <>
      <div className="vendor-sale-total-banner">
        <div>
          <span>{discount > 0 ? "Subtotal" : "Total da venda"}</span>
          <strong style={discount > 0 ? { fontSize: "1rem", opacity: 0.7 } : undefined}>
            {formatBRL(subtotal)}
          </strong>
        </div>
        {discount > 0 && coupon ? (
          <>
            <div className="vendor-sale-total-banner-sub">
              <span>Cupom {coupon.code}</span>
              <span className="vendor-sale-total-banner-discount">− {formatBRL(discount)}</span>
            </div>
            <div className="vendor-sale-total-banner-divider">
              <span>Total</span>
              <strong>{formatBRL(total)}</strong>
            </div>
          </>
        ) : null}
      </div>

      <div className="vendor-section-label">Entrega</div>
      <div className="vendor-choice-grid">
        {[
          ["pickup", "Retirada no local", "store", "Cliente retira na loja"],
          ["delivery", "Entrega", "truck", "Entregamos no endereço"]
        ].map(([value, label, icon, sub]) => (
          <button
            className={`vendor-choice-card ${deliveryType === value ? "is-active" : ""}`}
            key={value}
            onClick={() => setDeliveryType(value as "pickup" | "delivery")}
            type="button"
          >
            <VendorIcon name={icon as "store" | "truck"} size={20} />
            <strong>{label}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>

      {deliveryType === "delivery" ? (
        <div
          className={`vendor-delivery-alert ${
            customerAddress ? "vendor-delivery-alert-ok" : "vendor-delivery-alert-warn"
          }`}
        >
          <VendorIcon name={customerAddress ? "homePin" : "alert"} size={16} />
          <span>
            {customerAddress ? (
              <>
                Entregar em: <b>{customerAddress}</b>
              </>
            ) : (
              "Cliente ainda não cadastrou endereço. Ao confirmar, ele recebe o recibo e um pedido para cadastrar o endereço de entrega."
            )}
          </span>
        </div>
      ) : null}

      <div className="vendor-section-label">Cupom de desconto</div>
      <div className="vendor-coupon-row">
        <input
          className={`vendor-coupon-input ${couponCode && !coupon ? "vendor-coupon-input-invalid" : ""}`}
          onChange={(event) =>
            setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          placeholder="Digite o código"
          value={couponCode}
        />
        {couponCode ? (
          <button className="vendor-coupon-clear" onClick={() => setCouponCode("")} type="button">
            <VendorIcon name="x" size={18} />
          </button>
        ) : null}
      </div>
      {couponCode && !coupon ? (
        <p className="vendor-message vendor-message-error" style={{ margin: "-2px 2px 14px" }}>
          Cupom inválido ou inativo.
        </p>
      ) : null}
      {!couponCode && coupons.filter((c) => c.active).length > 0 ? (
        <div className="vendor-coupon-pills">
          {coupons
            .filter((c) => c.active)
            .map((item) => (
              <button
                className="vendor-coupon-pill"
                key={item.code}
                onClick={() => setCouponCode(item.code)}
                type="button"
              >
                <VendorIcon name="ticket" size={13} /> {item.code}
              </button>
            ))}
        </div>
      ) : null}

      <div className="vendor-section-label">Observações</div>
      <label className="vendor-field">
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anotações sobre a venda, referências, combinados..."
          rows={3}
          value={notes}
        />
      </label>

      <div className="vendor-choice-grid">
        {[
          ["cash", "À vista", "wallet"],
          ["installment", "Parcelado", "cards"]
        ].map(([value, label, icon]) => (
          <button
            className={`vendor-choice-card vendor-choice-card-center ${paymentMode === value ? "is-active" : ""}`}
            key={value}
            onClick={() => setPaymentMode(value as PaymentMode)}
            type="button"
          >
            <VendorIcon name={icon as "wallet" | "cards"} size={22} />
            <strong>{label}</strong>
          </button>
        ))}
      </div>

      {paymentMode === "installment" ? (
        <>
          <div className="vendor-segmented">
            {[
              ["auto", "Automático"],
              ["manual", "Manual"]
            ].map(([value, label]) => (
              <button
                className={installmentType === value ? "is-active" : ""}
                key={value}
                onClick={() => setInstallmentType(value as InstallmentType)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="vendor-section-label">Forma de recebimento</div>
          <MethodSelector onChange={setPaymentMethod} value={paymentMethod} />

          {installmentType === "auto" ? (
            <>
              <div className="vendor-section-label">Número de parcelas</div>
              <div className="vendor-installment-count-row">
                {[2, 3, 4, 6, 10, 12].map((count) => (
                  <button
                    className={`vendor-installment-count-btn ${installmentCount === count ? "is-active" : ""}`}
                    key={count}
                    onClick={() => setInstallmentCount(count)}
                    type="button"
                  >
                    {count}x
                  </button>
                ))}
              </div>

              <div className="vendor-section-label">Periodicidade</div>
              <div className="vendor-period-row">
                {[
                  ["weekly", "Semanal"],
                  ["biweekly", "Quinzenal"],
                  ["monthly", "Mensal"]
                ].map(([value, label]) => (
                  <button
                    className={`vendor-period-btn ${installmentPeriod === value ? "is-active" : ""}`}
                    key={value}
                    onClick={() => setInstallmentPeriod(value as InstallmentPeriod)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="vendor-installment-preview-header">
                <span>
                  {installmentCount}x {PERIOD_LABELS[installmentPeriod]}
                </span>
                <em>soma {formatBRL(total)}</em>
              </div>

              {preview.map((installment) => (
                <div className="vendor-installment-preview-item" key={installment.installment_number}>
                  <span className="vendor-installment-badge">{installment.installment_number}</span>
                  <span className="vendor-installment-date">
                    <VendorIcon name="calendar" size={14} />
                    {formatShortDate(installment.due_date)}
                  </span>
                  <strong className="vendor-installment-amount">{formatBRL(installment.amount)}</strong>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="vendor-installment-preview-header">
                <span>Parcelas personalizadas</span>
                <em style={{ color: manualOk ? "var(--vendor-green-700)" : "#dc2626" }}>
                  {formatBRL(manualTotal)} / {formatBRL(total)}
                </em>
              </div>

              {manualInstallments.map((installment, index) => (
                <VendorCard className="vendor-manual-installment-row" key={installment.uid}>
                  <span className="vendor-installment-badge">{index + 1}</span>
                  <button
                    className="vendor-manual-date-btn"
                    onClick={() => setDatePickerIdx(index)}
                    type="button"
                  >
                    <VendorIcon name="calendar" size={14} />
                    <span>{formatShortDate(installment.due_date)}</span>
                  </button>
                  <div className="vendor-manual-amount">
                    <span>R$</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        onUpdateManualRaw(index, event.target.value.replace(/[^\d.,]/g, ""))
                      }
                      placeholder="0,00"
                      value={installment.raw}
                    />
                  </div>
                  {manualInstallments.length > 1 ? (
                    <button
                      className="vendor-manual-remove"
                      onClick={() => onRemoveManualInstallment(index)}
                      type="button"
                    >
                      <VendorIcon name="x" size={16} />
                    </button>
                  ) : null}
                </VendorCard>
              ))}

              <button className="vendor-add-installment-btn" onClick={onAddManualInstallment} type="button">
                <VendorIcon name="plus" size={16} /> Adicionar parcela
              </button>

              {!manualOk ? (
                <p className="vendor-message vendor-message-error" style={{ textAlign: "center", marginTop: 10 }}>
                  A soma das parcelas precisa fechar com o total da venda.
                </p>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          <div className="vendor-section-label">Status do pagamento</div>
          <div className="vendor-cash-status-row">
            {[
              [true, "Já recebido", "check"],
              [false, "A receber", "clock"]
            ].map(([value, label, icon]) => (
              <button
                className={`vendor-choice-card vendor-choice-card-center ${cashReceived === value ? "is-active" : ""}`}
                key={String(value)}
                onClick={() => setCashReceived(value as boolean)}
                style={{ flexDirection: "row", justifyContent: "center", gap: 7 }}
                type="button"
              >
                <VendorIcon name={icon as "check" | "clock"} size={18} />
                <strong>{label}</strong>
              </button>
            ))}
          </div>

          <div className="vendor-section-label">Forma de pagamento</div>
          <MethodSelector onChange={setPaymentMethod} value={paymentMethod} />

          <VendorCard className="vendor-cash-summary">
            <span className="vendor-cash-summary-icon">
              <VendorIcon name={paymentMethod === "pix" ? "pix" : paymentMethod === "card" ? "cards" : "wallet"} size={22} />
            </span>
            <p>
              {cashReceived ? (
                <>
                  Recebido <b>hoje</b> via <b>{PAYMENT_METHOD_LABELS[paymentMethod]}</b>.
                </>
              ) : (
                <>
                  A receber via <b>{PAYMENT_METHOD_LABELS[paymentMethod]}</b> · vence hoje, {todayLabel}.
                </>
              )}
            </p>
          </VendorCard>
        </>
      )}

      {error ? (
        <p className="vendor-message vendor-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Mini-calendar sheet for manual installment date picking */}
      <DatePickerSheet
        key={
          datePickerIdx !== null
            ? `${datePickerIdx}:${manualInstallments[datePickerIdx]?.due_date ?? "null"}:${todayISO}`
            : "closed"
        }
        min={todayISO}
        onClose={() => setDatePickerIdx(null)}
        onPick={(isoDate) => {
          if (datePickerIdx !== null) {
            onUpdateManualDate(datePickerIdx, isoDate);
            setDatePickerIdx(null);
          }
        }}
        open={datePickerIdx !== null}
        refBase={
          datePickerIdx !== null && datePickerIdx > 0
            ? manualInstallments[datePickerIdx - 1].due_date
            : todayISO
        }
        value={datePickerIdx !== null ? manualInstallments[datePickerIdx]?.due_date ?? null : null}
      />
    </>
  );
}

function MethodSelector({
  value,
  onChange
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}) {
  return (
    <div className="vendor-choice-grid vendor-choice-grid-3" style={{ marginBottom: 18 }}>
      {[
        ["pix", "PIX", "pix"],
        ["card", "Cartão", "cards"],
        ["cash", "Dinheiro", "wallet"]
      ].map(([method, label, icon]) => (
        <button
          className={`vendor-choice-card vendor-choice-card-center ${value === method ? "is-active" : ""}`}
          key={method}
          onClick={() => onChange(method as PaymentMethod)}
          type="button"
        >
          <VendorIcon name={icon as "pix" | "cards" | "wallet"} size={20} />
          <strong>{label}</strong>
        </button>
      ))}
    </div>
  );
}

const PAYMENT_METHOD_LABELS_PT: Record<PaymentMethod, string> = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro"
};

function SucessoStep({
  result,
  storeName,
  storeSlug,
  onViewOrders
}: {
  result: SaleResult;
  storeName: string;
  storeSlug: string;
  onViewOrders: () => void;
}) {
  const isInstallment = result.paymentMode === "installment";
  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/loja/${storeSlug}`;

  function handleWhatsApp() {
    const firstName = result.customerName.split(" ")[0];
    const phone = "55" + result.customerPhone.replace(/\D/g, "");
    const msg = isInstallment
      ? `Oi, ${firstName}! Registrei sua compra de ${formatBRL(result.total)} em ${result.installmentCount}x na ${storeName}. Confirme os detalhes no seu portal: ${portalUrl}`
      : `Oi, ${firstName}! Sua compra de ${formatBRL(result.total)} foi registrada na ${storeName}. Acesse seu portal: ${portalUrl}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="vendor-success-screen">
      <div className="vendor-success-icon">
        <VendorIcon name="check" size={44} />
      </div>
      <h2 className="vendor-success-title">Venda registrada!</h2>
      <p className="vendor-success-desc">
        {formatBRL(result.total)} para <b>{result.customerName}</b>.{" "}
        {isInstallment
          ? `Crediário em ${result.installmentCount}x · ${PAYMENT_METHOD_LABELS_PT[result.paymentMethod]}.`
          : result.cashReceived
            ? `Recebido via ${PAYMENT_METHOD_LABELS_PT[result.paymentMethod]}.`
            : `A receber via ${PAYMENT_METHOD_LABELS_PT[result.paymentMethod]} · vence hoje.`}
      </p>

      {isInstallment ? (
        <VendorCard className="vendor-success-hint">
          <VendorIcon name="clock" size={18} />
          <p>
            Envie para o cliente confirmar a compra pelo portal. A confirmação fica registrada com data — um comprovante do acordo.
          </p>
        </VendorCard>
      ) : null}

      <div className="vendor-success-actions">
        <Link
          className="vendor-button vendor-button-primary vendor-button-lg vendor-button-full"
          href={`/painel/vendas/${result.saleId}`}
        >
          <VendorIcon name="receipt" size={18} />
          Ver recibo
        </Link>

        {isInstallment ? (
          <button
            className="vendor-button vendor-button-whats vendor-button-lg vendor-button-full"
            onClick={handleWhatsApp}
            type="button"
          >
            <VendorWhatsLogo size={18} />
            Enviar para confirmação do cliente
          </button>
        ) : null}

        <button
          className="vendor-button vendor-button-ghost vendor-button-lg vendor-button-full"
          onClick={onViewOrders}
          type="button"
        >
          Ver pedidos
        </button>
      </div>
    </div>
  );
}

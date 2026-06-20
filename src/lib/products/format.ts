const THUMB_COLORS = [
  "#e9d5ff",
  "#fde68a",
  "#bfdbfe",
  "#fecaca",
  "#a7f3d0",
  "#c7d2fe",
  "#bae6fd",
  "#fbcfe8"
];

export function pickThumbColor(index: number) {
  return THUMB_COLORS[index % THUMB_COLORS.length];
}

export function parseBRL(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  let normalized = String(value).trim().replace(/[^\d.,]/g, "");

  if (normalized.includes(".") && normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function getEffectivePrice(product: {
  price: number;
  promo_price: number | null;
}) {
  if (product.promo_price && product.promo_price > 0) {
    return product.promo_price;
  }

  return product.price;
}

export function getProductMetrics(
  products: Array<{
    cost: number;
    price: number;
    promo_price: number | null;
    stock_qty: number;
  }>
) {
  const invested = products.reduce(
    (total, product) => total + product.cost * product.stock_qty,
    0
  );

  const potential = products.reduce((total, product) => {
    const unitPrice = getEffectivePrice(product) || product.cost * 1.8;
    return total + unitPrice * product.stock_qty;
  }, 0);

  return { invested, potential };
}

export function parseVariations(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatVariations(variations: string[]) {
  return variations.join(", ");
}

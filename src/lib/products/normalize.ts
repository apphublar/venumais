import type { Product } from "@/lib/database/types";

export function normalizeProductVariations(variations: unknown): string[] {
  if (!Array.isArray(variations)) {
    return [];
  }

  return variations.map(String).filter(Boolean);
}

export function normalizeProduct<T extends { variations?: unknown }>(product: T) {
  return {
    ...product,
    variations: normalizeProductVariations(product.variations)
  };
}

export type ProductWithDimensions = Product & {
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  weight_kg: number | null;
};

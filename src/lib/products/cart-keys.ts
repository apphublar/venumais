export function buildCartLineKey(productId: string, variation?: string | null) {
  const normalizedVariation = variation?.trim();
  return normalizedVariation ? `${productId}::${normalizedVariation}` : productId;
}

export function parseCartLineKey(key: string) {
  const separatorIndex = key.indexOf("::");
  if (separatorIndex === -1) {
    return { productId: key, variation: undefined as string | undefined };
  }

  return {
    productId: key.slice(0, separatorIndex),
    variation: key.slice(separatorIndex + 2) || undefined
  };
}

export function productCartQuantity(cart: Record<string, number>, productId: string) {
  return Object.entries(cart).reduce((total, [key, quantity]) => {
    const parsed = parseCartLineKey(key);
    return parsed.productId === productId ? total + quantity : total;
  }, 0);
}

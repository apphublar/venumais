export const DEFAULT_BRAND_COLOR = "#11885b";
export const DEFAULT_BRAND_TEXT_COLOR = "#ffffff";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return null;
  }

  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function mixRgb(
  color: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  amount: number
) {
  return {
    r: Math.round(color.r + (target.r - color.r) * amount),
    g: Math.round(color.g + (target.g - color.g) * amount),
    b: Math.round(color.b + (target.b - color.b) * amount)
  };
}

function rgbToHex(color: { r: number; g: number; b: number }) {
  return `#${[color.r, color.g, color.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getBrandColorVars(brandColor: string, brandTextColor?: string | null) {
  const rgb = hexToRgb(brandColor) ?? hexToRgb("#11885b");
  if (!rgb) {
    return {};
  }
  const onRgb = hexToRgb(brandTextColor ?? "") ?? hexToRgb("#ffffff");
  if (!onRgb) {
    return {};
  }

  const light = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.12);
  const dark = mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.18);
  const gradientLight = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.06);
  const gradientDark = mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.24);
  const onHex = rgbToHex(onRgb);
  const onStrong = `${onRgb.r} ${onRgb.g} ${onRgb.b}`;

  return {
    "--vendor-brand-on": onHex,
    "--vendor-brand-on-rgb": onStrong,
    "--client-brand-on": onHex,
    "--client-brand-on-rgb": onStrong,
    "--vendor-brand-g1": rgbToHex(gradientLight),
    "--vendor-brand-g2": rgbToHex(gradientDark),
    "--client-brand-g1": rgbToHex(light),
    "--client-brand-g2": rgbToHex(dark),
    "--client-green-600": rgbToHex(light),
    "--client-green-700": rgbToHex(dark),
    "--vendor-green-600": rgbToHex(light),
    "--vendor-green-700": rgbToHex(dark)
  } as Record<string, string>;
}

export function isDefaultBrandPalette(
  brandColor?: string | null,
  brandTextColor?: string | null
) {
  const color = brandColor?.trim().toLowerCase() ?? DEFAULT_BRAND_COLOR;
  const textColor = brandTextColor?.trim().toLowerCase() ?? DEFAULT_BRAND_TEXT_COLOR;
  return color === DEFAULT_BRAND_COLOR && textColor === DEFAULT_BRAND_TEXT_COLOR;
}

export function shouldApplyStoreBrand(input: {
  brand_color: string;
  brand_text_color?: string | null;
  brand_customized?: boolean | null;
  catalog_tagline?: string | null;
  logo_url?: string | null;
}) {
  if (input.brand_customized) {
    return true;
  }

  if (input.logo_url?.trim()) {
    return true;
  }

  const tagline = input.catalog_tagline?.trim();
  if (tagline && tagline !== "Catálogo online") {
    return true;
  }

  return !isDefaultBrandPalette(input.brand_color, input.brand_text_color);
}

export function resolveStoreBrandStyle(input: {
  brand_color: string;
  brand_text_color?: string | null;
  brand_customized?: boolean | null;
  catalog_tagline?: string | null;
  logo_url?: string | null;
}) {
  if (!shouldApplyStoreBrand(input)) {
    return undefined;
  }

  return getBrandColorVars(input.brand_color, input.brand_text_color);
}

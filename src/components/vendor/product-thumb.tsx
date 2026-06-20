import type { Product } from "@/lib/database/types";

export function ProductThumb({
  product,
  size = 50
}: {
  product: Pick<Product, "name" | "thumb_color" | "image_url">;
  size?: number;
}) {
  const initial = product.name.trim().charAt(0).toUpperCase() || "P";

  if (product.image_url) {
    return (
      <div
        className="vendor-product-thumb"
        style={{ width: size, height: size, borderRadius: size * 0.28 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={product.image_url} />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="vendor-product-thumb vendor-product-thumb-fallback"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: product.thumb_color,
        fontSize: size * 0.38
      }}
    >
      {initial}
    </div>
  );
}

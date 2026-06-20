"use server";

import { revalidatePath } from "next/cache";
import { requireStoreAccess } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type UpdateStoreInput = {
  name?: string;
  catalog_tagline?: string;
  pix_key?: string;
  pix_receiver_name?: string;
  brand_color?: string;
  brand_text_color?: string;
  logo_url?: string | null;
};

export async function updateStoreAction(
  data: UpdateStoreInput
): Promise<{ error?: string }> {
  const { store } = await requireStoreAccess();

  const name = data.name?.trim();
  if (name && (name.length < 2 || name.length > 120)) {
    return { error: "O nome da loja deve ter entre 2 e 120 caracteres." };
  }
  const brandColor = data.brand_color?.trim();
  if (brandColor && !/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    return { error: "A cor da marca deve estar no formato hexadecimal (#RRGGBB)." };
  }
  const brandTextColor = data.brand_text_color?.trim();
  if (brandTextColor && !/^#[0-9a-fA-F]{6}$/.test(brandTextColor)) {
    return { error: "A cor do texto deve estar no formato hexadecimal (#RRGGBB)." };
  }
  const hasLogoUrl = Object.prototype.hasOwnProperty.call(data, "logo_url");
  const logoUrl = data.logo_url?.trim() ?? null;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("stores")
    .update({
      ...(name ? { name } : {}),
      ...(brandColor ? { brand_color: brandColor } : {}),
      ...(brandTextColor ? { brand_text_color: brandTextColor } : {}),
      ...(hasLogoUrl ? { logo_url: logoUrl } : {}),
      catalog_tagline: data.catalog_tagline?.trim() || null,
      pix_key: data.pix_key?.trim() || null,
      pix_receiver_name: data.pix_receiver_name?.trim() || null
    })
    .eq("id", store.id);

  if (error) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/painel/configuracoes");
  revalidatePath("/painel");
  return {};
}

export async function uploadStoreLogoAction(
  file: File
): Promise<{ url?: string; error?: string }> {
  const { user, store } = await requireStoreAccess();
  const supabase = await getSupabaseServerClient();

  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Selecione uma imagem válida para a logo." };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { error: "A logo deve ter no máximo 3MB." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Formato inválido. Envie PNG, JPG, WEBP ou SVG." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
  const filePath = `${user.id}/${store.slug}/logo-${Date.now()}.${ext}`;
  const upload = await supabase.storage.from("store-logos").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (upload.error) {
    return { error: "Não foi possível enviar a logo." };
  }

  const { data } = supabase.storage.from("store-logos").getPublicUrl(filePath);
  return { url: data.publicUrl };
}

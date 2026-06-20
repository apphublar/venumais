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
  logo_url?: string;
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
  const logoUrl = data.logo_url?.trim();
  if (logoUrl && !/^https?:\/\/.+/i.test(logoUrl)) {
    return { error: "A URL da logo deve começar com http:// ou https://." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("stores")
    .update({
      ...(name ? { name } : {}),
      ...(brandColor ? { brand_color: brandColor } : {}),
      logo_url: logoUrl || null,
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

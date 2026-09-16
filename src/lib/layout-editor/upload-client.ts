import { createClient } from "@/lib/supabase/client";

// Upload de imagem pro bucket "layout-assets", mesmo padrão de
// src/app/app/(gated)/produtos/product-form-dialog.tsx (bucket "product-images")
// — só muda o bucket e o prefixo do path (page_key em vez de business_id).
export async function uploadLayoutAsset(
  pageKey: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${pageKey}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("layout-assets").upload(path, file);
  if (error) {
    return { ok: false, error: "Não foi possível enviar a imagem. Tente novamente." };
  }

  const { data } = supabase.storage.from("layout-assets").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

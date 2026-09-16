"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadLayoutAsset } from "@/lib/layout-editor/upload-client";

// Botão de trocar imagem reutilizado nos blocos de imagem da landing — sobe
// pro bucket "layout-assets" (ver supabase/migrations/20260916000001_layout_editor.sql)
// e devolve a URL pública, igual ao padrão já usado em product-form-dialog.tsx.
export function ImageUploadField({
  pageKey,
  url,
  onUploaded,
  hint,
}: {
  pageKey: string;
  url: string | undefined;
  onUploaded: (url: string) => void;
  // Dica de tamanho ideal (px) mostrada abaixo do botão — a mesma imagem
  // serve pra computador e celular (o layout é responsivo, a imagem só
  // precisa ter resolução suficiente pro maior caso, computador).
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const result = await uploadLayoutAsset(pageKey, file);
    setUploading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUploaded(result.url);
  }

  return (
    <div className="space-y-2">
      {url ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
          <Image src={url} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Enviando..." : url ? "Trocar imagem" : "Escolher imagem"}
      </Button>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

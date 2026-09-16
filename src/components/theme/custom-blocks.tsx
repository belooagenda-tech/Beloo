import Image from "next/image";
import { getPublishedBlocks, getDraftBlocks } from "@/lib/layout-editor/get-published";
import { getOwnProfile } from "@/lib/supabase/session";
import type { PageKey } from "@/lib/layout-editor/pages";
import type { CustomBlock } from "@/lib/layout-editor/blocks-schema";

// Insere os blocos de texto/imagem publicados pelo Editor Visual antes ou
// depois do conteúdo funcional de uma tela interna — nunca dentro dele. Ver
// src/lib/layout-editor/blocks-schema.ts e as 13 páginas em src/app/app/**
// que renderizam isto (before logo após a <div> de abertura, after logo
// antes do fechamento).
//
// `preview`: usado só pelo iframe de preview ao vivo dentro do Editor (ver
// blocks-editor.tsx) — mostra o rascunho em vez do publicado, mas só se
// quem está vendo realmente tem acesso ao Editor (checado aqui de novo, não
// confia só no query param vindo da URL).
export async function CustomBlocks({
  pageKey,
  position,
  preview = false,
}: {
  pageKey: PageKey;
  position: "before" | "after";
  preview?: boolean;
}) {
  let content;
  if (preview) {
    const profile = await getOwnProfile();
    content =
      profile?.is_admin || profile?.is_layout_editor
        ? await getDraftBlocks(pageKey)
        : await getPublishedBlocks(pageKey);
  } else {
    content = await getPublishedBlocks(pageKey);
  }

  const blocks = (content.blocks ?? []).filter((b) => b.position === position);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <CustomBlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function CustomBlockView({ block }: { block: CustomBlock }) {
  if (block.type === "text") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        {block.heading ? (
          <h2 className="font-heading text-base font-semibold text-foreground">{block.heading}</h2>
        ) : null}
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{block.body}</p>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-video w-full">
        <Image src={block.url} alt={block.alt} fill className="object-cover" unoptimized />
      </div>
      {block.caption ? (
        <figcaption className="px-4 py-3 text-center text-sm text-muted-foreground">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

import Image from "next/image";
import { getPublishedBlocks } from "@/lib/layout-editor/get-published";
import type { PageKey } from "@/lib/layout-editor/pages";
import type { CustomBlock } from "@/lib/layout-editor/blocks-schema";

// Insere os blocos de texto/imagem publicados pelo Editor Visual antes ou
// depois do conteúdo funcional de uma tela interna — nunca dentro dele. Ver
// src/lib/layout-editor/blocks-schema.ts e as 13 páginas em src/app/app/**
// que renderizam isto (before logo após a <div> de abertura, after logo
// antes do fechamento).
export async function CustomBlocks({
  pageKey,
  position,
}: {
  pageKey: PageKey;
  position: "before" | "after";
}) {
  const content = await getPublishedBlocks(pageKey);
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

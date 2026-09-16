import Image from "next/image";
import type { ImageBlock } from "@/lib/layout-editor/landing-schema";

// Template fixo de "bloco de imagem avulso" que o Editor Visual pode inserir
// entre as seções da landing (ver src/lib/layout-editor/landing-schema.ts).
// Sempre este componente, nunca HTML livre — só url/alt/legenda mudam.
export function LandingImageBlock({ block }: { block: ImageBlock }) {
  return (
    <section className="px-6 py-10 sm:px-10">
      <figure className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative aspect-video w-full">
          <Image src={block.url} alt={block.alt} fill className="object-cover" unoptimized />
        </div>
        {block.caption ? (
          <figcaption className="px-6 py-4 text-center text-sm text-muted-foreground">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    </section>
  );
}

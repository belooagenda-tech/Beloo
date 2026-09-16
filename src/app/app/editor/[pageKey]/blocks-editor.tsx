"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Type, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "../toolbar";
import { saveDraftAction, publishAction, discardDraftAction } from "../actions";
import { SortableList } from "./sortable-list";
import { ImageUploadField } from "./image-upload-field";
import { IMAGE_BLOCK_HINT } from "@/lib/layout-editor/image-hints";
import type { BlocksContent, CustomBlock, BlockPosition } from "@/lib/layout-editor/blocks-schema";

// Editor genérico usado pelas 13 telas internas do app + a página pública de
// agendamento (type "blocks" em pages.ts) — o editor só adiciona blocos de
// texto/imagem antes ou depois do conteúdo funcional da tela (tabela,
// agenda, formulário, fluxo de agendamento), nunca dentro dele. Ver
// src/components/theme/custom-blocks.tsx para a renderização real.
//
// O preview ao lado é a própria página real, num iframe — diferente do
// editor da Landing (que re-renderiza os componentes em memória a cada
// tecla), aqui não dá pra duplicar a busca de dados de cada tela. Por isso
// ele atualiza depois de "Salvar rascunho", não a cada letra digitada.
export function BlocksEditor({
  pageKey,
  pageLabel,
  previewPath,
  isAdmin,
  initialDraft,
  initialPublished,
  hasUnpublishedDraft,
  publishedAt,
}: {
  pageKey: string;
  pageLabel: string;
  previewPath: string;
  isAdmin: boolean;
  initialDraft: BlocksContent;
  initialPublished: BlocksContent;
  hasUnpublishedDraft: boolean;
  publishedAt: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialDraft);
  const [form, setForm] = useState(initialDraft);
  const [unpublished, setUnpublished] = useState(hasUnpublishedDraft);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [discarding, startDiscard] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const blocks = form.blocks ?? [];

  function handleSave() {
    startSave(async () => {
      const result = await saveDraftAction({ pageKey, content: form });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(form);
      setUnpublished(true);
      setPreviewNonce((n) => n + 1);
      toast.success("Rascunho salvo.");
    });
  }

  function handlePublish() {
    startPublish(async () => {
      const result = await publishAction(pageKey);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setUnpublished(false);
      setPreviewNonce((n) => n + 1);
      toast.success("Publicado — já está no ar.");
      router.refresh();
    });
  }

  function handleDiscard() {
    startDiscard(async () => {
      const result = await discardDraftAction(pageKey);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setForm(initialPublished);
      setSaved(initialPublished);
      setUnpublished(false);
      setPreviewNonce((n) => n + 1);
      toast.success("Rascunho descartado — voltou ao que está publicado.");
      router.refresh();
    });
  }

  function addTextBlock() {
    setForm((f) => ({
      ...f,
      blocks: [
        ...(f.blocks ?? []),
        { id: crypto.randomUUID(), type: "text", position: "before" as BlockPosition, body: "Novo texto" },
      ],
    }));
  }

  function addImageBlock() {
    setForm((f) => ({
      ...f,
      blocks: [
        ...(f.blocks ?? []),
        { id: crypto.randomUUID(), type: "image", position: "before" as BlockPosition, url: "", alt: "" },
      ],
    }));
  }

  const previewSeparator = previewPath.includes("?") ? "&" : "?";

  return (
    <div>
      <EditorToolbar
        pageLabel={pageLabel}
        isAdmin={isAdmin}
        dirty={dirty}
        hasUnpublishedDraft={unpublished}
        saving={saving}
        publishing={publishing}
        discarding={discarding}
        publishedAt={publishedAt}
        onSave={handleSave}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />

      <div className="grid lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="max-h-[calc(100vh-8rem)] space-y-3 overflow-y-auto border-r border-border p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Blocos de texto e imagem</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aparecem antes ou depois do conteúdo normal desta tela — a tabela, agenda, fluxo de
              agendamento ou formulário continuam funcionando exatamente como hoje.
            </p>
          </div>

          <SortableList
            items={blocks}
            maxItems={20}
            onChange={(next) => setForm((f) => ({ ...f, blocks: next }))}
            footer={
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addTextBlock}>
                  <Type className="size-3.5" />
                  Adicionar texto
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addImageBlock}>
                  <ImageIcon className="size-3.5" />
                  Adicionar imagem
                </Button>
              </div>
            }
            renderItem={(block: CustomBlock, onChangeItem) => (
              <div className="space-y-2">
                {block.type === "text" ? (
                  <>
                    <Input
                      value={block.heading ?? ""}
                      onChange={(e) => onChangeItem({ ...block, heading: e.target.value })}
                      placeholder="Título (opcional)"
                    />
                    <Textarea
                      rows={3}
                      value={block.body}
                      onChange={(e) => onChangeItem({ ...block, body: e.target.value })}
                      placeholder="Texto"
                    />
                  </>
                ) : (
                  <>
                    <ImageUploadField
                      pageKey={pageKey}
                      url={block.url || undefined}
                      onUploaded={(url) => onChangeItem({ ...block, url })}
                      hint={IMAGE_BLOCK_HINT}
                    />
                    <Input
                      value={block.alt}
                      onChange={(e) => onChangeItem({ ...block, alt: e.target.value })}
                      placeholder="Texto alternativo (descreva a imagem)"
                    />
                    <Input
                      value={block.caption ?? ""}
                      onChange={(e) => onChangeItem({ ...block, caption: e.target.value })}
                      placeholder="Legenda (opcional)"
                    />
                  </>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Posição</Label>
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={block.position}
                    onChange={(e) => onChangeItem({ ...block, position: e.target.value as BlockPosition })}
                  >
                    <option value="before">Antes do conteúdo da página</option>
                    <option value="after">Depois do conteúdo da página</option>
                  </select>
                </div>
              </div>
            )}
          />
        </div>

        <div className="flex max-h-[calc(100vh-8rem)] flex-col bg-muted/30">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
            <p className="text-xs text-muted-foreground">
              Preview ao vivo de <span className="font-medium text-foreground">{previewPath}</span> — atualiza
              depois de salvar o rascunho.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewNonce((n) => n + 1)}>
              Atualizar
            </Button>
          </div>
          <iframe
            key={previewNonce}
            src={`${previewPath}${previewSeparator}editorPreview=1`}
            title="Pré-visualização"
            className="min-h-[600px] flex-1 border-0"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Type, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditorToolbar } from "../toolbar";
import { saveDraftAction, publishAction, discardDraftAction } from "../actions";
import { SortableList } from "./sortable-list";
import { ImageUploadField } from "./image-upload-field";
import type { BlocksContent, CustomBlock, BlockPosition } from "@/lib/layout-editor/blocks-schema";

// Editor genérico usado pelas 13 telas internas do app (type "blocks" em
// pages.ts) — o editor só adiciona blocos de texto/imagem antes ou depois do
// conteúdo funcional da tela (tabela, agenda, formulário), nunca dentro
// dele. Ver src/components/theme/custom-blocks.tsx para a renderização real.
export function BlocksEditor({
  pageKey,
  pageLabel,
  isAdmin,
  initialDraft,
  initialPublished,
  hasUnpublishedDraft,
  publishedAt,
}: {
  pageKey: string;
  pageLabel: string;
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

      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blocos de texto e imagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Aparecem antes ou depois do conteúdo normal desta tela — a tabela, agenda ou formulário
              continuam funcionando exatamente como hoje.
            </p>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Barra fixa de ações do Editor: rascunho é livre pra quem tem acesso;
// publicar só aparece pra admin (ver src/app/app/editor/actions.ts).
export function EditorToolbar({
  pageLabel,
  isAdmin,
  dirty,
  hasUnpublishedDraft,
  saving,
  publishing,
  discarding,
  publishedAt,
  onSave,
  onPublish,
  onDiscard,
}: {
  pageLabel: string;
  isAdmin: boolean;
  dirty: boolean;
  hasUnpublishedDraft: boolean;
  saving: boolean;
  publishing: boolean;
  discarding: boolean;
  publishedAt: string | null;
  onSave: () => void;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{pageLabel}</p>
        {dirty ? (
          <p className="mt-0.5 text-xs text-warning">Você tem alterações não salvas.</p>
        ) : hasUnpublishedDraft ? (
          <Badge variant="secondary" className="mt-1 bg-warning/15 text-warning">
            Rascunho salvo, ainda não publicado
          </Badge>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {publishedAt
              ? `Publicado em ${new Date(publishedAt).toLocaleString("pt-BR")}`
              : "Nunca publicado — o app mostra o layout padrão."}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={discarding || (!dirty && !hasUnpublishedDraft)}
          onClick={onDiscard}
        >
          Descartar rascunho
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={saving || !dirty} onClick={onSave}>
          {saving ? "Salvando..." : "Salvar rascunho"}
        </Button>
        {isAdmin ? (
          <Button type="button" size="sm" disabled={publishing || dirty} onClick={onPublish}>
            {publishing ? "Publicando..." : "Publicar"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

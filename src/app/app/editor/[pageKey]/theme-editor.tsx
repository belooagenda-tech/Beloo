"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditorToolbar } from "../toolbar";
import { saveDraftAction, publishAction, discardDraftAction } from "../actions";
import { ImageUploadField } from "./image-upload-field";
import {
  THEME_FONT_OPTIONS,
  THEME_RADIUS_OPTIONS,
  type ThemeContent,
  type ThemeFontValue,
  type ThemeRadiusValue,
} from "@/lib/layout-editor/theme-schema";
import { deriveThemeColors } from "@/lib/layout-editor/color";
import { BACKGROUND_IMAGE_HINT } from "@/lib/layout-editor/image-hints";

const DEFAULT_PRIMARY = "#7C3AED";

export function ThemeEditor({
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
  initialDraft: ThemeContent;
  initialPublished: ThemeContent;
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
      toast.success("Tema publicado — já está no ar para todo mundo.");
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

  const derived = deriveThemeColors(form.primaryColor || DEFAULT_PRIMARY);
  const headingFont = THEME_FONT_OPTIONS.find((f) => f.value === (form.headingFont || "poppins"));
  const bodyFont = THEME_FONT_OPTIONS.find((f) => f.value === (form.bodyFont || "inter"));
  const radius = THEME_RADIUS_OPTIONS.find((r) => r.value === (form.radius || "rounded"));

  const previewStyle: CSSProperties = {
    "--primary": derived.primary,
    "--primary-strong": derived.primaryStrong,
    "--primary-foreground": "#FFFFFF",
    "--secondary": derived.secondary,
    "--secondary-foreground": derived.secondaryForeground,
    "--font-heading": headingFont?.cssVar,
    "--font-sans": bodyFont?.cssVar,
    "--radius": radius?.rem,
    fontFamily: "var(--font-sans)",
    backgroundColor: form.backgroundColor || undefined,
    backgroundImage: form.backgroundImageUrl ? `url(${JSON.stringify(form.backgroundImageUrl)})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;

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

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cor, fontes e bordas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color">Cor principal</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={form.primaryColor || DEFAULT_PRIMARY}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
                />
                <span className="text-sm text-muted-foreground">
                  {form.primaryColor || DEFAULT_PRIMARY}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usada em botões, links e destaques em todo o app.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Fonte dos títulos</Label>
              <Select
                value={form.headingFont || "poppins"}
                onValueChange={(v) => v && setForm((f) => ({ ...f, headingFont: v as ThemeFontValue }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      THEME_FONT_OPTIONS.find((o) => o.value === value)?.label ?? "Escolha..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THEME_FONT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fonte do corpo do texto</Label>
              <Select
                value={form.bodyFont || "inter"}
                onValueChange={(v) => v && setForm((f) => ({ ...f, bodyFont: v as ThemeFontValue }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      THEME_FONT_OPTIONS.find((o) => o.value === value)?.label ?? "Escolha..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THEME_FONT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Bordas (cantos)</Label>
              <Select
                value={form.radius || "rounded"}
                onValueChange={(v) => v && setForm((f) => ({ ...f, radius: v as ThemeRadiusValue }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      THEME_RADIUS_OPTIONS.find((o) => o.value === value)?.label ?? "Escolha..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THEME_RADIUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Plano de fundo do app</Label>
              <p className="text-xs text-muted-foreground">
                Cor sólida ou imagem, atrás de tudo — landing, telas internas e página pública. A
                imagem, se escolhida, tem prioridade sobre a cor.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.backgroundColor || "#FAFAFA"}
                  onChange={(e) => setForm((f) => ({ ...f, backgroundColor: e.target.value }))}
                  className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
                />
                <span className="text-sm text-muted-foreground">
                  {form.backgroundColor || "Cor padrão do tema"}
                </span>
                {form.backgroundColor ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => setForm((f) => ({ ...f, backgroundColor: undefined }))}
                  >
                    Remover cor
                  </button>
                ) : null}
              </div>
              <ImageUploadField
                pageKey={pageKey}
                url={form.backgroundImageUrl || undefined}
                onUploaded={(url) => setForm((f) => ({ ...f, backgroundImageUrl: url }))}
                hint={BACKGROUND_IMAGE_HINT}
              />
              {form.backgroundImageUrl ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => setForm((f) => ({ ...f, backgroundImageUrl: undefined }))}
                >
                  Remover imagem de fundo
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              style={previewStyle}
              className="space-y-4 rounded-[var(--radius)] border border-border bg-background p-6"
            >
              <h3
                style={{ fontFamily: "var(--font-heading)" }}
                className="text-xl font-semibold text-foreground"
              >
                Sua agenda online, do seu jeito.
              </h3>
              <p className="text-sm text-muted-foreground">
                Assim os títulos, textos e botões vão aparecer com esse tema.
              </p>
              <div className="rounded-[var(--radius)] border border-border bg-card p-4">
                <span
                  style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                >
                  Card de exemplo
                </span>
                <p className="mt-2 text-sm text-foreground">Conteúdo dentro de um card.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    borderRadius: "var(--radius)",
                  }}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Botão principal
                </button>
                <button
                  type="button"
                  style={{ borderRadius: "var(--radius)" }}
                  className="border border-border px-4 py-2 text-sm font-medium text-foreground"
                >
                  Botão secundário
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

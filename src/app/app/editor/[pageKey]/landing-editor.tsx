"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EditorToolbar } from "../toolbar";
import { saveDraftAction, publishAction, discardDraftAction } from "../actions";
import { SortableList } from "./sortable-list";
import { IconPicker } from "./icon-picker";
import { ImageUploadField } from "./image-upload-field";
import { IMAGE_BLOCK_HINT } from "@/lib/layout-editor/image-hints";
import { HeroSection } from "@/components/landing/hero-section";
import { AudienceSection, AUDIENCE_ITEM_SEED } from "@/components/landing/audience-section";
import { HowItWorksSection, HOW_IT_WORKS_ITEM_SEED } from "@/components/landing/how-it-works-section";
import { TryDemoSection } from "@/components/landing/try-demo-section";
import { FeaturesSection, FEATURES_ITEM_SEED } from "@/components/landing/features-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingImageBlock } from "@/components/landing/landing-image-block";
import {
  LANDING_SECTION_KEYS,
  type LandingContent,
  type LandingSectionKey,
  type AudienceItem,
  type StepItem,
  type FeatureItem,
} from "@/lib/layout-editor/landing-schema";
import type { IconKey } from "@/lib/layout-editor/icons";

const SECTION_LABELS: Record<LandingSectionKey, string> = {
  hero: "Topo (Hero)",
  audience: "Para quem é",
  "how-it-works": "Como funciona",
  "try-demo": "Testar demo",
  features: "Funcionalidades",
  cta: "Chamada final",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="border-b border-border py-3">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">{title}</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function LandingEditor({
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
  initialDraft: LandingContent;
  initialPublished: LandingContent;
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
      toast.success("Landing publicada — já está no ar.");
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

  const audienceItems: AudienceItem[] =
    form.audience?.items && form.audience.items.length > 0 ? form.audience.items : AUDIENCE_ITEM_SEED;
  const stepItems: StepItem[] =
    form.howItWorks?.items && form.howItWorks.items.length > 0 ? form.howItWorks.items : HOW_IT_WORKS_ITEM_SEED;
  const featureItems: FeatureItem[] =
    form.features?.items && form.features.items.length > 0 ? form.features.items : FEATURES_ITEM_SEED;

  function imageBlocksAfter(section: LandingSectionKey) {
    return (form.imageBlocks ?? [])
      .filter((block) => block.afterSection === section)
      .map((block) => <LandingImageBlock key={block.id} block={block} />);
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

      <div className="grid lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto border-r border-border p-4">
          <Section title={SECTION_LABELS.hero}>
            <Field label="Selo">
              <Input
                value={form.hero?.badge ?? ""}
                placeholder="Feito para quem trabalha com beleza"
                onChange={(e) => setForm((f) => ({ ...f, hero: { ...f.hero, badge: e.target.value } }))}
              />
            </Field>
            <Field label="Título">
              <Textarea
                rows={2}
                value={form.hero?.headline ?? ""}
                placeholder="Sua agenda online, do seu jeito."
                onChange={(e) => setForm((f) => ({ ...f, hero: { ...f.hero, headline: e.target.value } }))}
              />
            </Field>
            <Field label="Subtítulo">
              <Textarea
                rows={3}
                value={form.hero?.subtitle ?? ""}
                placeholder="Configure sua agenda, compartilhe seu link..."
                onChange={(e) => setForm((f) => ({ ...f, hero: { ...f.hero, subtitle: e.target.value } }))}
              />
            </Field>
            <Field label="Botão principal">
              <Input
                value={form.hero?.cta1Label ?? ""}
                placeholder="Criar minha agenda grátis"
                onChange={(e) => setForm((f) => ({ ...f, hero: { ...f.hero, cta1Label: e.target.value } }))}
              />
            </Field>
            <Field label="Botão secundário">
              <Input
                value={form.hero?.cta2Label ?? ""}
                placeholder="Ver como funciona"
                onChange={(e) => setForm((f) => ({ ...f, hero: { ...f.hero, cta2Label: e.target.value } }))}
              />
            </Field>
          </Section>

          <Section title={SECTION_LABELS.audience}>
            <Field label="Título">
              <Input
                value={form.audience?.title ?? ""}
                placeholder="Para quem é a Beloo"
                onChange={(e) => setForm((f) => ({ ...f, audience: { ...f.audience, title: e.target.value } }))}
              />
            </Field>
            <Field label="Subtítulo">
              <Input
                value={form.audience?.subtitle ?? ""}
                placeholder="Se você atende clientes com hora marcada..."
                onChange={(e) =>
                  setForm((f) => ({ ...f, audience: { ...f.audience, subtitle: e.target.value } }))
                }
              />
            </Field>
            <SortableList
              items={audienceItems}
              minItems={1}
              maxItems={12}
              addLabel="Adicionar público"
              onAdd={() =>
                setForm((f) => ({
                  ...f,
                  audience: {
                    ...f.audience,
                    items: [...audienceItems, { id: crypto.randomUUID(), label: "Novo público", icon: "sparkles" as IconKey }],
                  },
                }))
              }
              onChange={(items) => setForm((f) => ({ ...f, audience: { ...f.audience, items } }))}
              renderItem={(item, onChangeItem) => (
                <div className="space-y-2">
                  <Input
                    value={item.label}
                    onChange={(e) => onChangeItem({ ...item, label: e.target.value })}
                    placeholder="Nome do público"
                  />
                  <IconPicker value={item.icon} onChange={(icon) => onChangeItem({ ...item, icon })} />
                </div>
              )}
            />
          </Section>

          <Section title={SECTION_LABELS["how-it-works"]}>
            <Field label="Título">
              <Input
                value={form.howItWorks?.title ?? ""}
                placeholder="Como funciona"
                onChange={(e) =>
                  setForm((f) => ({ ...f, howItWorks: { ...f.howItWorks, title: e.target.value } }))
                }
              />
            </Field>
            <Field label="Subtítulo">
              <Input
                value={form.howItWorks?.subtitle ?? ""}
                placeholder="Três passos entre você e uma agenda cheia."
                onChange={(e) =>
                  setForm((f) => ({ ...f, howItWorks: { ...f.howItWorks, subtitle: e.target.value } }))
                }
              />
            </Field>
            <SortableList
              items={stepItems}
              minItems={1}
              maxItems={8}
              addLabel="Adicionar passo"
              onAdd={() =>
                setForm((f) => ({
                  ...f,
                  howItWorks: {
                    ...f.howItWorks,
                    items: [
                      ...stepItems,
                      { id: crypto.randomUUID(), titulo: "Novo passo", descricao: "Descreva o passo.", icon: "sparkles" as IconKey },
                    ],
                  },
                }))
              }
              onChange={(items) => setForm((f) => ({ ...f, howItWorks: { ...f.howItWorks, items } }))}
              renderItem={(item, onChangeItem) => (
                <div className="space-y-2">
                  <Input
                    value={item.titulo}
                    onChange={(e) => onChangeItem({ ...item, titulo: e.target.value })}
                    placeholder="Título do passo"
                  />
                  <Textarea
                    rows={2}
                    value={item.descricao}
                    onChange={(e) => onChangeItem({ ...item, descricao: e.target.value })}
                    placeholder="Descrição do passo"
                  />
                  <IconPicker value={item.icon} onChange={(icon) => onChangeItem({ ...item, icon })} />
                </div>
              )}
            />
          </Section>

          <Section title={SECTION_LABELS["try-demo"]}>
            <Field label="Título">
              <Input
                value={form.tryDemo?.headline ?? ""}
                placeholder="Veja como seus clientes vão agendar"
                onChange={(e) => setForm((f) => ({ ...f, tryDemo: { ...f.tryDemo, headline: e.target.value } }))}
              />
            </Field>
            <Field label="Subtítulo">
              <Textarea
                rows={3}
                value={form.tryDemo?.subtitle ?? ""}
                placeholder="Antes de criar sua conta, teste o agendamento..."
                onChange={(e) => setForm((f) => ({ ...f, tryDemo: { ...f.tryDemo, subtitle: e.target.value } }))}
              />
            </Field>
            <Field label="Texto do botão">
              <Input
                value={form.tryDemo?.buttonLabel ?? ""}
                placeholder="Testar agendamento de exemplo"
                onChange={(e) =>
                  setForm((f) => ({ ...f, tryDemo: { ...f.tryDemo, buttonLabel: e.target.value } }))
                }
              />
            </Field>
          </Section>

          <Section title={SECTION_LABELS.features}>
            <Field label="Título">
              <Input
                value={form.features?.title ?? ""}
                placeholder="Tudo que você precisa, num só lugar"
                onChange={(e) => setForm((f) => ({ ...f, features: { ...f.features, title: e.target.value } }))}
              />
            </Field>
            <Field label="Subtítulo">
              <Input
                value={form.features?.subtitle ?? ""}
                placeholder="Sem depender de vários apps e planilhas soltas."
                onChange={(e) =>
                  setForm((f) => ({ ...f, features: { ...f.features, subtitle: e.target.value } }))
                }
              />
            </Field>
            <SortableList
              items={featureItems}
              minItems={1}
              maxItems={24}
              addLabel="Adicionar funcionalidade"
              onAdd={() =>
                setForm((f) => ({
                  ...f,
                  features: {
                    ...f.features,
                    items: [
                      ...featureItems,
                      {
                        id: crypto.randomUUID(),
                        titulo: "Nova funcionalidade",
                        descricao: "Descreva a funcionalidade.",
                        icon: "sparkles" as IconKey,
                      },
                    ],
                  },
                }))
              }
              onChange={(items) => setForm((f) => ({ ...f, features: { ...f.features, items } }))}
              renderItem={(item, onChangeItem) => (
                <div className="space-y-2">
                  <Input
                    value={item.titulo}
                    onChange={(e) => onChangeItem({ ...item, titulo: e.target.value })}
                    placeholder="Título"
                  />
                  <Textarea
                    rows={2}
                    value={item.descricao}
                    onChange={(e) => onChangeItem({ ...item, descricao: e.target.value })}
                    placeholder="Descrição"
                  />
                  <IconPicker value={item.icon} onChange={(icon) => onChangeItem({ ...item, icon })} />
                </div>
              )}
            />
          </Section>

          <Section title={SECTION_LABELS.cta}>
            <Field label="Título">
              <Input
                value={form.cta?.headline ?? ""}
                placeholder="Pronta para organizar sua agenda?"
                onChange={(e) => setForm((f) => ({ ...f, cta: { ...f.cta, headline: e.target.value } }))}
              />
            </Field>
            <Field label="Subtítulo">
              <Textarea
                rows={2}
                value={form.cta?.subtitle ?? ""}
                placeholder="Crie sua agenda gratuitamente..."
                onChange={(e) => setForm((f) => ({ ...f, cta: { ...f.cta, subtitle: e.target.value } }))}
              />
            </Field>
            <Field label="Texto do botão">
              <Input
                value={form.cta?.buttonLabel ?? ""}
                placeholder="Criar minha agenda grátis"
                onChange={(e) => setForm((f) => ({ ...f, cta: { ...f.cta, buttonLabel: e.target.value } }))}
              />
            </Field>
          </Section>

          <Section title="Rodapé">
            <Field label="Frase de efeito">
              <Textarea
                rows={2}
                value={form.footer?.tagline ?? ""}
                placeholder="O jeito simples de organizar a agenda de quem trabalha com beleza."
                onChange={(e) => setForm((f) => ({ ...f, footer: { ...f.footer, tagline: e.target.value } }))}
              />
            </Field>
          </Section>

          <Section title="Blocos de imagem">
            <p className="text-xs text-muted-foreground">
              Insere uma imagem com legenda opcional entre duas seções da landing.
            </p>
            <SortableList
              items={form.imageBlocks ?? []}
              maxItems={12}
              addLabel="Adicionar bloco de imagem"
              onAdd={() =>
                setForm((f) => ({
                  ...f,
                  imageBlocks: [
                    ...(f.imageBlocks ?? []),
                    { id: crypto.randomUUID(), url: "", alt: "", afterSection: "hero" as LandingSectionKey },
                  ],
                }))
              }
              onChange={(imageBlocks) => setForm((f) => ({ ...f, imageBlocks }))}
              renderItem={(block, onChangeItem) => (
                <div className="space-y-2">
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
                  <div className="space-y-1">
                    <Label className="text-xs">Aparece depois de</Label>
                    <select
                      className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                      value={block.afterSection}
                      onChange={(e) =>
                        onChangeItem({ ...block, afterSection: e.target.value as LandingSectionKey })
                      }
                    >
                      {LANDING_SECTION_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {SECTION_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            />
          </Section>
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto bg-muted/30 p-4">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <HeroSection content={form.hero} />
            {imageBlocksAfter("hero")}
            <AudienceSection content={form.audience} />
            {imageBlocksAfter("audience")}
            <HowItWorksSection content={form.howItWorks} />
            {imageBlocksAfter("how-it-works")}
            <TryDemoSection content={form.tryDemo} />
            {imageBlocksAfter("try-demo")}
            <FeaturesSection content={form.features} />
            {imageBlocksAfter("features")}
            <CtaSection content={form.cta} />
            {imageBlocksAfter("cta")}
            <LandingFooter content={form.footer} />
          </div>
        </div>
      </div>
    </div>
  );
}

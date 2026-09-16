"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { isPageKey, type PageKey } from "@/lib/layout-editor/pages";
import { themeContentSchema } from "@/lib/layout-editor/theme-schema";
import { landingContentSchema } from "@/lib/layout-editor/landing-schema";

type ActionResult = { ok: true } | { ok: false; error: string };

// Mesmo padrão de src/app/app/admin/actions.ts: checa a role com o client
// normal (RLS/sessão) antes de usar o client admin (service role) pra
// escrever em layout_drafts.
async function requireEditor() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin && !profile?.is_layout_editor) return null;
  return profile;
}

async function requireAdmin() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) return null;
  return profile;
}

function schemaFor(pageKey: PageKey) {
  return pageKey === "global-theme" ? themeContentSchema : landingContentSchema;
}

function revalidateForPage(pageKey: PageKey) {
  if (pageKey === "global-theme") {
    // Tema vale em toda página do app (root layout) — revalida tudo que
    // pendura dele, não só "/".
    revalidatePath("/", "layout");
  } else if (pageKey === "landing") {
    revalidatePath("/");
  }
}

export async function saveDraftAction(input: {
  pageKey: string;
  content: unknown;
}): Promise<ActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: "Sem permissão." };
  if (!isPageKey(input.pageKey)) return { ok: false, error: "Página inválida." };

  const parsed = schemaFor(input.pageKey).safeParse(input.content);
  if (!parsed.success) {
    return { ok: false, error: "Não foi possível salvar: conteúdo inválido." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("layout_drafts")
    .update({
      draft_content: parsed.data,
      updated_by: editor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("page_key", input.pageKey);

  if (error) return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  return { ok: true };
}

export async function discardDraftAction(pageKeyInput: string): Promise<ActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: "Sem permissão." };
  if (!isPageKey(pageKeyInput)) return { ok: false, error: "Página inválida." };

  const supabase = createAdminClient();
  const { data: current, error: fetchError } = await supabase
    .from("layout_drafts")
    .select("published_content")
    .eq("page_key", pageKeyInput)
    .maybeSingle();

  if (fetchError || !current) return { ok: false, error: "Não foi possível descartar. Tente novamente." };

  const { error } = await supabase
    .from("layout_drafts")
    .update({
      draft_content: current.published_content,
      updated_by: editor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("page_key", pageKeyInput);

  if (error) return { ok: false, error: "Não foi possível descartar. Tente novamente." };
  return { ok: true };
}

// Só admin publica — revisão manual antes de ir ao ar para todo mundo.
export async function publishAction(pageKeyInput: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Só o admin pode publicar." };
  if (!isPageKey(pageKeyInput)) return { ok: false, error: "Página inválida." };

  const supabase = createAdminClient();
  const { data: current, error: fetchError } = await supabase
    .from("layout_drafts")
    .select("draft_content")
    .eq("page_key", pageKeyInput)
    .maybeSingle();

  if (fetchError || !current) return { ok: false, error: "Não foi possível publicar. Tente novamente." };

  const { error } = await supabase
    .from("layout_drafts")
    .update({
      published_content: current.draft_content,
      published_by: admin.id,
      published_at: new Date().toISOString(),
    })
    .eq("page_key", pageKeyInput);

  if (error) return { ok: false, error: "Não foi possível publicar. Tente novamente." };

  revalidateForPage(pageKeyInput);
  return { ok: true };
}

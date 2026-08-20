"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listImportableGoogleEvents,
  importGoogleEventsAsBlocks,
  type ListImportableEventsResult,
  type ImportGoogleEventsResult,
} from "@/lib/google-calendar/sync";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getOwnBusinessId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  return business?.id ?? null;
}

export async function disconnectGoogleCalendarAction(): Promise<ActionResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  await admin.from("google_calendar_connections").delete().eq("business_id", businessId);

  return { ok: true };
}

export async function toggleGoogleCalendarExportAction(enabled: boolean): Promise<ActionResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("google_calendar_connections")
    .update({ export_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  return { ok: true };
}

export async function listGoogleCalendarEventsAction(): Promise<ListImportableEventsResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  return listImportableGoogleEvents(admin, businessId);
}

export async function importGoogleCalendarEventsAction(
  eventIds: string[],
): Promise<ImportGoogleEventsResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return { ok: false, error: "Escolha ao menos um agendamento para importar." };
  }
  if (eventIds.length > 200 || eventIds.some((id) => typeof id !== "string" || id.length === 0)) {
    return { ok: false, error: "Seleção inválida." };
  }

  const admin = createAdminClient();
  return importGoogleEventsAsBlocks(admin, businessId, eventIds);
}

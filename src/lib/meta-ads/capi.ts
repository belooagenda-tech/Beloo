import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { getMetaAdsSettings, type ResolvedMetaAdsSettings } from "./settings";
import { hashEmailForMeta, hashPhoneForMeta } from "./hash";
import { logError } from "@/lib/logger";

type Admin = SupabaseClient<Database>;

const GRAPH_API_VERSION = "v21.0";

// Dados do usuário associado ao negócio, usados pra montar `user_data` nos
// eventos server-side (Subscribe/CancelSubscription, disparados por webhook —
// sem request do navegador, então sem IP/user-agent pra oferecer). fbc/fbp
// vêm de businesses.meta_fbc/meta_fbp, salvos no cadastro (ver
// criar-agenda/meta-ads-actions.ts); email/telefone vêm do profile.
export type MetaUserData = {
  email: string | null;
  phone: string | null;
  fbc: string | null;
  fbp: string | null;
};

export async function getMetaUserDataForBusiness(admin: Admin, businessId: string): Promise<MetaUserData> {
  const { data: business } = await admin
    .from("businesses")
    .select("profile_id, meta_fbc, meta_fbp")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return { email: null, phone: null, fbc: null, fbp: null };

  const { data: profile } = await admin
    .from("profiles")
    .select("email, telefone")
    .eq("id", business.profile_id)
    .maybeSingle();

  return {
    email: profile?.email ?? null,
    phone: profile?.telefone ?? null,
    fbc: business.meta_fbc,
    fbp: business.meta_fbp,
  };
}

type MetaEvent = {
  eventName: string;
  eventId: string;
  actionSource: "website" | "system_generated";
  eventSourceUrl?: string;
  userData: MetaUserData;
  customData?: Record<string, unknown>;
  // Nome gravado em meta_ads_events_log — igual a eventName, exceto nos
  // disparos manuais de teste (ver sendTestEvent), onde ganha um sufixo pra
  // não se confundir com conversão real no painel do admin.
  logLabel?: string;
};

function buildUserDataPayload(userData: MetaUserData) {
  const payload: Record<string, string[]> = {};
  if (userData.email) payload.em = [hashEmailForMeta(userData.email)];
  if (userData.phone) payload.ph = [hashPhoneForMeta(userData.phone)];
  if (userData.fbc) payload.fbc = [userData.fbc];
  if (userData.fbp) payload.fbp = [userData.fbp];
  return payload;
}

async function logEvent(
  admin: Admin,
  input: {
    eventName: string;
    eventId: string;
    businessId: string | null;
    status: "success" | "error";
    statusCode: number | null;
    errorMessage: string | null;
  },
) {
  try {
    await admin.from("meta_ads_events_log").insert({
      event_name: input.eventName,
      event_id: input.eventId,
      business_id: input.businessId,
      status: input.status,
      status_code: input.statusCode,
      error_message: input.errorMessage,
    });
  } catch (err) {
    // Puramente informativo — nunca deixa o log quebrar o disparo do evento.
    console.error("Beloo: falha ao gravar meta_ads_events_log", err);
  }
}

// Faz o POST de verdade pra Conversions API e grava o log — sem nenhuma
// checagem de "rastreamento ligado" (isso é responsabilidade de quem chama:
// sendEvents, pro fluxo real; sendTestEvent, pro botão de teste do admin).
async function postEventsToGraph(
  events: MetaEvent[],
  businessId: string | null,
  settings: ResolvedMetaAdsSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  if (!settings.pixelId || !settings.accessToken) {
    return { ok: false, error: "Pixel ID ou Access Token não configurados." };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${settings.pixelId}/events?access_token=${encodeURIComponent(settings.accessToken)}`;

  const body: Record<string, unknown> = {
    data: events.map((event) => ({
      event_name: event.eventName,
      event_id: event.eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: event.actionSource,
      ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
      user_data: buildUserDataPayload(event.userData),
      ...(event.customData ? { custom_data: event.customData } : {}),
    })),
  };
  if (settings.testEventCode) {
    body.test_event_code = settings.testEventCode;
  }

  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    statusCode = response.status;
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      errorMessage = errorBody?.error?.message ?? response.statusText;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const status = errorMessage ? "error" : "success";

  await Promise.all(
    events.map((event) =>
      logEvent(admin, {
        eventName: event.logLabel ?? event.eventName,
        eventId: event.eventId,
        businessId,
        status,
        statusCode,
        errorMessage,
      }),
    ),
  );

  return errorMessage ? { ok: false, error: errorMessage } : { ok: true };
}

function eventsForKind(
  kind: "signup" | "subscribe" | "cancel",
  userData: MetaUserData,
  value: number,
  ids: { a: string; b: string },
  labelSuffix?: string,
): MetaEvent[] {
  const suffix = (name: string) => (labelSuffix ? `${name} ${labelSuffix}` : name);
  if (kind === "signup") {
    return [
      {
        eventName: "CompleteRegistration",
        eventId: ids.a,
        actionSource: "website",
        userData,
        logLabel: suffix("CompleteRegistration"),
      },
      {
        eventName: "StartTrial",
        eventId: ids.b,
        actionSource: "website",
        userData,
        logLabel: suffix("StartTrial"),
      },
    ];
  }
  if (kind === "subscribe") {
    return [
      {
        eventName: "Subscribe",
        eventId: ids.a,
        actionSource: "system_generated",
        userData,
        customData: { value, currency: "BRL" },
        logLabel: suffix("Subscribe"),
      },
    ];
  }
  return [
    {
      eventName: "CancelSubscription",
      eventId: ids.a,
      actionSource: "system_generated",
      userData,
      logLabel: suffix("CancelSubscription"),
    },
  ];
}

// Manda 1+ eventos pra Conversions API num único POST (o Meta aceita um
// array em `data`). Nunca lança: falha de rede/config é logada (console +
// meta_ads_events_log) e engolida — conversão de anúncio não pode derrubar
// cadastro, webhook de pagamento nem cancelamento. Só dispara de verdade se
// o rastreamento estiver ligado em /app/admin/anuncios (ver sendTestEvent
// pra testar sem precisar ligar isso pra todo mundo).
async function sendEvents(events: MetaEvent[], businessId: string | null): Promise<void> {
  const settings = await getMetaAdsSettings();
  if (!settings.trackingEnabled || !settings.pixelId || !settings.accessToken) return;

  const result = await postEventsToGraph(events, businessId, settings);
  if (!result.ok) {
    logError("meta_ads.capi.send", new Error(result.error), {
      businessId,
      events: events.map((e) => e.eventName),
    });
  }
}

// CompleteRegistration + StartTrial — disparados juntos, no momento em que o
// negócio é criado no wizard (ver criar-agenda/meta-ads-actions.ts), que é
// exatamente quando o trial começa (trigger em saas_subscriptions).
export async function sendCompleteRegistrationAndStartTrial(input: {
  businessId: string;
  completeRegistrationEventId: string;
  startTrialEventId: string;
  userData: MetaUserData;
}): Promise<void> {
  await sendEvents(
    eventsForKind("signup", input.userData, 0, { a: input.completeRegistrationEventId, b: input.startTrialEventId }),
    input.businessId,
  );
}

// Subscribe — trial virou assinatura paga de verdade (primeira cobrança
// confirmada). Sempre 100% server-side: acontece via webhook do gateway de
// pagamento, sem o usuário no navegador.
export async function sendSubscribeEvent(input: {
  businessId: string;
  eventId: string;
  value: number;
  userData: MetaUserData;
}): Promise<void> {
  await sendEvents(
    eventsForKind("subscribe", input.userData, input.value, { a: input.eventId, b: "" }),
    input.businessId,
  );
}

// CancelSubscription — evento customizado, só pra análise de funil (não
// afeta otimização de anúncio no Meta).
export async function sendCancelSubscriptionEvent(input: {
  businessId: string;
  eventId: string;
  userData: MetaUserData;
}): Promise<void> {
  await sendEvents(
    eventsForKind("cancel", input.userData, 0, { a: input.eventId, b: "" }),
    input.businessId,
  );
}

// ============================================================================
// Disparo manual de teste — botões em /app/admin/anuncios. Ao contrário de
// sendEvents acima, IGNORA o toggle "Rastreamento ativo" (dá pra validar a
// integração antes de ligar pra usuários de verdade) mas EXIGE um Test Event
// Code configurado — assim nunca acontece de um clique de teste virar tráfego
// real contando pra otimização de anúncio no Meta (eventos com
// test_event_code não entram nessa conta).
// ============================================================================
export async function sendTestEvent(input: {
  kind: "signup" | "subscribe" | "cancel";
  userData: MetaUserData;
  value?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings = await getMetaAdsSettings();

  if (!settings.pixelId || !settings.hasAccessToken) {
    return { ok: false, error: "Preencha e salve o Pixel ID e o Access Token antes de testar." };
  }
  if (!settings.testEventCode) {
    return {
      ok: false,
      error: "Preencha e salve o Test Event Code antes de testar (Events Manager > aba Testar eventos).",
    };
  }

  const events = eventsForKind(
    input.kind,
    input.userData,
    input.value ?? 0,
    { a: randomUUID(), b: randomUUID() },
    "(teste manual)",
  );

  return postEventsToGraph(events, null, settings);
}

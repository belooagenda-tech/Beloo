import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyProfessional } from "@/lib/push/notify";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function runExpireEntradas(admin: ReturnType<typeof createAdminClient>, now: Date) {
  // Faxina de logs antigos (error_logs) — não precisa rodar a cada 15min
  // junto com o resto deste cron, então só dispara 1x por dia (na primeira
  // execução depois da meia-noite UTC).
  if (now.getUTCHours() === 3) {
    const { error: cleanupError } = await admin.rpc("cleanup_old_error_logs");
    if (cleanupError) {
      logError("cron.expire_entradas.cleanup_logs", cleanupError);
    }

    const { error: cleanupMetaAdsError } = await admin.rpc("cleanup_old_meta_ads_events_log");
    if (cleanupMetaAdsError) {
      logError("cron.expire_entradas.cleanup_meta_ads_events_log", cleanupMetaAdsError);
    }
  }

  const { data: expirados } = await admin
    .from("appointments")
    .update({ status: "cancelado", entrada_status: "expirado" })
    .eq("status", "aguardando_pagamento")
    .lt("entrada_expira_em", now.toISOString())
    .select("id, business_id, client_id, service_id");

  for (const appointment of expirados ?? []) {
    try {
      const [{ data: business }, { data: client }, { data: service }] = await Promise.all([
        admin.from("businesses").select("profile_id").eq("id", appointment.business_id).maybeSingle(),
        admin.from("clients").select("nome").eq("id", appointment.client_id).maybeSingle(),
        admin.from("services").select("nome").eq("id", appointment.service_id).maybeSingle(),
      ]);
      if (!business) continue;

      await notifyProfessional(admin, {
        profileId: business.profile_id,
        tipo: "cancelamento",
        titulo: "Horário liberado",
        corpo: `${client?.nome ?? "Um cliente"} não concluiu o pagamento da entrada de ${service?.nome ?? "um atendimento"} a tempo — o horário foi liberado.`,
        appointmentId: appointment.id,
        url: "/app/agenda",
      });
    } catch (err) {
      logError("cron.expire_entradas.notificar", err, { appointmentId: appointment.id });
    }
  }

  return expirados?.length ?? 0;
}

export async function GET(request: Request) {
  // Fail-closed: sem CRON_SECRET configurado, a rota nunca roda (achado 🟠
  // da auditoria de 2026-08-07).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Beloo: CRON_SECRET não configurado — recusando /api/cron/expire-entradas");
    return new NextResponse("Not configured", { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const expirados = await runExpireEntradas(admin, new Date());

  return NextResponse.json({ ok: true, expirados });
}

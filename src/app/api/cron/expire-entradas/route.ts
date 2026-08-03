import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyProfessional } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: expirados } = await admin
    .from("appointments")
    .update({ status: "cancelado", entrada_status: "expirado" })
    .eq("status", "aguardando_pagamento")
    .lt("entrada_expira_em", now)
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
      console.error("Beloo: falha ao notificar expiração de entrada", appointment.id, err);
    }
  }

  return NextResponse.json({ ok: true, expirados: expirados?.length ?? 0 });
}

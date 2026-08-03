import { NextResponse } from "next/server";
import { addDays, addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToClient } from "@/lib/push/send-push";
import { notifyProfessional } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

const CLIENT_REMINDER_HOURS_BEFORE = 2;
const PROFESSIONAL_DAY_START_REMINDER_HOURS_BEFORE = 1;

async function sendClientReminders(admin: ReturnType<typeof createAdminClient>, now: Date) {
  const windowEnd = addHours(now, CLIENT_REMINDER_HOURS_BEFORE);

  const { data: upcoming } = await admin
    .from("appointments")
    .select("id, business_id, client_id, service_id, inicio")
    .in("status", ["agendado", "confirmado"])
    .is("client_reminder_sent_at", null)
    .gte("inicio", now.toISOString())
    .lte("inicio", windowEnd.toISOString());

  if (!upcoming || upcoming.length === 0) return 0;

  const businessIds = [...new Set(upcoming.map((a) => a.business_id))];
  const serviceIds = [...new Set(upcoming.map((a) => a.service_id))];

  const [{ data: businesses }, { data: services }] = await Promise.all([
    admin.from("businesses").select("id, nome_loja, timezone").in("id", businessIds),
    admin.from("services").select("id, nome").in("id", serviceIds),
  ]);

  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));
  const serviceById = new Map((services ?? []).map((s) => [s.id, s]));

  let enviados = 0;

  for (const appointment of upcoming) {
    const business = businessById.get(appointment.business_id);
    const service = serviceById.get(appointment.service_id);
    if (!business || !service) continue;

    const horario = formatInTimeZone(new Date(appointment.inicio), business.timezone, "HH:mm");

    try {
      await sendPushToClient(admin, appointment.client_id, {
        title: "Lembrete de agendamento",
        body: `${service.nome} com ${business.nome_loja} hoje às ${horario}.`,
        tag: "lembrete_cliente",
      });
    } catch {
      // segue para marcar como enviado mesmo assim - não vamos tentar de novo
      // a cada execução do cron por causa de uma falha pontual de envio.
    }

    await admin
      .from("appointments")
      .update({ client_reminder_sent_at: now.toISOString() })
      .eq("id", appointment.id);
    enviados++;
  }

  return enviados;
}

async function sendProfessionalDayStartReminders(admin: ReturnType<typeof createAdminClient>, now: Date) {
  const { data: businesses } = await admin.from("businesses").select("id, profile_id, timezone");
  if (!businesses || businesses.length === 0) return 0;

  let enviados = 0;

  for (const business of businesses) {
    const hojeStr = formatInTimeZone(now, business.timezone, "yyyy-MM-dd");
    const inicioDoDia = fromZonedTime(`${hojeStr}T00:00:00`, business.timezone);
    const fimDoDia = addDays(inicioDoDia, 1);

    const { data: primeiroAgendamento } = await admin
      .from("appointments")
      .select("id, inicio")
      .eq("business_id", business.id)
      .neq("status", "cancelado")
      .gte("inicio", inicioDoDia.toISOString())
      .lt("inicio", fimDoDia.toISOString())
      .order("inicio", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!primeiroAgendamento) continue;

    const inicioPrimeiro = new Date(primeiroAgendamento.inicio);
    const janela = addHours(now, PROFESSIONAL_DAY_START_REMINDER_HOURS_BEFORE);
    if (inicioPrimeiro < now || inicioPrimeiro > janela) continue;

    const { data: jaEnviado } = await admin
      .from("notifications")
      .select("id")
      .eq("profile_id", business.profile_id)
      .eq("tipo", "lembrete_dia")
      .gte("created_at", inicioDoDia.toISOString())
      .maybeSingle();

    if (jaEnviado) continue;

    const horario = formatInTimeZone(inicioPrimeiro, business.timezone, "HH:mm");
    try {
      await notifyProfessional(admin, {
        profileId: business.profile_id,
        tipo: "lembrete_dia",
        titulo: "Seu dia começa em breve",
        corpo: `Seu primeiro atendimento hoje é às ${horario}.`,
        url: "/app/agenda",
      });
    } catch (err) {
      // Uma falha pontual (ex.: push de um profissional) não pode abortar
      // o loop e deixar os demais negócios sem lembrete nesse ciclo do cron.
      console.error("Beloo: falha ao enviar lembrete de início de dia", business.id, err);
      continue;
    }
    enviados++;
  }

  return enviados;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date();

  const [lembretesCliente, lembretesProfissional] = await Promise.all([
    sendClientReminders(admin, now),
    sendProfessionalDayStartReminders(admin, now),
  ]);

  return NextResponse.json({ ok: true, lembretesCliente, lembretesProfissional });
}

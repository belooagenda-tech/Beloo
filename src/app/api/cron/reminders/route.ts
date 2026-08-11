import { NextResponse } from "next/server";
import { addDays, addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToClient } from "@/lib/push/send-push";
import { notifyProfessional } from "@/lib/push/notify";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Esse cron roda via GitHub Actions (.github/workflows/reminders-cron.yml,
// schedule "*/15 * * * *"), não via Vercel Cron — confirmado rodando com
// sucesso a cada ~15-30min. GitHub documenta que workflows agendados podem
// atrasar sob carga alta da plataforma (às vezes o intervalo real chega a
// algumas horas); a janela aqui tem uma margem de segurança sobre o "2h/1h
// antes" ideal pra não perder ninguém num desses atrasos raros — quem
// garante "1 lembrete só" de verdade é client_reminder_sent_at / "já
// enviado hoje", não o tamanho da janela.
const CLIENT_REMINDER_HOURS_BEFORE = 4;
const PROFESSIONAL_DAY_START_REMINDER_HOURS_BEFORE = 3;

export async function sendClientReminders(admin: ReturnType<typeof createAdminClient>, now: Date) {
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

  // IDs marcados ao final, num único UPDATE em lote — antes eram N updates
  // sequenciais (1 por agendamento). Em volume alto de negócios/agendamentos
  // simultâneos isso reduz bastante o tempo total do cron (achado 🟠 da
  // auditoria de 2026-08-07: crons não foram desenhados para escalar via
  // loop com 1 query por linha).
  const idsProcessados: string[] = [];

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

    idsProcessados.push(appointment.id);
  }

  if (idsProcessados.length > 0) {
    await admin
      .from("appointments")
      .update({ client_reminder_sent_at: now.toISOString() })
      .in("id", idsProcessados);
  }

  return idsProcessados.length;
}

export async function sendProfessionalDayStartReminders(admin: ReturnType<typeof createAdminClient>, now: Date) {
  const { data: businesses } = await admin.from("businesses").select("id, profile_id, timezone");
  if (!businesses || businesses.length === 0) return 0;

  // Uma única query para "lembrete_dia já enviado" de todos os negócios, em
  // vez de 1 consulta por negócio dentro do loop (achado 🟠 da auditoria de
  // 2026-08-07 — reduz pela metade os round-trips ao banco nesse cron). A
  // janela de 24h é generosa o bastante para cobrir o início do dia de
  // qualquer timezone suportado; o filtro exato por negócio continua sendo
  // feito em memória, comparando com o `inicioDoDia` de cada um.
  const profileIds = businesses.map((b) => b.profile_id);
  const { data: lembretesRecentes } = await admin
    .from("notifications")
    .select("profile_id, created_at")
    .in("profile_id", profileIds)
    .eq("tipo", "lembrete_dia")
    .gte("created_at", addHours(now, -24).toISOString());

  const enviadosPorPerfil = new Map<string, Date[]>();
  for (const n of lembretesRecentes ?? []) {
    const lista = enviadosPorPerfil.get(n.profile_id) ?? [];
    lista.push(new Date(n.created_at));
    enviadosPorPerfil.set(n.profile_id, lista);
  }

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

    const jaEnviadoHoje = (enviadosPorPerfil.get(business.profile_id) ?? []).some(
      (criadoEm) => criadoEm >= inicioDoDia,
    );
    if (jaEnviadoHoje) continue;

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
      logError("cron.reminders.lembrete_dia", err, { businessId: business.id });
      continue;
    }
    enviados++;
  }

  return enviados;
}

export async function GET(request: Request) {
  // Fail-closed: sem CRON_SECRET configurado, a rota nunca roda — evita que
  // uma env var esquecida deixe o endpoint público sem autenticação
  // (achado 🟠 da auditoria de 2026-08-07).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Beloo: CRON_SECRET não configurado — recusando /api/cron/reminders");
    return new NextResponse("Not configured", { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const [lembretesCliente, lembretesProfissional] = await Promise.all([
    sendClientReminders(admin, now),
    sendProfessionalDayStartReminders(admin, now),
  ]);

  return NextResponse.json({ ok: true, lembretesCliente, lembretesProfissional });
}

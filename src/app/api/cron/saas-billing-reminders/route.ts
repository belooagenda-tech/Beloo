import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyProfessional } from "@/lib/push/notify";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Quantos dias antes do vencimento (inclusive o próprio dia, 0) a contagem
// regressiva é notificada. Pedido do dono: 3, 2, 1 dias e "vence hoje".
const DIAS_AVISO = [3, 2, 1, 0];

// Diferença em dias de calendário entre `targetISO` e `now`, calculada no
// fuso do negócio — evita que "faltam 3 dias" vire "faltam 2" só por causa
// da diferença de horário dentro do mesmo dia civil.
function diasRestantes(targetISO: string, timezone: string, now: Date): number {
  const hojeStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const alvoStr = formatInTimeZone(new Date(targetISO), timezone, "yyyy-MM-dd");
  const hoje = Date.parse(`${hojeStr}T00:00:00Z`);
  const alvo = Date.parse(`${alvoStr}T00:00:00Z`);
  return Math.round((alvo - hoje) / 86_400_000);
}

function mensagem(dias: number, contexto: "trial" | "renovacao") {
  if (dias === 0) {
    return {
      titulo: "Sua assinatura vence hoje",
      corpo:
        contexto === "trial"
          ? "Seu teste grátis da Beloo termina hoje. Assine para não perder o acesso — sua conta será bloqueada."
          : "Sua assinatura da Beloo vence hoje e não há cartão configurado para renovação automática. Assine de novo para não perder o acesso — sua conta será bloqueada.",
    };
  }
  const plural = dias === 1 ? "dia" : "dias";
  return {
    titulo: `Faltam ${dias} ${plural} para sua assinatura vencer`,
    corpo:
      contexto === "trial"
        ? `Seu teste grátis da Beloo termina em ${dias} ${plural}. Assine para continuar usando sem interrupção.`
        : `Sua assinatura da Beloo vence em ${dias} ${plural} e não há cartão configurado para renovação automática. Assine de novo para não perder o acesso.`,
  };
}

export async function runSaasBillingReminders(admin: ReturnType<typeof createAdminClient>, now: Date) {
  const { data: plan } = await admin.from("saas_plans").select("billing_enabled").limit(1).maybeSingle();
  // Cobrança desligada: trial_ends_at/current_period_end não valem nada
  // ainda (ninguém é bloqueado), então não faz sentido avisar de vencimento.
  if (!plan?.billing_enabled) {
    return { avisados: 0, motivo: "billing_desativado" };
  }

  const { data: subs } = await admin
    .from("saas_subscriptions")
    .select("id, business_id, status, trial_ends_at, current_period_end, mp_preapproval_status")
    .in("status", ["trial", "ativo"]);
  if (!subs || subs.length === 0) {
    return { avisados: 0 };
  }

  const businessIds = subs.map((s) => s.business_id);
  const [{ data: businesses }, { data: assinaturasStripe }] = await Promise.all([
    admin.from("businesses").select("id, profile_id, timezone").in("id", businessIds),
    admin.from("assinaturas_stripe").select("profissional_id").in("profissional_id", businessIds),
  ]);
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));
  const temStripeAtivo = new Set((assinaturasStripe ?? []).map((a) => a.profissional_id));

  // Já avisado hoje? Uma única query pra todos os negócios (mesmo padrão do
  // cron de lembretes: evita 1 SELECT por negócio dentro do loop).
  const profileIds = (businesses ?? []).map((b) => b.profile_id);
  const { data: avisosRecentes } = await admin
    .from("notifications")
    .select("profile_id, created_at")
    .in("profile_id", profileIds)
    .eq("tipo", "assinatura_expirando")
    .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  const avisadoHojePorPerfil = new Map<string, Date[]>();
  for (const n of avisosRecentes ?? []) {
    const lista = avisadoHojePorPerfil.get(n.profile_id) ?? [];
    lista.push(new Date(n.created_at));
    avisadoHojePorPerfil.set(n.profile_id, lista);
  }

  let avisados = 0;

  for (const sub of subs) {
    const business = businessById.get(sub.business_id);
    if (!business) continue;

    const emTrial = sub.status === "trial";
    const dataAlvo = emTrial ? sub.trial_ends_at : sub.current_period_end;
    if (!dataAlvo) continue;

    // Trial sempre avisa (ainda não tem cobrança nenhuma configurada). Já
    // assinado ("ativo") só avisa se NÃO houver cartão de débito automático
    // configurado — Stripe (assinatura ativa registrada) ou Mercado Pago
    // (preapproval autorizado) renovam sozinhos, sem risco de bloqueio.
    if (!emTrial) {
      const temDebitoAutomatico =
        temStripeAtivo.has(sub.business_id) || sub.mp_preapproval_status === "authorized";
      if (temDebitoAutomatico) continue;
    }

    const dias = diasRestantes(dataAlvo, business.timezone, now);
    if (!DIAS_AVISO.includes(dias)) continue;

    const hojeStr = formatInTimeZone(now, business.timezone, "yyyy-MM-dd");
    const inicioDoDia = Date.parse(`${hojeStr}T00:00:00Z`);
    const jaAvisadoHoje = (avisadoHojePorPerfil.get(business.profile_id) ?? []).some(
      (criadoEm) => criadoEm.getTime() >= inicioDoDia,
    );
    if (jaAvisadoHoje) continue;

    const { titulo, corpo } = mensagem(dias, emTrial ? "trial" : "renovacao");
    try {
      await notifyProfessional(admin, {
        profileId: business.profile_id,
        tipo: "assinatura_expirando",
        titulo,
        corpo,
        url: "/app/assinatura",
      });
      avisados++;
    } catch (err) {
      logError("cron.saas_billing_reminders.notificar", err, { businessId: sub.business_id });
    }
  }

  return { avisados };
}

export async function GET(request: Request) {
  // Fail-closed: sem CRON_SECRET configurado, a rota nunca roda (mesmo
  // padrão dos outros crons — achado 🟠 da auditoria de 2026-08-07).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Beloo: CRON_SECRET não configurado — recusando /api/cron/saas-billing-reminders");
    return new NextResponse("Not configured", { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const resultado = await runSaasBillingReminders(admin, new Date());

  return NextResponse.json({ ok: true, ...resultado });
}

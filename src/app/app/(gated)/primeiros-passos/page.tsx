import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/app-shell/copy-link-button";
import { OnboardingStepCard } from "./onboarding-step-card";
import { PushNotificationsCard } from "../configuracoes/push-notifications-card";

export const metadata: Metadata = { title: "Primeiros passos" };

export default async function PrimeirosPassosPage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();
  const profile = await getOwnProfile();

  const [
    { count: servicesCount },
    { count: hoursCount },
    { count: professionalsCount },
    { data: mpConnection },
    { count: appointmentsCount },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business!.id)
      .eq("ativo", true),
    supabase.from("business_hours").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("professionals").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("mp_connections").select("business_id").eq("business_id", business!.id).maybeSingle(),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
  ]);

  const lojaConfigurada = Boolean(business!.categoria);
  const temServicos = (servicesCount ?? 0) > 0;
  const temDisponibilidade = (hoursCount ?? 0) > 0;
  const temEquipe = (professionalsCount ?? 0) > 0;
  const temMercadoPago = Boolean(mpConnection);
  const temAgendamento = (appointmentsCount ?? 0) > 0;

  // Só os passos essenciais entram na barra de progresso — os opcionais
  // (equipe, Mercado Pago) não deixam ninguém "parado em 80%" só por não
  // ter uma equipe ou não querer cobrar entrada.
  const passosEssenciais = [lojaConfigurada, temServicos, temDisponibilidade, temAgendamento];
  const concluidos = passosEssenciais.filter(Boolean).length;
  const progresso = Math.round((concluidos / passosEssenciais.length) * 100);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const linkAgendamento = `${siteUrl}/${business!.slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Primeiros passos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Um guia rápido pra deixar sua agenda pronta pra receber clientes. Volte aqui sempre que
          quiser — os passos ficam marcados conforme você avança.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {concluidos} de {passosEssenciais.length} passos concluídos
            </span>
            <span className="text-muted-foreground">{progresso}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <OnboardingStepCard
        titulo="Configure sua loja"
        descricao="Nome, categoria e logo — é o que seus clientes veem primeiro ao abrir sua página de agendamento."
        concluido={lojaConfigurada}
        href="/app/configuracoes"
        cta="Ir para Configurações"
      />

      <OnboardingStepCard
        titulo="Cadastre seus serviços"
        descricao="O que você oferece, com duração e preço — é isso que define os horários que aparecem pro cliente escolher."
        concluido={temServicos}
        href="/app/servicos"
        cta="Ir para Serviços"
      />

      <OnboardingStepCard
        titulo="Defina sua disponibilidade"
        descricao="Os dias e horários em que você atende. Sem isso configurado, ninguém consegue marcar horário com você."
        concluido={temDisponibilidade}
        href="/app/disponibilidade"
        cta="Ir para Disponibilidade"
      />

      <OnboardingStepCard
        titulo="Monte sua equipe"
        descricao="Tem mais gente atendendo com você? Cadastre cada profissional, o que cada um faz e, se precisar, o horário próprio dele."
        concluido={temEquipe}
        opcional
        href="/app/equipe"
        cta="Ir para Equipe"
      />

      <OnboardingStepCard
        titulo="Conecte o Mercado Pago"
        descricao="Cobre uma entrada na hora do agendamento pra reduzir falta de clientes. Totalmente opcional."
        concluido={temMercadoPago}
        opcional
        href="/app/configuracoes"
        cta="Ir para Configurações"
      />

      <Card>
        <CardContent className="space-y-2 py-4">
          <p className="text-sm font-medium text-foreground">Compartilhe seu link de agendamento</p>
          <p className="text-sm text-muted-foreground">
            Envie esse link pros seus clientes, coloque na bio das redes sociais ou gere um QR
            Code em Configurações.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 truncate rounded-md bg-muted px-2 py-1.5 text-sm text-foreground">
              {linkAgendamento}
            </code>
            <CopyLinkButton url={linkAgendamento} />
          </div>
        </CardContent>
      </Card>

      <PushNotificationsCard profileId={profile!.id} />

      <OnboardingStepCard
        titulo="Receba seu primeiro agendamento"
        descricao="Assim que um cliente marcar horário pelo seu link, ele aparece na Agenda — é o sinal de que está tudo funcionando."
        concluido={temAgendamento}
        href="/app/agenda"
        cta="Ir para Agenda"
      />
    </div>
  );
}

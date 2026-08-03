import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientProfile } from "./client-profile";
import type { ActivePlan } from "./types";

const getClientAndBusiness = cache(async (id: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("profile_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("clients")
    .select("id, nome, telefone, observacoes, criado_em")
    .eq("id", id)
    .eq("business_id", business!.id)
    .maybeSingle();

  return { business, client };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { client } = await getClientAndBusiness(id);
  if (!client) notFound();

  return { title: client.nome };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { business, client } = await getClientAndBusiness(id);

  if (!client) notFound();

  const [{ data: services }, { data: appointments }, { data: sub }, { data: availablePlans }] =
    await Promise.all([
      supabase.from("services").select("id, nome").eq("business_id", business!.id),
      supabase
        .from("appointments")
        .select("id, service_id, inicio, fim, status")
        .eq("client_id", client.id)
        .order("inicio", { ascending: false }),
      supabase
        .from("client_plan_subs")
        .select("id, plan_id, data_renovacao, creditos_usados")
        .eq("client_id", client.id)
        .eq("ativo", true)
        .maybeSingle(),
      supabase
        .from("client_plans")
        .select("id, nome, valor_mensal, ciclo_dias")
        .eq("business_id", business!.id)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

  const appointmentIds = (appointments ?? []).map((a) => a.id);
  const { data: payments } =
    appointmentIds.length > 0
      ? await supabase
          .from("appointment_payments")
          .select("appointment_id, valor, forma_pagamento, origem")
          .in("appointment_id", appointmentIds)
      : { data: [] };

  let activePlan: ActivePlan | null = null;
  if (sub) {
    const { data: plan } = await supabase
      .from("client_plans")
      .select("nome, ciclo_dias, servicos_inclusos")
      .eq("id", sub.plan_id)
      .maybeSingle();

    if (plan) {
      const servicesById = new Map((services ?? []).map((s) => [s.id, s.nome]));
      activePlan = {
        subId: sub.id,
        planNome: plan.nome,
        dataRenovacao: sub.data_renovacao,
        cicloDias: plan.ciclo_dias,
        itens: plan.servicos_inclusos.map((item) => ({
          serviceId: item.service_id,
          serviceNome: servicesById.get(item.service_id) ?? "Serviço removido",
          usados: sub.creditos_usados[item.service_id] ?? 0,
          limite: item.quantidade,
        })),
      };
    }
  }

  const totalGastoAvulso = (payments ?? [])
    .filter((p) => p.origem === "avulso")
    .reduce((acc, p) => acc + p.valor, 0);
  const visitasConcluidas = (appointments ?? []).filter((a) => a.status === "concluido");
  const totalVisitas = visitasConcluidas.length;
  const ultimaVisita = visitasConcluidas[0]?.inicio ?? null;

  return (
    <ClientProfile
      client={client}
      timezone={business!.timezone}
      services={services ?? []}
      appointments={appointments ?? []}
      payments={payments ?? []}
      activePlan={activePlan}
      availablePlans={availablePlans ?? []}
      totalGastoAvulso={totalGastoAvulso}
      totalVisitas={totalVisitas}
      ultimaVisita={ultimaVisita}
    />
  );
}

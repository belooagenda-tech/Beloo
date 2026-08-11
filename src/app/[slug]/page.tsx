import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingFlow } from "./public-booking-flow";

// Dados de negócio/serviços/planos mudam pouco e essa é a página pública
// mais visitada do produto — cachear por 30s tira carga do Supabase sem
// impacto perceptível para quem edita o catálogo (achado 🟡 da auditoria de
// 2026-08-07). A disponibilidade de horários continua 100% dinâmica: é
// buscada à parte, via Server Action, no client (ver public-booking-flow.tsx
// / getAvailableSlotsAction), não fica presa a este cache.
export const revalidate = 30;

const getPublicBusiness = cache(async (slug: string) => {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, nome_loja, slug, categoria, logo_url, timezone, entrada_ativa, entrada_percentual")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return null;

  // As três consultas abaixo são independentes entre si — rodar em paralelo
  // em vez de uma atrás da outra corta o tempo de resposta sem tirar nada do
  // cache de 30s já existente (achado do mesmo tipo do batching já usado em
  // app/(gated)/agenda/page.tsx).
  const [{ data: services }, { data: plans }, { data: products }] = await Promise.all([
    supabase
      .from("services")
      .select("id, nome, duracao_min, preco")
      .eq("business_id", business.id)
      .eq("ativo", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("client_plans")
      .select("id, nome, valor_mensal, ciclo_dias, servicos_inclusos, permite_pagamento_online")
      .eq("business_id", business.id)
      .eq("ativo", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("id, nome, descricao, preco, imagem_url")
      .eq("business_id", business.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  return { business, services: services ?? [], plans: plans ?? [], products: products ?? [] };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBusiness(slug);
  if (!data) notFound();

  const title = `Agendar com ${data.business.nome_loja}`;
  const description = `Agende seu horário com ${data.business.nome_loja} pela Beloo — escolha o serviço e o melhor horário em poucos toques.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicBusiness(slug);

  if (!data) notFound();

  return (
    <PublicBookingFlow
      business={data.business}
      services={data.services}
      plans={data.plans}
      products={data.products}
    />
  );
}

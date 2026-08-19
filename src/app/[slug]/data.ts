import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Compartilhado entre page.tsx e layout.tsx (manifest por loja + prompt de
// instalação) — precisa ser a MESMA referência de função cacheada nos dois
// lugares pra React dedupar a consulta dentro do mesmo request (cache() só
// dedupa por identidade de função, não por corpo idêntico).
export const getPublicBusiness = cache(async (slug: string) => {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, nome_loja, slug, categoria, logo_url, timezone, entrada_ativa, entrada_percentual, modo_selecao_profissional",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return null;

  // As consultas abaixo são independentes entre si — rodar em paralelo em
  // vez de uma atrás da outra corta o tempo de resposta sem tirar nada do
  // cache de 30s já existente (achado do mesmo tipo do batching já usado em
  // app/(gated)/agenda/page.tsx).
  const [{ data: services }, { data: plans }, { data: products }, { data: professionals }] =
    await Promise.all([
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
      supabase
        .from("professionals")
        .select("id, nome, foto_url, ordem")
        .eq("business_id", business.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
    ]);

  const professionalIds = (professionals ?? []).map((p) => p.id);
  const { data: professionalServices } =
    professionalIds.length > 0
      ? await supabase
          .from("professional_services")
          .select("professional_id, service_id")
          .in("professional_id", professionalIds)
      : { data: [] };

  return {
    business,
    services: services ?? [],
    plans: plans ?? [],
    products: products ?? [],
    professionals: professionals ?? [],
    professionalServices: professionalServices ?? [],
  };
});

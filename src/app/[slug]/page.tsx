import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingFlow } from "./public-booking-flow";

const getPublicBusiness = cache(async (slug: string) => {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, nome_loja, slug, categoria, logo_url, timezone")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return null;

  const { data: services } = await supabase
    .from("services")
    .select("id, nome, duracao_min, preco")
    .eq("business_id", business.id)
    .eq("ativo", true)
    .order("created_at", { ascending: true });

  return { business, services: services ?? [] };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBusiness(slug);
  if (!data) notFound();

  return { title: `Agendar com ${data.business.nome_loja}` };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicBusiness(slug);

  if (!data) notFound();

  return <PublicBookingFlow business={data.business} services={data.services} />;
}

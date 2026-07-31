import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingFlow } from "./public-booking-flow";

async function getPublicBusiness(slug: string) {
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
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja")
    .eq("slug", slug)
    .maybeSingle();

  return { title: business ? `Agendar com ${business.nome_loja}` : "Loja não encontrada" };
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

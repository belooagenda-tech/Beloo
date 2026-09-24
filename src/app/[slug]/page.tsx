import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBookingFlow } from "./public-booking-flow";
import { getPublicBusiness } from "./data";

// Dados de negócio/serviços/planos mudam pouco e essa é a página pública
// mais visitada do produto — cachear por 30s tira carga do Supabase sem
// impacto perceptível para quem edita o catálogo (achado 🟡 da auditoria de
// 2026-08-07). A disponibilidade de horários continua 100% dinâmica: é
// buscada à parte, via Server Action, no client (ver public-booking-flow.tsx
// / getAvailableSlotsAction), não fica presa a este cache.
export const revalidate = 30;

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
      professionals={data.professionals}
      professionalServices={data.professionalServices}
    />
  );
}

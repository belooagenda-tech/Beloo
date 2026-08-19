import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { ProfessionalProfileCard } from "./professional-profile-card";
import { ProfessionalAvailabilityCard } from "./professional-availability-card";

const getProfessionalAndBusiness = cache(async (id: string) => {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { data: professional } = await supabase
    .from("professionals")
    .select("id, business_id, nome, foto_url, cor, ativo, usa_horario_proprio, ordem, created_at")
    .eq("id", id)
    .eq("business_id", business!.id)
    .maybeSingle();

  return { business, professional };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { professional } = await getProfessionalAndBusiness(id);
  if (!professional) notFound();

  return { title: professional.nome };
}

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { business, professional } = await getProfessionalAndBusiness(id);

  if (!professional) notFound();

  const [{ data: services }, { data: links }, { data: hours }, { data: businessHours }, { data: exceptions }] =
    await Promise.all([
      supabase.from("services").select("id, nome, ativo").eq("business_id", business!.id).order("nome", { ascending: true }),
      supabase.from("professional_services").select("service_id").eq("professional_id", professional.id),
      supabase
        .from("professional_hours")
        .select("dia_semana, hora_inicio, hora_fim")
        .eq("professional_id", professional.id),
      supabase.from("business_hours").select("dia_semana, hora_inicio, hora_fim").eq("business_id", business!.id),
      supabase
        .from("professional_exceptions")
        .select("id, data, tipo, hora_inicio, hora_fim")
        .eq("professional_id", professional.id)
        .order("data", { ascending: true }),
    ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/app/equipe"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Equipe
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">{professional.nome}</h1>
      </div>

      <ProfessionalProfileCard
        businessId={business!.id}
        professional={professional}
        services={services ?? []}
        initialServiceIds={(links ?? []).map((l) => l.service_id)}
      />

      <ProfessionalAvailabilityCard
        professionalId={professional.id}
        initialUsaHorarioProprio={professional.usa_horario_proprio}
        initialHours={hours ?? []}
        fallbackHours={businessHours ?? []}
        initialExceptions={exceptions ?? []}
      />
    </div>
  );
}

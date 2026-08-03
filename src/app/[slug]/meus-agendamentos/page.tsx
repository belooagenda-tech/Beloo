import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/logo";
import { MyAppointmentsLookup } from "./my-appointments-lookup";

export const metadata: Metadata = { title: "Meus agendamentos" };

export default async function MeusAgendamentosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja, slug, timezone")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Seus agendamentos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              com {business.nome_loja}
            </p>
          </div>
          <MyAppointmentsLookup slug={business.slug} timezone={business.timezone} />
        </div>
      </main>
    </div>
  );
}

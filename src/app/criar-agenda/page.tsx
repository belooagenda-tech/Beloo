import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/brand/auth-shell";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = {
  title: "Criar minha agenda",
};

export default async function CriarAgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let startStep: 1 | 2 = 1;

  if (user) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (business) {
      redirect("/app");
    }

    startStep = 2;
  }

  return (
    <AuthShell
      title="Crie sua agenda"
      subtitle="Leva menos de 2 minutos para começar a receber agendamentos."
    >
      <OnboardingWizard startStep={startStep} />
    </AuthShell>
  );
}

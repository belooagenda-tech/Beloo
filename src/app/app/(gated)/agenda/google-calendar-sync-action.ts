"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushAppointmentToGoogle } from "@/lib/google-calendar/sync";

// Ponte pros pontos da Agenda que ainda gravam appointments direto do
// browser (insert/update via supabase-js, protegido por RLS — ver
// new-appointment-dialog.tsx e agenda-day-view.tsx). Esses componentes não
// têm acesso ao admin client nem aos tokens do Google, então chamam esta
// action depois de qualquer mutação bem-sucedida; ela só resolve o
// business_id do usuário logado (nunca confia num business_id vindo do
// cliente) e delega pro sync de verdade. Sempre "melhor esforço": o
// resultado nunca é mostrado na tela, e uma falha de rede com o Google não
// deve virar um toast de erro pra quem só queria criar um agendamento.
export async function syncAppointmentToGoogleCalendarAction(appointmentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!business) return;

  const admin = createAdminClient();
  await pushAppointmentToGoogle(admin, business.id, appointmentId);
}

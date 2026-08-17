"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCompleteRegistrationAndStartTrial } from "@/lib/meta-ads/capi";

// Chamado sem aguardar (fire-and-forget) pelo client no fim do passo 2 do
// wizard — mesmo padrão de linkReferralIfPresentAction/
// notifyAdminsOfNewSignupAction em referral-actions.ts. Nunca bloqueia nem
// falha visivelmente pro profissional: se o Meta estiver fora do ar ou mal
// configurado, o cadastro continua normalmente (ver sendEvents em
// src/lib/meta-ads/capi.ts, que já engole os próprios erros).
//
// Faz duas coisas:
// 1) salva fbc/fbp em businesses — precisa disso porque o evento "Subscribe"
//    só acontece dias depois, via webhook, sem navegador aberto.
// 2) dispara CompleteRegistration + StartTrial pra Conversions API, com o
//    mesmo event_id que o client já mandou pro Pixel (fbq), pro Meta
//    deduplicar os dois lados.
export async function trackSignupConversionAction(input: {
  businessId: string;
  completeRegistrationEventId: string;
  startTrialEventId: string;
  fbc: string | null;
  fbp: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();

  const [{ data: business }, { data: profile }] = await Promise.all([
    admin.from("businesses").select("id, profile_id").eq("id", input.businessId).maybeSingle(),
    admin.from("profiles").select("email, telefone").eq("id", user.id).maybeSingle(),
  ]);
  // Mesma checagem de posse de linkReferralIfPresentAction — evita salvar
  // fbc/fbp num businessId arbitrário passado pelo client.
  if (!business || business.profile_id !== user.id) return;

  await admin
    .from("businesses")
    .update({ meta_fbc: input.fbc, meta_fbp: input.fbp })
    .eq("id", business.id);

  await sendCompleteRegistrationAndStartTrial({
    businessId: business.id,
    completeRegistrationEventId: input.completeRegistrationEventId,
    startTrialEventId: input.startTrialEventId,
    userData: {
      email: profile?.email ?? null,
      phone: profile?.telefone ?? null,
      fbc: input.fbc,
      fbp: input.fbp,
    },
  });
}

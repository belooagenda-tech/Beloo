"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { refundPayment } from "@/lib/mercadopago/client";

export type CancelFromAgendaResult =
  | { ok: true; avisoReembolso?: string }
  | { ok: false; error: string };

export async function cancelAppointmentFromAgendaAction(
  appointmentId: string,
): Promise<CancelFromAgendaResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!business) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const admin = createAdminClient();

  const { data: appointment } = await admin
    .from("appointments")
    .select("id, status, entrada_status, mp_payment_id")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!appointment) {
    return { ok: false, error: "Agendamento não encontrado." };
  }

  const { error: updateError } = await admin
    .from("appointments")
    .update({ status: "cancelado" })
    .eq("id", appointmentId);
  if (updateError) {
    return { ok: false, error: "Não foi possível cancelar. Tente novamente." };
  }

  let avisoReembolso: string | undefined;
  if (appointment.entrada_status === "pago" && appointment.mp_payment_id) {
    try {
      const accessToken = await getValidAccessToken(admin, business.id);
      if (!accessToken) throw new Error("sem conexão Mercado Pago");
      await refundPayment(accessToken, appointment.mp_payment_id);
      await admin
        .from("appointments")
        .update({ entrada_status: "reembolsado" })
        .eq("id", appointmentId);
    } catch (err) {
      console.error("Beloo: falha ao reembolsar entrada automaticamente (Agenda)", err);
      avisoReembolso =
        "O agendamento foi cancelado, mas o reembolso automático da entrada falhou — verifique manualmente no Mercado Pago.";
    }
  }

  return { ok: true, avisoReembolso };
}

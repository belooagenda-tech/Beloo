import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { NotificationTipo } from "@/lib/supabase/types";
import { sendPushToProfile } from "./send-push";

export async function notifyProfessional(
  admin: SupabaseClient<Database>,
  params: {
    profileId: string;
    tipo: NotificationTipo;
    titulo: string;
    corpo: string;
    appointmentId?: string;
    url?: string;
  },
) {
  const { error } = await admin.from("notifications").insert({
    profile_id: params.profileId,
    tipo: params.tipo,
    titulo: params.titulo,
    corpo: params.corpo,
    appointment_id: params.appointmentId ?? null,
  });
  if (error) {
    console.error("Beloo: falha ao gravar notificação no sino", error);
  }

  await sendPushToProfile(admin, params.profileId, {
    title: params.titulo,
    body: params.corpo,
    url: params.url ?? "/app/agenda",
    tag: params.tipo,
  });
}

// Avisa TODOS os admins da plataforma (profiles.is_admin = true) — hoje só
// usado para "novo profissional se cadastrou" (ver
// criar-agenda/referral-actions.ts). Poucas contas admin existem, então
// notificar uma por uma (mesmo caminho de notifyProfessional, sino + push)
// não precisa de nenhum batching especial.
export async function notifyAdmins(
  admin: SupabaseClient<Database>,
  params: { tipo: NotificationTipo; titulo: string; corpo: string; url?: string },
) {
  const { data: admins } = await admin.from("profiles").select("id").eq("is_admin", true);
  await Promise.all(
    (admins ?? []).map((a) =>
      notifyProfessional(admin, { profileId: a.id, ...params }).catch((err) => {
        console.error("Beloo: falha ao notificar admin", a.id, err);
      }),
    ),
  );
}

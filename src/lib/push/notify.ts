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
  await admin.from("notifications").insert({
    profile_id: params.profileId,
    tipo: params.tipo,
    titulo: params.titulo,
    corpo: params.corpo,
    appointment_id: params.appointmentId ?? null,
  });

  await sendPushToProfile(admin, params.profileId, {
    title: params.titulo,
    body: params.corpo,
    url: params.url ?? "/app/agenda",
    tag: params.tipo,
  });
}

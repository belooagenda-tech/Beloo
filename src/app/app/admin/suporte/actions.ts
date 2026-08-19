"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) return null;
  return profile;
}

export async function markSupportMessageReadAction(messageId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("support_messages").update({ lida: true }).eq("id", messageId);

  if (error) {
    return { ok: false, error: "Não foi possível marcar como lida. Tente novamente." };
  }

  revalidatePath("/app/admin/suporte");
  revalidatePath("/app/admin");
  return { ok: true };
}

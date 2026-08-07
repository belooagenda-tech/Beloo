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

export async function resolveErrorLogAction(logId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("error_logs")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", logId);

  if (error) {
    return { ok: false, error: "Não foi possível marcar como resolvido. Tente novamente." };
  }

  revalidatePath("/app/admin/logs");
  return { ok: true };
}

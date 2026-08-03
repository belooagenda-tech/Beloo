"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export async function deleteMyAccountAction(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { ok: false, error: "Não foi possível excluir sua conta. Tente novamente." };
  }

  return { ok: true };
}

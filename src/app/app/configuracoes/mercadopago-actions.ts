"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getOwnBusinessId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  return business?.id ?? null;
}

export async function disconnectMercadoPagoAction(): Promise<ActionResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  await admin.from("mp_connections").delete().eq("business_id", businessId);
  await admin.from("businesses").update({ entrada_ativa: false }).eq("id", businessId);

  return { ok: true };
}

export async function updateEntradaSettingsAction(input: {
  ativa: boolean;
  percentual: number;
}): Promise<ActionResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  if (input.percentual < 0 || input.percentual > 100) {
    return { ok: false, error: "Percentual inválido." };
  }

  const admin = createAdminClient();

  if (input.ativa) {
    const { data: connection } = await admin
      .from("mp_connections")
      .select("business_id")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!connection) {
      return {
        ok: false,
        error: "Conecte sua conta do Mercado Pago antes de ativar a cobrança de entrada.",
      };
    }
    if (input.percentual <= 0) {
      return { ok: false, error: "Escolha um percentual de entrada maior que zero." };
    }
  }

  const { error } = await admin
    .from("businesses")
    .update({ entrada_ativa: input.ativa, entrada_percentual: input.percentual })
    .eq("id", businessId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { encryptSecret } from "@/lib/crypto";
import { sendTestEvent } from "@/lib/meta-ads/capi";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) return null;
  return profile;
}

// accessToken vem vazio quando o admin não mexeu no campo (o valor real
// nunca é reenviado pro client depois de salvo — ver page.tsx) — nesse caso
// preserva o token já gravado em vez de apagá-lo.
export async function saveMetaAdsSettingsAction(input: {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  trackingEnabled: boolean;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = createAdminClient();
  const { data: current } = await supabase.from("meta_ads_settings").select("id").limit(1).maybeSingle();
  if (!current) {
    return { ok: false, error: "Configuração não encontrada." };
  }

  const { error } = await supabase
    .from("meta_ads_settings")
    .update({
      pixel_id: input.pixelId.trim() || null,
      ...(input.accessToken.trim() ? { access_token: encryptSecret(input.accessToken.trim()) } : {}),
      test_event_code: input.testEventCode.trim() || null,
      tracking_enabled: input.trackingEnabled,
    })
    .eq("id", current.id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/app/admin/anuncios");
  // Layout raiz lê a configuração em toda página — precisa revalidar pra
  // pixelId/trackingEnabled novos valerem sem precisar de um novo deploy.
  revalidatePath("/", "layout");
  return { ok: true };
}

// Botões "Testar eventos" — dispara um evento de verdade pra Conversions
// API (marcado com o Test Event Code, então nunca conta como conversão
// real) usando os dados do próprio admin logado. Ver sendTestEvent em
// src/lib/meta-ads/capi.ts pras regras de quando isso é permitido.
export async function testMetaEventAction(kind: "signup" | "subscribe" | "cancel"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = createAdminClient();
  const { data: plan } = await supabase.from("saas_plans").select("valor_mensal").limit(1).maybeSingle();

  return sendTestEvent({
    kind,
    value: plan?.valor_mensal ?? 49.9,
    userData: {
      email: admin.email,
      phone: admin.telefone,
      fbc: null,
      fbp: null,
    },
  });
}

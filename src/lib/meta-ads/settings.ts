import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";

export type ResolvedMetaAdsSettings = {
  pixelId: string | null;
  accessToken: string | null;
  testEventCode: string | null;
  hasAccessToken: boolean;
  // Igual ao padrão de saas_plans.billing_enabled: desligado por padrão
  // mesmo com as credenciais já preenchidas, até o admin ligar o toggle
  // explicitamente em /app/admin/anuncios.
  trackingEnabled: boolean;
};

// Fonte única de verdade: a linha em meta_ads_settings, editada inteiramente
// pela tela /app/admin/anuncios (sem nenhuma env var envolvida — Pixel ID,
// Access Token e Test Event Code só existem no banco, o token sempre
// criptografado, ver src/lib/crypto.ts).
export async function getMetaAdsSettings(): Promise<ResolvedMetaAdsSettings> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("meta_ads_settings")
    .select("pixel_id, access_token, test_event_code, tracking_enabled")
    .limit(1)
    .maybeSingle();

  return {
    pixelId: row?.pixel_id ?? null,
    accessToken: row?.access_token ? decryptSecret(row.access_token) : null,
    testEventCode: row?.test_event_code ?? null,
    hasAccessToken: Boolean(row?.access_token),
    trackingEnabled: Boolean(row?.tracking_enabled),
  };
}

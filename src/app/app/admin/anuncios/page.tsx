import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { getMetaAdsSettings } from "@/lib/meta-ads/settings";
import { MetaAdsGuideCard } from "./meta-ads-guide-card";
import { MetaAdsSettingsCard } from "./meta-ads-settings-card";
import { MetaAdsTestCard } from "./meta-ads-test-card";
import { MetaAdsEventsCard, type MetaAdsEventRow } from "./meta-ads-events-card";

export const metadata: Metadata = { title: "Anúncios" };

const EVENTOS_PAGE_SIZE = 50;

export default async function AdminAnunciosPage() {
  // Pixel/CAPI é DA BELOO (não por-loja) — mesmo guard de super admin do
  // resto do /app/admin.
  const profile = await getOwnProfile();
  if (!profile?.is_admin) {
    redirect("/app");
  }

  const settings = await getMetaAdsSettings();

  const admin = createAdminClient();

  const { data: eventosRaw } = await admin
    .from("meta_ads_events_log")
    .select("id, event_name, business_id, status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(EVENTOS_PAGE_SIZE);

  const businessIds = [...new Set((eventosRaw ?? []).map((e) => e.business_id).filter((id): id is string => !!id))];
  const { data: businesses } =
    businessIds.length > 0
      ? await admin.from("businesses").select("id, nome_loja").in("id", businessIds)
      : { data: [] };
  const nomeById = new Map((businesses ?? []).map((b) => [b.id, b.nome_loja]));

  const eventos: MetaAdsEventRow[] = (eventosRaw ?? []).map((e) => ({
    id: e.id,
    eventName: e.event_name,
    businessNome: e.business_id ? (nomeById.get(e.business_id) ?? "Negócio removido") : null,
    status: e.status,
    errorMessage: e.error_message,
    createdAt: e.created_at,
  }));

  const testePronto = Boolean(settings.pixelId && settings.hasAccessToken && settings.testEventCode);
  const motivoBloqueio = !settings.pixelId || !settings.hasAccessToken
    ? "Salve o Pixel ID e o Access Token abaixo antes de testar."
    : !settings.testEventCode
      ? "Preencha o Test Event Code abaixo antes de testar (veja o passo 3 do guia)."
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Anúncios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rastreamento de conversão do Meta (Pixel + Conversions API) do funil de assinantes da
            Beloo.
          </p>
        </div>
        <Link href="/app/admin" className="text-sm text-primary hover:underline">
          Voltar ao Admin
        </Link>
      </div>

      <MetaAdsGuideCard />

      <MetaAdsSettingsCard
        initialPixelId={settings.pixelId ?? ""}
        hasAccessToken={settings.hasAccessToken}
        initialTestEventCode={settings.testEventCode ?? ""}
        initialTrackingEnabled={settings.trackingEnabled}
      />

      <MetaAdsTestCard pronto={testePronto} motivoBloqueio={motivoBloqueio} />

      <MetaAdsEventsCard eventos={eventos} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Lock, QrCode as QrCodeIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, getOwnBusiness } from "@/lib/supabase/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/app-shell/copy-link-button";
import { BusinessInfoCard } from "./business-info-card";
import { ProFeatureGate } from "@/components/plan/pro-feature-gate";
import { hasFeature } from "@/lib/plan/features";

// "qrcode" só é necessário nesta página — carregar sob demanda mantém o
// bundle inicial do resto de /app livre desse peso (mesmo padrão já usado
// nos gráficos do Financeiro).
const QrCodeButton = dynamic(() => import("./qr-code-button").then((mod) => mod.QrCodeButton));
import { SocialLinksCard } from "./social-links-card";
import { WhatsAppTemplateCard } from "./whatsapp-template-card";
import { PushNotificationsCard } from "./push-notifications-card";
import { ChangePasswordCard } from "./change-password-card";
import { MercadoPagoCard } from "./mercadopago-card";
import { GoogleCalendarCard } from "./google-calendar-card";
import { DangerZoneCard } from "./danger-zone-card";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const [user, business] = await Promise.all([getAuthedUser(), getOwnBusiness()]);

  const admin = createAdminClient();
  const [{ data: mpConnection }, { data: googleConnection }] = await Promise.all([
    admin.from("mp_connections").select("mp_email").eq("business_id", business!.id).maybeSingle(),
    admin
      .from("google_calendar_connections")
      .select("google_email, export_enabled")
      .eq("business_id", business!.id)
      .maybeSingle(),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const publicUrl = `${siteUrl}/${business!.slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados da sua loja, link público e notificações.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Link público de agendamento</p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {publicUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <div className="flex items-center gap-2">
            {hasFeature(business!.plan_tier, "qr_code") ? (
              <QrCodeButton url={publicUrl} nomeLoja={business!.nome_loja} />
            ) : (
              <Link href="/app/assinatura" className="inline-flex">
                <Button type="button" variant="outline" size="sm">
                  <Lock className="size-3.5" />
                  <QrCodeIcon className="size-4" />
                  QR Code
                </Button>
              </Link>
            )}
            <CopyLinkButton url={publicUrl} />
          </div>
        </CardContent>
      </Card>

      <BusinessInfoCard
        businessId={business!.id}
        nomeLoja={business!.nome_loja}
        categoria={business!.categoria}
      />

      <SocialLinksCard
        businessId={business!.id}
        instagramUrl={business!.instagram_url}
        googleReviewUrl={business!.google_review_url}
      />

      <WhatsAppTemplateCard
        businessId={business!.id}
        template={business!.whatsapp_lembrete_template}
      />

      <PushNotificationsCard profileId={user!.id} />

      {hasFeature(business!.plan_tier, "pix_automatico") ? (
        <Suspense fallback={null}>
          <MercadoPagoCard
            connected={Boolean(mpConnection)}
            mpEmail={mpConnection?.mp_email ?? null}
            initialEntradaAtiva={business!.entrada_ativa}
            initialEntradaPercentual={business!.entrada_percentual}
          />
        </Suspense>
      ) : (
        <ProFeatureGate
          feature="pix_automatico"
          description="Cobre uma entrada ou o valor cheio antes do atendimento, com link gerado na hora via Mercado Pago."
        />
      )}

      <Suspense fallback={null}>
        <GoogleCalendarCard
          connected={Boolean(googleConnection)}
          googleEmail={googleConnection?.google_email ?? null}
          initialExportEnabled={googleConnection?.export_enabled ?? true}
        />
      </Suspense>

      <ChangePasswordCard />

      <DangerZoneCard />
    </div>
  );
}

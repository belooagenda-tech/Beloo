import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser, getOwnBusiness } from "@/lib/supabase/session";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/app-shell/copy-link-button";
import { BusinessInfoCard } from "./business-info-card";

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
            <QrCodeButton url={publicUrl} nomeLoja={business!.nome_loja} />
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

      <Suspense fallback={null}>
        <MercadoPagoCard
          connected={Boolean(mpConnection)}
          mpEmail={mpConnection?.mp_email ?? null}
          initialEntradaAtiva={business!.entrada_ativa}
          initialEntradaPercentual={business!.entrada_percentual}
        />
      </Suspense>

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

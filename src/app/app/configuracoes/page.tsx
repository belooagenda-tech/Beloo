import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/app-shell/copy-link-button";
import { BusinessInfoCard } from "./business-info-card";
import { PushNotificationsCard } from "./push-notifications-card";
import { ChangePasswordCard } from "./change-password-card";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, nome_loja, categoria, slug")
    .eq("profile_id", user!.id)
    .single();

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
          <CopyLinkButton url={publicUrl} />
        </CardContent>
      </Card>

      <BusinessInfoCard
        businessId={business!.id}
        nomeLoja={business!.nome_loja}
        categoria={business!.categoria}
      />

      <PushNotificationsCard profileId={user!.id} />

      <ChangePasswordCard />
    </div>
  );
}

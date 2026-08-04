import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingSettingsCard } from "./billing-settings-card";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Admin" };

const STATUS_LABEL: Record<SaasSubscriptionStatus, string> = {
  trial: "Teste grátis",
  ativo: "Ativo",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function AdminPage() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) {
    redirect("/app");
  }

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("saas_plans")
    .select("billing_enabled, valor_mensal, billing_enabled_at, trial_dias")
    .limit(1)
    .maybeSingle();

  const [{ data: businesses }, { data: subscriptions }] = await Promise.all([
    admin.from("businesses").select("id, nome_loja, profile_id").order("nome_loja", { ascending: true }),
    admin
      .from("saas_subscriptions")
      .select("business_id, status, trial_ends_at, current_period_end"),
  ]);

  const profileIds = [...new Set((businesses ?? []).map((b) => b.profile_id))];
  const { data: profiles } =
    profileIds.length > 0
      ? await admin.from("profiles").select("id, email").in("id", profileIds)
      : { data: [] };

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const subByBusinessId = new Map((subscriptions ?? []).map((s) => [s.business_id, s]));

  const linhas = (businesses ?? []).map((business) => {
    const sub = subByBusinessId.get(business.id);
    return {
      id: business.id,
      nomeLoja: business.nome_loja,
      email: emailById.get(business.profile_id) ?? "—",
      status: sub?.status ?? "trial",
      trialEndsAt: sub?.trial_ends_at ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle a cobrança da Beloo e acompanhe as assinaturas dos profissionais.
        </p>
      </div>

      <BillingSettingsCard
        initialEnabled={plan?.billing_enabled ?? false}
        initialValorMensal={plan?.valor_mensal ?? 49.9}
        billingEnabledAt={plan?.billing_enabled_at ?? null}
        trialDias={plan?.trial_dias ?? 7}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profissionais ({linhas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum profissional cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Loja</th>
                    <th className="py-2 pr-3 font-medium">E-mail</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Trial até</th>
                    <th className="py-2 font-medium">Próxima cobrança</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <tr key={linha.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-medium text-foreground">{linha.nomeLoja}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{linha.email}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={linha.status === "ativo" ? "secondary" : "outline"}>
                          {STATUS_LABEL[linha.status]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {formatarData(linha.trialEndsAt)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {formatarData(linha.currentPeriodEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

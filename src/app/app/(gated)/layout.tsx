import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";

// Bloqueia o acesso às rotas do dia a dia quando a cobrança da Beloo está
// ativa e o profissional não está nem em trial nem com assinatura em dia.
// /app/assinatura e /app/admin ficam FORA deste route group de propósito —
// precisam continuar acessíveis mesmo bloqueado (pra poder pagar) ou sempre
// (admin). Admins nunca são bloqueados, nem aqui.
export default async function GatedLayout({ children }: { children: ReactNode }) {
  const [business, profile] = await Promise.all([getOwnBusiness(), getOwnProfile()]);

  if (business && !profile?.is_admin) {
    const supabase = await createClient();
    const { data: plan } = await supabase
      .from("saas_plans")
      .select("billing_enabled")
      .limit(1)
      .maybeSingle();

    if (plan?.billing_enabled) {
      const { data: sub } = await supabase
        .from("saas_subscriptions")
        .select("status, trial_ends_at, current_period_end")
        .eq("business_id", business.id)
        .maybeSingle();

      const emTrial = sub?.status === "trial" && new Date(sub.trial_ends_at) > new Date();
      const ativo =
        sub?.status === "ativo" &&
        Boolean(sub.current_period_end) &&
        new Date(sub.current_period_end!) > new Date();

      if (!emTrial && !ativo) {
        redirect("/app/assinatura");
      }
    }
  }

  return children;
}

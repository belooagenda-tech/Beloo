import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/criar-agenda");
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, profile_id, tipo, titulo, corpo, appointment_id, lida, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <AppShell nomeLoja={business.nome_loja} notifications={notifications ?? []}>
      {children}
    </AppShell>
  );
}

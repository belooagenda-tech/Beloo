import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser, getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getAuthedUser();

  if (!user) {
    redirect("/entrar");
  }

  const [business, profile] = await Promise.all([getOwnBusiness(), getOwnProfile()]);

  if (!business) {
    redirect("/criar-agenda");
  }

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, profile_id, tipo, titulo, corpo, appointment_id, lida, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <AppShell
      nomeLoja={business.nome_loja}
      notifications={notifications ?? []}
      isAdmin={profile?.is_admin ?? false}
    >
      {children}
    </AppShell>
  );
}

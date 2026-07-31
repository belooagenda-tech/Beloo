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

  return <AppShell nomeLoja={business.nome_loja}>{children}</AppShell>;
}

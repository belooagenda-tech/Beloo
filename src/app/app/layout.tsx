import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthedUser, getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";
import { AppShell } from "@/components/app-shell/app-shell";
import { BootSplash } from "@/components/pwa/boot-splash";

// AppLayout em si não faz `await` nenhum, então ele (e o shell estático do
// layout raiz acima dele) pinta na hora, direto do primeiro chunk da
// resposta — a BootSplash aparece imediatamente como fallback do Suspense
// enquanto AppLayoutContent resolve auth + negócio + perfil + notificações
// em segundo plano. Sem esse Suspense, o `await` ficava direto aqui dentro
// e travava a resposta inteira (raiz incluída) até tudo responder — daí a
// tela preta ao abrir o app instalado. Ver doc oficial: loading.js não
// envolve o layout.js do mesmo segmento, então a saída suportada é criar
// esse Suspense manualmente (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<BootSplash />}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
}

async function AppLayoutContent({ children }: { children: ReactNode }) {
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

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportMessagesTable, type SupportMessageRow } from "./support-messages-table";

export const metadata: Metadata = { title: "Suporte" };

const PAGE_SIZE = 30;

export default async function AdminSuportePage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; filtro?: string }>;
}) {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) {
    redirect("/app");
  }

  const { pagina: paginaParam, filtro: filtroParam } = await searchParams;
  const somenteNaoLidas = filtroParam !== "todas";
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const inicio = (pagina - 1) * PAGE_SIZE;
  const fim = inicio + PAGE_SIZE - 1;

  const admin = createAdminClient();

  let query = admin
    .from("support_messages")
    .select("id, business_id, profile_id, mensagem, lida, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(inicio, fim);

  if (somenteNaoLidas) {
    query = query.eq("lida", false);
  }

  const { data: messagesRaw, count } = await query;

  const businessIds = [...new Set((messagesRaw ?? []).map((m) => m.business_id))];
  const profileIds = [...new Set((messagesRaw ?? []).map((m) => m.profile_id))];
  const [{ data: businesses }, { data: profiles }] = await Promise.all([
    businessIds.length > 0
      ? admin.from("businesses").select("id, nome_loja").in("id", businessIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? admin.from("profiles").select("id, telefone").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);
  const nomeById = new Map((businesses ?? []).map((b) => [b.id, b.nome_loja]));
  const telefoneById = new Map((profiles ?? []).map((p) => [p.id, p.telefone]));

  const messages: SupportMessageRow[] = (messagesRaw ?? []).map((m) => ({
    id: m.id,
    nomeLoja: nomeById.get(m.business_id) ?? "Loja removida",
    telefone: telefoneById.get(m.profile_id) ?? null,
    mensagem: m.mensagem,
    lida: m.lida,
    createdAt: m.created_at,
  }));

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Suporte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sugestões e dúvidas que os profissionais mandam pela aba Suporte.
          </p>
        </div>
        <Link href="/app/admin" className="text-sm text-primary hover:underline">
          Voltar ao Admin
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {somenteNaoLidas ? "Não lidas" : "Todas"} ({count ?? 0})
          </CardTitle>
          <div className="flex gap-2 text-sm">
            <Link
              href="/app/admin/suporte"
              className={!somenteNaoLidas ? "text-muted-foreground hover:underline" : "font-medium text-primary"}
            >
              Não lidas
            </Link>
            <Link
              href="/app/admin/suporte?filtro=todas"
              className={somenteNaoLidas ? "text-muted-foreground hover:underline" : "font-medium text-primary"}
            >
              Todas
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <SupportMessagesTable messages={messages} />
          {totalPaginas > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/app/admin/suporte?pagina=${pagina - 1}${somenteNaoLidas ? "" : "&filtro=todas"}`}
                  aria-disabled={pagina <= 1}
                  className={`rounded-md border border-border px-3 py-1.5 ${
                    pagina <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"
                  }`}
                >
                  Anterior
                </Link>
                <Link
                  href={`/app/admin/suporte?pagina=${pagina + 1}${somenteNaoLidas ? "" : "&filtro=todas"}`}
                  aria-disabled={pagina >= totalPaginas}
                  className={`rounded-md border border-border px-3 py-1.5 ${
                    pagina >= totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-accent"
                  }`}
                >
                  Próxima
                </Link>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

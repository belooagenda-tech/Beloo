import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogsTable, type LogRow } from "./logs-table";

export const metadata: Metadata = { title: "Logs" };

const PAGE_SIZE = 30;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; filtro?: string }>;
}) {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) {
    redirect("/app");
  }

  const { pagina: paginaParam, filtro: filtroParam } = await searchParams;
  const somenteNaoResolvidos = filtroParam !== "todos";
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const inicio = (pagina - 1) * PAGE_SIZE;
  const fim = inicio + PAGE_SIZE - 1;

  const admin = createAdminClient();

  let query = admin
    .from("error_logs")
    .select("id, scope, message, business_id, context, resolved, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(inicio, fim);

  if (somenteNaoResolvidos) {
    query = query.eq("resolved", false);
  }

  const { data: logsRaw, count } = await query;

  const businessIds = [...new Set((logsRaw ?? []).map((l) => l.business_id).filter((id): id is string => !!id))];
  const { data: businesses } =
    businessIds.length > 0
      ? await admin.from("businesses").select("id, nome_loja").in("id", businessIds)
      : { data: [] };
  const nomeById = new Map((businesses ?? []).map((b) => [b.id, b.nome_loja]));

  const logs: LogRow[] = (logsRaw ?? []).map((l) => ({
    id: l.id,
    scope: l.scope,
    message: l.message,
    businessNome: l.business_id ? (nomeById.get(l.business_id) ?? "Negócio removido") : null,
    context: l.context,
    resolved: l.resolved,
    createdAt: l.created_at,
  }));

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Erros registrados nas operações dos assinantes (pagamentos, lembretes, agendamento público).
          </p>
        </div>
        <Link href="/app/admin" className="text-sm text-primary hover:underline">
          Voltar ao Admin
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {somenteNaoResolvidos ? "Não resolvidos" : "Todos"} ({count ?? 0})
          </CardTitle>
          <div className="flex gap-2 text-sm">
            <Link
              href="/app/admin/logs"
              className={!somenteNaoResolvidos ? "text-muted-foreground hover:underline" : "font-medium text-primary"}
            >
              Não resolvidos
            </Link>
            <Link
              href="/app/admin/logs?filtro=todos"
              className={somenteNaoResolvidos ? "text-muted-foreground hover:underline" : "font-medium text-primary"}
            >
              Todos
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <LogsTable logs={logs} />
          {totalPaginas > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/app/admin/logs?pagina=${pagina - 1}${somenteNaoResolvidos ? "" : "&filtro=todos"}`}
                  aria-disabled={pagina <= 1}
                  className={`rounded-md border border-border px-3 py-1.5 ${
                    pagina <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"
                  }`}
                >
                  Anterior
                </Link>
                <Link
                  href={`/app/admin/logs?pagina=${pagina + 1}${somenteNaoResolvidos ? "" : "&filtro=todos"}`}
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

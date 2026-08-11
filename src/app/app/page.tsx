import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Check, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/app-shell/copy-link-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Painel",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const [profile, business] = await Promise.all([getOwnProfile(), getOwnBusiness()]);

  const hojeStr = formatInTimeZone(new Date(), business!.timezone, "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${hojeStr}T00:00:00`, business!.timezone);
  const dayEnd = addDays(dayStart, 1);
  const agora = new Date();

  const [
    { count: servicosCount },
    { count: horariosCount },
    { count: clientesCount },
    { data: agendamentosHoje },
    { data: ratings },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business!.id),
    supabase
      .from("business_hours")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business!.id),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business!.id),
    // Resumo do dia — leve o bastante pra não pesar o Painel: só id/inicio,
    // sem juntar cliente/serviço (isso já mora na Agenda).
    supabase
      .from("appointments")
      .select("id, inicio, status")
      .eq("business_id", business!.id)
      .neq("status", "cancelado")
      .gte("inicio", dayStart.toISOString())
      .lt("inicio", dayEnd.toISOString())
      .order("inicio", { ascending: true }),
    // Últimas avaliações — business_id não existe direto em
    // appointment_ratings, então filtra pelo agendamento dono via embed
    // (!inner obriga o filtro aninhado a valer, em vez de um left join que
    // ignoraria o .eq()). Limite de 50 mantém a média "recente" sem puxar o
    // histórico inteiro conforme a base de avaliações cresce.
    supabase
      .from("appointment_ratings")
      .select("nota, comentario, created_at, appointments!inner(business_id)")
      .eq("appointments.business_id", business!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const totalHoje = agendamentosHoje?.length ?? 0;
  const proximoHoje = (agendamentosHoje ?? []).find(
    (a) => new Date(a.inicio) >= agora && (a.status === "agendado" || a.status === "confirmado"),
  );

  const notaMedia =
    ratings && ratings.length > 0
      ? ratings.reduce((acc, r) => acc + r.nota, 0) / ratings.length
      : null;
  const ultimosComentarios = (ratings ?? []).filter((r) => r.comentario).slice(0, 3);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const publicUrl = `${siteUrl}/${business!.slug}`;
  const primeiroNome = profile?.nome?.split(" ")[0] || "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está um resumo rápido da sua agenda.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Hoje</CardTitle>
          <Link href="/app/agenda" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver agenda
          </Link>
        </CardHeader>
        <CardContent>
          {totalHoje === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento pra hoje.</p>
          ) : (
            <p className="text-sm text-foreground">
              <span className="font-semibold">{totalHoje}</span> agendamento
              {totalHoje === 1 ? "" : "s"} hoje
              {proximoHoje ? (
                <>
                  {" "}
                  · próximo às{" "}
                  <span className="font-semibold">
                    {formatInTimeZone(new Date(proximoHoje.inicio), business!.timezone, "HH:mm")}
                  </span>
                </>
              ) : null}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seu link de agendamento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {publicUrl.replace(/^https?:\/\//, "")}
          </a>
          <CopyLinkButton url={publicUrl} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Serviços cadastrados" value={servicosCount ?? 0} href="/app/servicos" />
        <StatCard label="Dias com horário aberto" value={horariosCount ?? 0} href="/app/disponibilidade" />
        <StatCard label="Clientes" value={clientesCount ?? 0} href="/app/clientes" />
      </div>

      {notaMedia !== null ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Avaliações</CardTitle>
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-warning text-warning" />
              <span className="text-sm font-semibold text-foreground">{notaMedia.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({ratings!.length} recente{ratings!.length === 1 ? "" : "s"})
              </span>
            </div>
          </CardHeader>
          {ultimosComentarios.length > 0 ? (
            <CardContent className="space-y-2">
              {ultimosComentarios.map((r, i) => (
                <div key={i} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, j) => (
                      <Star
                        key={j}
                        className={cn(
                          "size-3",
                          j < r.nota ? "fill-warning text-warning" : "text-muted-foreground",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-foreground">{r.comentario}</p>
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {(servicosCount ?? 0) === 0 || (horariosCount ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Primeiros passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChecklistItem
              done={(servicosCount ?? 0) > 0}
              label="Cadastre seu primeiro serviço"
              description="Sem serviços, ainda não é possível receber agendamentos pelo seu link."
              href="/app/servicos"
              cta="Cadastrar"
            />
            <ChecklistItem
              done={(horariosCount ?? 0) > 0}
              label="Defina seus horários de atendimento"
              description="Sem horário aberto, seus clientes não veem nenhum horário livre pra marcar."
              href="/app/disponibilidade"
              cta="Definir"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="py-5">
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ChecklistItem({
  done,
  label,
  description,
  href,
  cta,
}: {
  done: boolean;
  label: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
            done ? "border-success bg-success/15 text-success" : "border-border text-muted-foreground",
          )}
        >
          {done ? <Check className="size-3.5" /> : null}
        </span>
        <div>
          <p
            className={cn(
              "text-sm font-medium",
              done ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {label}
          </p>
          {!done ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {!done ? (
        <Link href={href} className={buttonVariants({ size: "sm" })}>
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

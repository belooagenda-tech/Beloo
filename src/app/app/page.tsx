import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/app-shell/copy-link-button";

export const metadata: Metadata = {
  title: "Painel",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const [profile, business] = await Promise.all([getOwnProfile(), getOwnBusiness()]);

  const [{ count: servicosCount }, { count: horariosCount }, { count: clientesCount }] =
    await Promise.all([
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
    ]);

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

      {(servicosCount ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
            <div>
              <p className="text-sm font-medium text-foreground">
                Cadastre seu primeiro serviço
              </p>
              <p className="text-sm text-muted-foreground">
                Sem serviços, ainda não é possível receber agendamentos pelo seu link.
              </p>
            </div>
            <Badge variant="secondary">Em breve</Badge>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        A agenda do dia, cadastro de serviços e o financeiro chegam nas próximas
        partes. Continue acompanhando —{" "}
        <Link href="/app/configuracoes" className="text-primary hover:underline">
          suas configurações
        </Link>{" "}
        já estão salvas.
      </p>
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

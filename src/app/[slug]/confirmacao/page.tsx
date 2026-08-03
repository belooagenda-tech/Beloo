import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarCheck, Clock, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Agendamento confirmado" };

async function getConfirmationData(slug: string, appointmentId: string) {
  const supabase = createAdminClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, inicio, business_id, service_id, client_id, status, entrada_status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja, slug, timezone")
    .eq("id", appointment.business_id)
    .single();
  if (!business || business.slug !== slug) return null;

  const [{ data: service }, { data: client }] = await Promise.all([
    supabase.from("services").select("nome, preco").eq("id", appointment.service_id).single(),
    supabase.from("clients").select("nome").eq("id", appointment.client_id).single(),
  ]);

  return { appointment, business, service, client };
}

export default async function ConfirmacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { slug } = await params;
  const { a: appointmentId } = await searchParams;

  if (!appointmentId) notFound();

  const data = await getConfirmationData(slug, appointmentId);
  if (!data) notFound();

  const { business, service, client, appointment } = data;
  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(appointment.inicio));
  const horaFormatada = formatInTimeZone(new Date(appointment.inicio), business.timezone, "HH:mm");

  const aguardandoPagamento = appointment.status === "aguardando_pagamento";
  const expirado = appointment.status === "cancelado" && appointment.entrada_status === "expirado";

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm text-center">
          <Card>
            {expirado ? (
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15">
                  <XCircle className="size-6 text-destructive" />
                </div>
                <h1 className="font-heading text-lg font-semibold text-foreground">
                  Pagamento não concluído
                </h1>
                <p className="text-sm text-muted-foreground">
                  O pagamento da entrada não foi concluído a tempo e o horário
                  foi liberado para outra pessoa.
                </p>
                <div className="mt-2 flex w-full flex-col gap-2">
                  <Button
                    nativeButton={false}
                    render={<Link href={`/${slug}`}>Tentar agendar de novo</Link>}
                  />
                </div>
              </CardContent>
            ) : aguardandoPagamento ? (
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
                  <Clock className="size-6 text-muted-foreground" />
                </div>
                <h1 className="font-heading text-lg font-semibold text-foreground">
                  Estamos confirmando seu pagamento
                </h1>
                <p className="text-sm text-muted-foreground">
                  {service?.nome} com <strong>{business.nome_loja}</strong>
                </p>
                <p className="text-sm font-medium capitalize text-foreground">
                  {dataFormatada} às {horaFormatada}
                </p>
                <p className="text-xs text-muted-foreground">
                  Isso pode levar alguns instantes. Você pode conferir a
                  confirmação em &quot;Meus agendamentos&quot; daqui a pouco.
                </p>
                <div className="mt-2 flex w-full flex-col gap-2">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/${slug}/meus-agendamentos`}>Ver meus agendamentos</Link>}
                  />
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
                  <CalendarCheck className="size-6 text-success" />
                </div>
                <h1 className="font-heading text-lg font-semibold text-foreground">
                  Agendamento confirmado{client ? `, ${client.nome.split(" ")[0]}` : ""}!
                </h1>
                <p className="text-sm text-muted-foreground">
                  {service?.nome} com <strong>{business.nome_loja}</strong>
                </p>
                <p className="text-sm font-medium capitalize text-foreground">
                  {dataFormatada} às {horaFormatada}
                </p>
                <div className="mt-2 flex w-full flex-col gap-2">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/${slug}/meus-agendamentos`}>Ver ou cancelar agendamento</Link>}
                  />
                  <Button
                    nativeButton={false}
                    render={<Link href={`/${slug}`}>Fazer outro agendamento</Link>}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

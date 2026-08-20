"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/phone";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimeBlock } from "@/lib/agenda/day-window";
import { DayNavigator } from "./day-navigator";
import { AppointmentCard } from "./appointment-card";
import { AgendaTimelineView, domIdForDayItem } from "./agenda-timeline-view";
import { PaymentModal } from "./payment-modal";
import { AdvancePaymentDialog } from "./advance-payment-dialog";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { BlockTimeDialog } from "./block-time-dialog";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { cancelAppointmentFromAgendaAction } from "./actions";
import { syncAppointmentToGoogleCalendarAction } from "./google-calendar-sync-action";
import type {
  AgendaAppointment,
  AgendaBlock,
  AgendaClient,
  AgendaClientPlan,
  AgendaDayItem,
  AgendaPayment,
  AgendaProduct,
  AgendaProfessional,
  AgendaService,
} from "./types";

const TODOS_PROFISSIONAIS = "__todos__";

export function AgendaDayView({
  businessId,
  timezone,
  nomeLoja,
  slug,
  whatsappTemplate,
  dataSelecionada,
  hojeStr,
  services,
  appointments: appointmentsIniciais,
  blocks: blocksIniciais,
  dayBlocks,
  clients: clientsIniciais,
  payments: paymentsIniciais,
  products: productsIniciais,
  clientPlans,
  professionals,
  professionalServices,
}: {
  businessId: string;
  timezone: string;
  bufferPadrao: number;
  nomeLoja: string;
  slug: string;
  whatsappTemplate: string | null;
  dataSelecionada: string;
  hojeStr: string;
  services: AgendaService[];
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  dayBlocks: TimeBlock[];
  clients: AgendaClient[];
  payments: AgendaPayment[];
  products: AgendaProduct[];
  clientPlans: AgendaClientPlan[];
  professionals: AgendaProfessional[];
  professionalServices: { professional_id: string; service_id: string }[];
}) {
  const [appointments, setAppointments] = useState(appointmentsIniciais);
  const [blocks, setBlocks] = useState(blocksIniciais);
  const [clients, setClients] = useState(clientsIniciais);
  const [payments, setPayments] = useState(paymentsIniciais);
  const [professionalFilter, setProfessionalFilter] = useState(TODOS_PROFISSIONAIS);
  // Produtos vendidos junto do agendamento não são editados aqui na Agenda
  // (só na vitrine pública) — não precisa de state próprio, o valor inicial
  // já é o valor definitivo pra essa tela.
  const products = productsIniciais;
  const [paymentTarget, setPaymentTarget] = useState<AgendaAppointment | null>(null);
  const [paymentFormKey, setPaymentFormKey] = useState(0);
  const [chargeTarget, setChargeTarget] = useState<AgendaAppointment | null>(null);
  const [busca, setBusca] = useState("");
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"lista" | "grade">("lista");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AgendaAppointment | null>(null);

  // Clicar num item da Grade volta pra Lista (onde ficam as ações) já
  // rolando até o card certo e destacando ele por um instante.
  useEffect(() => {
    if (!highlightedId) return;
    const el = document.getElementById(highlightedId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = window.setTimeout(() => setHighlightedId(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [highlightedId]);

  function handleSelectFromGrade(domId: string) {
    setViewMode("lista");
    setHighlightedId(domId);
  }

  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const professionalsById = useMemo(() => new Map(professionals.map((p) => [p.id, p])), [professionals]);
  const paymentsByAppointment = useMemo(
    () => new Map(payments.map((p) => [p.appointment_id, p])),
    [payments],
  );
  const productsByAppointment = useMemo(() => {
    const map = new Map<string, AgendaProduct[]>();
    for (const product of products) {
      const lista = map.get(product.appointment_id);
      if (lista) lista.push(product);
      else map.set(product.appointment_id, [product]);
    }
    return map;
  }, [products]);
  const clientPlanByClient = useMemo(
    () => new Map(clientPlans.map((p) => [p.clientId, p])),
    [clientPlans],
  );

  async function updateStatus(id: string, status: AgendaAppointment["status"]) {
    const supabase = createClient();
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o agendamento.");
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success("Agendamento atualizado.");
    void syncAppointmentToGoogleCalendarAction(id);
  }

  async function handleAssignProfessional(id: string, professionalId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ professional_id: professionalId })
      .eq("id", id);
    if (error) {
      toast.error(
        error.code === "23P01"
          ? "Esse profissional já tem outro agendamento nesse horário."
          : "Não foi possível atribuir o profissional.",
      );
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, professional_id: professionalId } : a)));
    toast.success("Profissional atribuído.");
    void syncAppointmentToGoogleCalendarAction(id);
  }

  async function handleConfirmCancel(motivo: string) {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    const resultado = await cancelAppointmentFromAgendaAction(id, motivo);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelado" } : a)));
    if (resultado.pagamentoRemovido) {
      // Entrada estornada com sucesso — o registro de receita já foi
      // removido no servidor, tira daqui também pra não mostrar valor
      // faturado num agendamento cancelado.
      setPayments((prev) => prev.filter((p) => p.appointment_id !== id));
    }
    if (resultado.avisoReembolso) {
      toast.warning(resultado.avisoReembolso);
    } else {
      toast.success("Agendamento cancelado.");
    }
    setCancelTarget(null);
  }

  function openPaymentModal(appointment: AgendaAppointment) {
    setPaymentTarget(appointment);
    setPaymentFormKey((k) => k + 1);
  }

  function handlePaymentCompleted(payment: AgendaPayment) {
    if (!paymentTarget) return;
    setAppointments((prev) =>
      prev.map((a) => (a.id === paymentTarget.id ? { ...a, status: "concluido" } : a)),
    );
    setPayments((prev) => {
      const outros = prev.filter((p) => p.appointment_id !== paymentTarget.id);
      return [...outros, { ...payment, appointment_id: paymentTarget.id }];
    });
    toast.success("Atendimento concluído.");
  }

  function handleCreated(appointment: AgendaAppointment, client: AgendaClient) {
    setClients((prev) => (prev.some((c) => c.id === client.id) ? prev : [...prev, client]));

    const diaDoAgendamento = formatInTimeZone(new Date(appointment.inicio), timezone, "yyyy-MM-dd");
    if (diaDoAgendamento === dataSelecionada) {
      setAppointments((prev) =>
        [...prev, appointment].sort((a, b) => a.inicio.localeCompare(b.inicio)),
      );
      toast.success("Agendamento criado.");
    } else {
      toast.success(`Agendamento criado para ${diaDoAgendamento.split("-").reverse().join("/")}.`);
    }
  }

  const paymentService = paymentTarget ? (servicesById.get(paymentTarget.service_id) ?? null) : null;
  const paymentClient = paymentTarget ? (clientsById.get(paymentTarget.client_id) ?? null) : null;
  const paymentExisting = paymentTarget ? paymentsByAppointment.get(paymentTarget.id) : undefined;
  const paymentProducts = paymentTarget ? (productsByAppointment.get(paymentTarget.id) ?? []) : [];

  function handleAdvanceLinkCreated(appointmentId: string, valor: number) {
    // Reflete "pendente" na hora, sem esperar recarregar a página — o
    // webhook do Mercado Pago é quem confirma de verdade quando o cliente
    // pagar (ver /api/webhooks/mercadopago?saldo=).
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, entrada_status: "pendente", entrada_valor: valor } : a,
      ),
    );
  }

  function handleBlockCreated(block: AgendaBlock) {
    setBlocks((prev) => [...prev, block].sort((a, b) => a.inicio.localeCompare(b.inicio)));
    toast.success("Horário bloqueado.");
  }

  async function handleRemoveBlock(id: string) {
    setRemovingBlockId(id);
    const supabase = createClient();
    const { error } = await supabase.from("agenda_blocks").delete().eq("id", id);
    setRemovingBlockId(null);
    if (error) {
      toast.error("Não foi possível remover o bloqueio.");
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    toast.success("Bloqueio removido.");
  }

  // Filtro em memória sobre os agendamentos já carregados do dia — sem nova
  // query, mesmo padrão usado na busca de /app/clientes. Bloqueios não têm
  // cliente, então continuam aparecendo independente da busca.
  const buscaDigits = normalizePhone(busca);
  const appointmentsFiltrados = appointments.filter((appointment) => {
    if (professionalFilter !== TODOS_PROFISSIONAIS && appointment.professional_id !== professionalFilter) {
      return false;
    }
    if (!busca.trim()) return true;
    const client = clientsById.get(appointment.client_id);
    if (!client) return false;
    const nomeMatch = client.nome.toLowerCase().includes(busca.trim().toLowerCase());
    const telefoneMatch = buscaDigits.length > 0 && client.telefone.includes(buscaDigits);
    return nomeMatch || telefoneMatch;
  });

  // Lista unificada (agendamentos + bloqueios) ordenada por horário, pra
  // renderizar tudo junto na ordem certa do dia — usada tanto pela Lista
  // quanto pela Grade. A Grade sempre usa todos os agendamentos do dia
  // (ignora a busca), já que ali o objetivo é ver o dia inteiro de relance.
  const dayItems: AgendaDayItem[] = [
    ...appointmentsFiltrados.map((appointment): AgendaDayItem => ({
      kind: "appointment",
      inicio: appointment.inicio,
      appointment,
    })),
    ...blocks.map((block): AgendaDayItem => ({ kind: "block", inicio: block.inicio, block })),
  ].sort((a, b) => a.inicio.localeCompare(b.inicio));

  const allDayItems: AgendaDayItem[] = [
    ...appointments.map((appointment): AgendaDayItem => ({
      kind: "appointment",
      inicio: appointment.inicio,
      appointment,
    })),
    ...blocks.map((block): AgendaDayItem => ({ kind: "block", inicio: block.inicio, block })),
  ].sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seus agendamentos do dia, com ações rápidas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BlockTimeDialog
            businessId={businessId}
            timezone={timezone}
            dataSelecionada={dataSelecionada}
            professionals={professionals}
            onCreated={handleBlockCreated}
          />
          <NewAppointmentDialog
            businessId={businessId}
            timezone={timezone}
            services={services}
            professionals={professionals}
            professionalServices={professionalServices}
            dataSelecionada={dataSelecionada}
            onCreated={handleCreated}
          />
        </div>
      </div>

      <DayNavigator businessId={businessId} timezone={timezone} dataSelecionada={dataSelecionada} hojeStr={hojeStr} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {appointments.length > 0 ? (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="inline-flex shrink-0 rounded-lg border border-border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "lista" ? "secondary" : "ghost"}
            onClick={() => setViewMode("lista")}
          >
            Lista
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "grade" ? "secondary" : "ghost"}
            onClick={() => setViewMode("grade")}
          >
            Grade
          </Button>
        </div>
      </div>

      {professionals.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={professionalFilter === TODOS_PROFISSIONAIS ? "secondary" : "outline"}
            onClick={() => setProfessionalFilter(TODOS_PROFISSIONAIS)}
          >
            Todos
          </Button>
          {professionals.map((professional) => (
            <Button
              key={professional.id}
              type="button"
              size="sm"
              variant={professionalFilter === professional.id ? "secondary" : "outline"}
              onClick={() => setProfessionalFilter(professional.id)}
            >
              {professional.nome}
            </Button>
          ))}
        </div>
      ) : null}

      {appointments.length === 0 && blocks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento para este dia.
          </CardContent>
        </Card>
      ) : viewMode === "grade" ? (
        <AgendaTimelineView
          dayItems={allDayItems}
          dayBlocks={dayBlocks}
          timezone={timezone}
          dataSelecionada={dataSelecionada}
          hojeStr={hojeStr}
          servicesById={servicesById}
          clientsById={clientsById}
          onSelectItem={handleSelectFromGrade}
        />
      ) : dayItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento encontrado para essa busca.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {dayItems.map((item) => {
            const domId = domIdForDayItem(item);
            const destacado = highlightedId === domId;
            return item.kind === "block" ? (
              <li key={domId} id={domId}>
                <Card
                  className={cn(
                    "border-dashed bg-muted/30 transition-shadow",
                    destacado && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatInTimeZone(new Date(item.block.inicio), timezone, "HH:mm")}–
                        {formatInTimeZone(new Date(item.block.fim), timezone, "HH:mm")}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        Horário bloqueado{item.block.motivo ? ` · ${item.block.motivo}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remover bloqueio"
                      disabled={removingBlockId === item.block.id}
                      onClick={() => handleRemoveBlock(item.block.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ) : (
              <li key={domId} id={domId} className={cn(destacado && "rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                <AppointmentCard
                  appointment={item.appointment}
                  service={servicesById.get(item.appointment.service_id)}
                  client={clientsById.get(item.appointment.client_id)}
                  payment={paymentsByAppointment.get(item.appointment.id)}
                  products={productsByAppointment.get(item.appointment.id) ?? []}
                  clientPlan={clientPlanByClient.get(item.appointment.client_id)}
                  professional={
                    item.appointment.professional_id
                      ? professionalsById.get(item.appointment.professional_id)
                      : undefined
                  }
                  professionals={professionals}
                  timezone={timezone}
                  nomeLoja={nomeLoja}
                  slug={slug}
                  whatsappTemplate={whatsappTemplate}
                  onConfirm={() => updateStatus(item.appointment.id, "confirmado")}
                  onCancel={() => setCancelTarget(item.appointment)}
                  onNoShow={() => updateStatus(item.appointment.id, "nao_compareceu")}
                  onComplete={() => openPaymentModal(item.appointment)}
                  onChargeAdvance={() => setChargeTarget(item.appointment)}
                  onAssignProfessional={(professionalId) =>
                    handleAssignProfessional(item.appointment.id, professionalId)
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      <PaymentModal
        open={paymentTarget !== null}
        formKey={paymentFormKey}
        appointment={paymentTarget}
        service={paymentService}
        client={paymentClient}
        existingPayment={paymentExisting}
        products={paymentProducts}
        onOpenChange={(open) => !open && setPaymentTarget(null)}
        onCompleted={handlePaymentCompleted}
      />

      <CancelAppointmentDialog
        appointment={cancelTarget}
        products={cancelTarget ? (productsByAppointment.get(cancelTarget.id) ?? []) : []}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />

      <AdvancePaymentDialog
        open={chargeTarget !== null}
        onOpenChange={(open) => !open && setChargeTarget(null)}
        appointment={chargeTarget}
        service={chargeTarget ? servicesById.get(chargeTarget.service_id) : undefined}
        client={chargeTarget ? clientsById.get(chargeTarget.client_id) : undefined}
        nomeLoja={nomeLoja}
        onLinkCreated={handleAdvanceLinkCreated}
      />
    </div>
  );
}

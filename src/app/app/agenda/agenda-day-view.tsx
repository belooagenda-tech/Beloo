"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { DayNavigator } from "./day-navigator";
import { AppointmentCard } from "./appointment-card";
import { PaymentModal } from "./payment-modal";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { cancelAppointmentFromAgendaAction } from "./actions";
import type { AgendaAppointment, AgendaClient, AgendaPayment, AgendaService } from "./types";

export function AgendaDayView({
  businessId,
  timezone,
  dataSelecionada,
  hojeStr,
  services,
  appointments: appointmentsIniciais,
  clients: clientsIniciais,
  payments: paymentsIniciais,
}: {
  businessId: string;
  timezone: string;
  bufferPadrao: number;
  dataSelecionada: string;
  hojeStr: string;
  services: AgendaService[];
  appointments: AgendaAppointment[];
  clients: AgendaClient[];
  payments: AgendaPayment[];
}) {
  const [appointments, setAppointments] = useState(appointmentsIniciais);
  const [clients, setClients] = useState(clientsIniciais);
  const [payments, setPayments] = useState(paymentsIniciais);
  const [paymentTarget, setPaymentTarget] = useState<AgendaAppointment | null>(null);
  const [paymentFormKey, setPaymentFormKey] = useState(0);

  const servicesById = new Map(services.map((s) => [s.id, s]));
  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const paymentsByAppointment = new Map(payments.map((p) => [p.appointment_id, p]));

  async function updateStatus(id: string, status: AgendaAppointment["status"]) {
    const supabase = createClient();
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o agendamento.");
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success("Agendamento atualizado.");
  }

  async function handleCancel(id: string) {
    const resultado = await cancelAppointmentFromAgendaAction(id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelado" } : a)));
    if (resultado.avisoReembolso) {
      toast.warning(resultado.avisoReembolso);
    } else {
      toast.success("Agendamento cancelado.");
    }
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seus agendamentos do dia, com ações rápidas.
          </p>
        </div>
        <NewAppointmentDialog
          businessId={businessId}
          timezone={timezone}
          services={services}
          dataSelecionada={dataSelecionada}
          onCreated={handleCreated}
        />
      </div>

      <DayNavigator dataSelecionada={dataSelecionada} hojeStr={hojeStr} />

      {appointments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento para este dia.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentCard
                appointment={appointment}
                service={servicesById.get(appointment.service_id)}
                client={clientsById.get(appointment.client_id)}
                payment={paymentsByAppointment.get(appointment.id)}
                timezone={timezone}
                onConfirm={() => updateStatus(appointment.id, "confirmado")}
                onCancel={() => handleCancel(appointment.id)}
                onNoShow={() => updateStatus(appointment.id, "nao_compareceu")}
                onComplete={() => openPaymentModal(appointment)}
              />
            </li>
          ))}
        </ul>
      )}

      <PaymentModal
        open={paymentTarget !== null}
        formKey={paymentFormKey}
        appointment={paymentTarget}
        service={paymentService}
        client={paymentClient}
        existingPayment={paymentExisting}
        onOpenChange={(open) => !open && setPaymentTarget(null)}
        onCompleted={handlePaymentCompleted}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DayTimePicker } from "../day-time-picker";
import {
  getAvailableSlotsAction,
  rescheduleAppointmentAction,
  type PublicAppointmentSummary,
} from "../actions";

export function RescheduleDialog({
  open,
  onOpenChange,
  slug,
  timezone,
  telefone,
  appointment,
  onRescheduled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  timezone: string;
  telefone: string;
  appointment: PublicAppointmentSummary | null;
  onRescheduled: (appointmentId: string, novoInicio: string) => void;
}) {
  const [slots, setSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !appointment) return;
    let ativo = true;
    (async () => {
      setError(null);
      setLoadingSlots(true);
      const resultado = await getAvailableSlotsAction(slug, appointment.serviceId);
      if (!ativo) return;
      setSlots(resultado);
      setLoadingSlots(false);
    })();
    return () => {
      ativo = false;
    };
  }, [open, appointment, slug]);

  async function handleSelect(novoInicioISO: string) {
    if (!appointment) return;
    setSubmitting(true);
    setError(null);
    const resultado = await rescheduleAppointmentAction(slug, appointment.id, telefone, novoInicioISO);
    setSubmitting(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    onRescheduled(appointment.id, resultado.novoInicio);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolher novo horário</DialogTitle>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {appointment ? (
          <DayTimePicker
            slots={slots}
            timezone={timezone}
            loading={loadingSlots || submitting}
            onSelect={handleSelect}
            onBack={() => onOpenChange(false)}
            backLabel="Cancelar"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

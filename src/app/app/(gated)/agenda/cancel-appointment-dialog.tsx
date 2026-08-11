"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AgendaAppointment, AgendaProduct } from "./types";

export function CancelAppointmentDialog({
  appointment,
  products,
  onOpenChange,
  onConfirm,
}: {
  appointment: AgendaAppointment | null;
  // Produtos que o cliente escolheu junto desse agendamento — o cancelamento
  // nunca apaga esses registros (ficam como histórico, ver
  // appointment_products), só avisa aqui pra o profissional saber que não
  // precisa mais separar o produto.
  products: AgendaProduct[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => Promise<void> | void;
}) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) setMotivo("");
    onOpenChange(open);
  }

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm(motivo);
    setSubmitting(false);
    setMotivo("");
  }

  return (
    <Dialog open={appointment !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar agendamento?</DialogTitle>
          <DialogDescription>
            O motivo é opcional, mas fica visível pro cliente quando ele consultar esse
            agendamento pelo link público.
          </DialogDescription>
        </DialogHeader>
        {products.length > 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Esse agendamento tinha produtos selecionados:{" "}
            {products.map((p) => `${p.quantidade}× ${p.nome_snapshot}`).join(", ")}. Não são
            cobrados ao cancelar.
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="motivo-cancelamento">Motivo (opcional)</Label>
          <Textarea
            id="motivo-cancelamento"
            placeholder="Ex.: imprevisto pessoal, troca de horário..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Cancelando..." : "Cancelar agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

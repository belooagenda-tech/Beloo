"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { OPCOES_ENTRADA_PERCENTUAL } from "@/lib/constants";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAdvancePaymentLinkAction } from "./actions";
import type { AgendaAppointment, AgendaClient, AgendaService } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdvancePaymentDialog({
  open,
  onOpenChange,
  appointment,
  service,
  client,
  nomeLoja,
  onLinkCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment | null;
  service: AgendaService | undefined;
  client: AgendaClient | undefined;
  nomeLoja: string;
  onLinkCreated: (appointmentId: string, valor: number) => void;
}) {
  const [percentual, setPercentual] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; valor: number } | null>(null);

  function handleClose(next: boolean) {
    if (!next) {
      // Reseta só depois do dialog fechar de vez, evita piscar o formulário
      // do zero enquanto a animação de saída ainda está rodando.
      setTimeout(() => {
        setLink(null);
        setError(null);
        setPercentual(100);
      }, 200);
    }
    onOpenChange(next);
  }

  async function handleGerar() {
    if (!appointment) return;
    setSubmitting(true);
    setError(null);
    const result = await createAdvancePaymentLinkAction(appointment.id, percentual);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLink({ url: result.paymentUrl, valor: result.valor });
    onLinkCreated(appointment.id, result.valor);
  }

  async function handleCopiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link manualmente.");
    }
  }

  const whatsappMsg =
    link && client
      ? `Oi, ${client.nome.split(" ")[0]}! Segue o link para pagar ${percentual < 100 ? "a entrada" : "o valor"} de ${formatarPreco(link.valor)} do seu horário na ${nomeLoja}: ${link.url}`
      : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrar pagamento antecipado</DialogTitle>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!link ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gera um link de pagamento do Mercado Pago para {client?.nome ?? "o cliente"} pagar
              antes do atendimento
              {service ? ` de ${service.nome} (${formatarPreco(service.preco)})` : ""}.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Quanto cobrar</label>
              <Select value={String(percentual)} onValueChange={(v) => setPercentual(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      const opcao = OPCOES_ENTRADA_PERCENTUAL.find((o) => String(o.valor) === value);
                      return opcao ? (opcao.valor === 100 ? "100% (valor cheio)" : opcao.label) : "Escolha...";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_ENTRADA_PERCENTUAL.map((o) => (
                    <SelectItem key={o.valor} value={String(o.valor)}>
                      {o.valor === 100 ? "100% (valor cheio)" : o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {service ? (
                <p className="text-xs text-muted-foreground">
                  Equivale a {formatarPreco(Math.round(service.preco * percentual) / 100)}.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button onClick={handleGerar} disabled={submitting} className="w-full">
                {submitting ? "Gerando link..." : "Gerar link de pagamento"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Link gerado para {formatarPreco(link.valor)}. Envie para {client?.nome ?? "o cliente"} —
                assim que o pagamento for aprovado você recebe um aviso.
              </AlertDescription>
            </Alert>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {client ? (
                <Button
                  className="w-full"
                  nativeButton={false}
                  render={
                    <a href={buildWhatsAppLink(client.telefone, whatsappMsg)} target="_blank" rel="noreferrer" />
                  }
                >
                  <MessageCircle className="size-4" />
                  Enviar no WhatsApp
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="w-full" onClick={handleCopiar}>
                <Copy className="size-4" />
                Copiar link
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => handleClose(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

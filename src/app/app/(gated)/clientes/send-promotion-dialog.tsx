"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { sendPromotionAction } from "./promotion-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

function PromotionForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const resultado = await sendPromotionAction({ titulo, mensagem });
    setSubmitting(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    onOpenChange(false);
    toast.success(
      resultado.enviados > 0
        ? `Promoção enviada para ${resultado.enviados} cliente${resultado.enviados === 1 ? "" : "s"}.`
        : "Ninguém está com as notificações ativadas ainda — assim que algum cliente ativar, vai receber os próximos avisos.",
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enviar promoção</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Vai como notificação push pros clientes que já ativaram os avisos no celular — ótimo
          pra cupom de desconto, horário vago de última hora ou novidade.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="titulo-promocao">Título</Label>
          <Input
            id="titulo-promocao"
            placeholder="20% de desconto essa semana!"
            maxLength={60}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mensagem-promocao">Mensagem</Label>
          <Textarea
            id="mensagem-promocao"
            placeholder="Use o cupom PROMO20 e garanta seu horário essa semana."
            maxLength={300}
            rows={3}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar para todos os clientes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function SendPromotionDialog() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Megaphone className="size-4" />
            Enviar promoção
          </Button>
        }
      />
      <DialogContent>{open ? <PromotionForm key={formKey} onOpenChange={setOpen} /> : null}</DialogContent>
    </Dialog>
  );
}

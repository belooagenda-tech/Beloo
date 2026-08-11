"use client";

import { useState } from "react";
import { Camera, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { rateAppointmentAction, type RatableAppointment } from "../actions";

export function RateAppointmentDialog({
  open,
  onOpenChange,
  slug,
  telefone,
  appointment,
  onRated,
  nomeLoja,
  instagramUrl,
  googleReviewUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  telefone: string;
  appointment: RatableAppointment | null;
  onRated: (appointmentId: string) => void;
  nomeLoja: string;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Depois de avaliar no app, se a loja configurou Instagram e/ou Google em
  // Configurações, aproveita o momento (cliente satisfeito, acabou de dar
  // nota) pra convidar a avaliar lá também, em vez de fechar direto.
  const [etapa, setEtapa] = useState<"form" | "obrigado">("form");
  const temLinksExternos = Boolean(instagramUrl || googleReviewUrl);

  function resetEFechar() {
    setNota(0);
    setHoverNota(0);
    setComentario("");
    setError(null);
    setEtapa("form");
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!appointment) return;
    if (nota === 0) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const resultado = await rateAppointmentAction(slug, appointment.id, telefone, nota, comentario);
    setSubmitting(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    toast.success("Obrigado pela avaliação!");
    onRated(appointment.id);

    if (temLinksExternos) {
      setEtapa("obrigado");
    } else {
      resetEFechar();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : resetEFechar())}>
      <DialogContent>
        {etapa === "obrigado" ? (
          <>
            <DialogHeader>
              <DialogTitle>Obrigado pela avaliação! 🎉</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sua opinião também ajuda muito a divulgar o trabalho da {nomeLoja} — se puder, deixe
                uma avaliação por lá também:
              </p>
              <div className="flex flex-col gap-2">
                {instagramUrl ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    nativeButton={false}
                    render={<a href={instagramUrl} target="_blank" rel="noreferrer" />}
                  >
                    <Camera className="size-4" />
                    Seguir/avaliar no Instagram
                  </Button>
                ) : null}
                {googleReviewUrl ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    nativeButton={false}
                    render={<a href={googleReviewUrl} target="_blank" rel="noreferrer" />}
                  >
                    <Star className="size-4" />
                    Avaliar no Google
                  </Button>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" className="w-full" onClick={resetEFechar}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Avaliar {appointment?.servicoNome ?? "atendimento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div
                className="flex items-center justify-center gap-1.5"
                role="radiogroup"
                aria-label="Nota de 1 a 5 estrelas"
              >
                {[1, 2, 3, 4, 5].map((valor) => {
                  const preenchida = valor <= (hoverNota || nota);
                  return (
                    <button
                      key={valor}
                      type="button"
                      aria-label={`${valor} estrela${valor === 1 ? "" : "s"}`}
                      onClick={() => setNota(valor)}
                      onMouseEnter={() => setHoverNota(valor)}
                      onMouseLeave={() => setHoverNota(0)}
                      className="p-1"
                    >
                      <Star
                        className={cn(
                          "size-7 transition-colors",
                          preenchida ? "fill-warning text-warning" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comentario-avaliacao">Comentário (opcional)</Label>
                <Textarea
                  id="comentario-avaliacao"
                  placeholder="Conte como foi seu atendimento..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar avaliação"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type WaitlistEntryRow = {
  id: string;
  nome: string;
  telefone: string;
  observacao: string | null;
  servicoNome: string | null;
  profissionalNome: string | null;
};

export function WaitlistCard({
  nomeLoja,
  initialEntries,
}: {
  nomeLoja: string;
  initialEntries: WaitlistEntryRow[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);

  async function handleResolver(id: string) {
    setResolvendoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("waitlist_entries").update({ atendido: true }).eq("id", id);
    setResolvendoId(null);

    if (error) {
      toast.error("Não foi possível atualizar. Tente novamente.");
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Removido da lista de espera.");
  }

  if (entries.length === 0) return null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">
          Lista de espera ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{entry.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.servicoNome ?? "Qualquer serviço"}
                  {entry.profissionalNome ? ` · com ${entry.profissionalNome}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Chamar ${entry.nome} no WhatsApp`}
                  nativeButton={false}
                  render={
                    <a
                      href={buildWhatsAppLink(
                        entry.telefone,
                        `Oi, ${entry.nome}! Abriu um horário aqui na ${nomeLoja} — quer aproveitar?`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <MessageCircle className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Marcar como atendido"
                  disabled={resolvendoId === entry.id}
                  onClick={() => handleResolver(entry.id)}
                >
                  <Check className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

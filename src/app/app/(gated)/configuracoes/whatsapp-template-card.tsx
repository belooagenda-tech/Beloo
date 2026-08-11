"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_REMINDER_TEMPLATE } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLACEHOLDERS = [
  { chave: "{cliente}", exemplo: "Maria" },
  { chave: "{servico}", exemplo: "Corte feminino" },
  { chave: "{loja}", exemplo: "Studio Bela" },
  { chave: "{data_hora}", exemplo: "10/08 às 14:00" },
];

function preencherExemplo(template: string): string {
  let resultado = template;
  for (const p of PLACEHOLDERS) {
    resultado = resultado.split(p.chave).join(p.exemplo);
  }
  return resultado;
}

export function WhatsAppTemplateCard({
  businessId,
  template,
}: {
  businessId: string;
  template: string | null;
}) {
  const [valor, setValor] = useState(template ?? DEFAULT_REMINDER_TEMPLATE);
  const [submitting, setSubmitting] = useState(false);
  const preview = useMemo(() => preencherExemplo(valor || DEFAULT_REMINDER_TEMPLATE), [valor]);

  async function salvar(novoValor: string | null) {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ whatsapp_lembrete_template: novoValor })
      .eq("id", businessId);
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Mensagem atualizada.");
  }

  function handleRestaurarPadrao() {
    setValor(DEFAULT_REMINDER_TEMPLATE);
    salvar(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mensagem de lembrete no WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Personalize o texto que já vem pronto no botão &ldquo;Lembrar no WhatsApp&rdquo; da Agenda.
          Use{" "}
          {PLACEHOLDERS.map((p) => (
            <code key={p.chave} className="mx-0.5 rounded bg-muted px-1 py-0.5 text-xs">
              {p.chave}
            </code>
          ))}{" "}
          onde quiser — a Beloo troca pelos dados de cada agendamento.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-template">Mensagem</Label>
          <Textarea
            id="whatsapp-template"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Pré-visualização</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{preview}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            + link de remarcar/cancelar (adicionado automaticamente, não editável)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={submitting} onClick={() => salvar(valor.trim() || null)}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="outline" disabled={submitting} onClick={handleRestaurarPadrao}>
            Restaurar padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

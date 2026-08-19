"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ModoSelecaoProfissional } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPCOES: { valor: ModoSelecaoProfissional; label: string; descricao: string }[] = [
  {
    valor: "automatico",
    label: "Atribuição automática",
    descricao:
      "O cliente só escolhe o serviço e o horário — o sistema atribui um profissional disponível. Você pode reatribuir depois na Agenda.",
  },
  {
    valor: "cliente_escolhe",
    label: "Cliente escolhe",
    descricao: "O cliente escolhe com qual profissional quer ser atendido antes de ver os horários.",
  },
];

export function SelectionModeCard({
  businessId,
  initialModo,
}: {
  businessId: string;
  initialModo: ModoSelecaoProfissional;
}) {
  const [modo, setModo] = useState(initialModo);
  const [saving, setSaving] = useState(false);

  async function handleSelect(novoModo: ModoSelecaoProfissional) {
    if (novoModo === modo || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ modo_selecao_profissional: novoModo })
      .eq("id", businessId);
    setSaving(false);

    if (error) {
      toast.error("Não foi possível atualizar. Tente novamente.");
      return;
    }
    setModo(novoModo);
    toast.success("Preferência atualizada.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como o cliente escolhe o profissional</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {OPCOES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            disabled={saving}
            onClick={() => handleSelect(opcao.valor)}
            className={cn(
              "block w-full rounded-lg border p-3 text-left transition-colors",
              modo === opcao.valor
                ? "border-primary bg-secondary/60"
                : "border-border hover:border-primary/40",
            )}
          >
            <p className="text-sm font-medium text-foreground">{opcao.label}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{opcao.descricao}</p>
          </button>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">
          Só faz diferença nos serviços que já têm profissionais vinculados. Os demais
          continuam sem etapa de escolha, como sempre.
        </p>
      </CardContent>
    </Card>
  );
}

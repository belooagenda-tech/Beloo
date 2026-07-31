"use client";

import { useState } from "react";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import {
  disponibilidadePadrao,
  type DiaDisponibilidade,
} from "@/components/availability/types";
import {
  DISPONIBILIDADE_PADRAO_DIAS,
  DISPONIBILIDADE_PADRAO_FIM,
  DISPONIBILIDADE_PADRAO_INICIO,
  OPCOES_ANTECEDENCIA,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AvailabilityStep({
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  onSubmit: (values: {
    dias: DiaDisponibilidade[];
    antecedenciaMinutos: number;
    limiteDias: number;
  }) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [dias, setDias] = useState<DiaDisponibilidade[]>(
    disponibilidadePadrao(
      [...DISPONIBILIDADE_PADRAO_DIAS],
      DISPONIBILIDADE_PADRAO_INICIO,
      DISPONIBILIDADE_PADRAO_FIM,
    ),
  );
  const [antecedenciaMinutos, setAntecedenciaMinutos] = useState(60);
  const [limiteDias, setLimiteDias] = useState(30);

  return (
    <div className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Label className="mb-2 block">Quando você atende?</Label>
        <AvailabilityEditor value={dias} onChange={setDias} />
        <p className="mt-2 text-sm text-muted-foreground">
          Já preenchemos com segunda a sexta, 9h às 18h. Ajuste como preferir —
          dá para mudar isso depois em Disponibilidade.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Antecedência mínima</Label>
          <Select
            value={String(antecedenciaMinutos)}
            onValueChange={(v) => setAntecedenciaMinutos(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_ANTECEDENCIA.map((opcao) => (
                <SelectItem key={opcao.valor} value={String(opcao.valor)}>
                  {opcao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="limiteDias">Dias visíveis à frente</Label>
          <Input
            id="limiteDias"
            type="number"
            min={1}
            max={365}
            value={limiteDias}
            onChange={(e) => setLimiteDias(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={submitting}
          onClick={() => onSubmit({ dias, antecedenciaMinutos, limiteDias })}
        >
          {submitting ? "Finalizando..." : "Concluir e ir para a agenda"}
        </Button>
      </div>
    </div>
  );
}

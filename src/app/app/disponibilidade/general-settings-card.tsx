"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { OPCOES_ANTECEDENCIA } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GeneralSettingsCard({
  businessId,
  initialAntecedencia,
  initialLimiteDias,
  initialBufferPadrao,
}: {
  businessId: string;
  initialAntecedencia: number;
  initialLimiteDias: number;
  initialBufferPadrao: number;
}) {
  const [antecedenciaMinutos, setAntecedenciaMinutos] = useState(initialAntecedencia);
  const [limiteDias, setLimiteDias] = useState(initialLimiteDias);
  const [bufferPadrao, setBufferPadrao] = useState(initialBufferPadrao);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        antecedencia_minima_min: antecedenciaMinutos,
        limite_dias_futuro: limiteDias,
        buffer_padrao_min: bufferPadrao,
      })
      .eq("id", businessId);
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Configurações atualizadas.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regras de agendamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="bufferPadrao">Buffer padrão (min)</Label>
            <Input
              id="bufferPadrao"
              type="number"
              min={0}
              max={240}
              value={bufferPadrao}
              onChange={(e) => setBufferPadrao(Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          O buffer padrão é aplicado entre atendimentos quando o serviço não
          define um buffer próprio.
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}

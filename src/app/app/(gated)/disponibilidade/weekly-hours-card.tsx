"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import {
  businessHoursParaDias,
  diasParaBusinessHours,
  type DiaDisponibilidade,
} from "@/components/availability/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WeeklyHoursCard({
  businessId,
  initialHours,
}: {
  businessId: string;
  initialHours: { dia_semana: number; hora_inicio: string; hora_fim: string }[];
}) {
  const [dias, setDias] = useState<DiaDisponibilidade[]>(
    businessHoursParaDias(initialHours),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("replace_business_hours", {
      p_business_id: businessId,
      p_hours: diasParaBusinessHours(dias),
    });
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar seus horários. Tente novamente.");
      return;
    }
    toast.success("Horários atualizados.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Horários da semana</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvailabilityEditor value={dias} onChange={setDias} />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar horários"}
        </Button>
      </CardContent>
    </Card>
  );
}

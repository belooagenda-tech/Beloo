export type BusinessHourBlock = { dia_semana: number; hora_inicio: string; hora_fim: string };
export type ExceptionBlock = {
  data: string;
  tipo: "folga" | "horario_especial";
  hora_inicio: string | null;
  hora_fim: string | null;
};
export type TimeBlock = { hora_inicio: string; hora_fim: string };

// Resolve os blocos de expediente de UM dia específico — mesma regra de
// precedência do motor de disponibilidade pública (ver
// computeAvailableSlots em src/lib/booking/available-slots.ts): uma exceção
// do dia (folga fecha tudo; horário especial substitui) tem prioridade sobre
// o horário comercial recorrente da semana. Mantido como um helper próprio
// (em vez de reaproveitar o motor de disponibilidade) porque aqui o uso é só
// visual — desenhar a grade da Agenda — e não deve arriscar a lógica crítica
// de cálculo de horários que o link público de agendamento depende.
export function resolveDayBlocks(
  dateStr: string,
  weekday: number,
  businessHours: BusinessHourBlock[],
  exceptions: ExceptionBlock[],
): TimeBlock[] {
  const exception = exceptions.find((e) => e.data === dateStr);
  if (exception?.tipo === "folga") return [];
  if (exception?.tipo === "horario_especial" && exception.hora_inicio && exception.hora_fim) {
    return [{ hora_inicio: exception.hora_inicio, hora_fim: exception.hora_fim }];
  }
  return businessHours
    .filter((h) => h.dia_semana === weekday)
    .map((h) => ({ hora_inicio: h.hora_inicio.slice(0, 5), hora_fim: h.hora_fim.slice(0, 5) }))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}

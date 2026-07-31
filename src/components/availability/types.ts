export interface BlocoHorario {
  inicio: string;
  fim: string;
}

export interface DiaDisponibilidade {
  diaSemana: number;
  ativo: boolean;
  blocos: BlocoHorario[];
}

export const ORDEM_EXIBICAO_DIAS = [1, 2, 3, 4, 5, 6, 0];

export function disponibilidadePadrao(
  diasAtivos: number[],
  inicio: string,
  fim: string,
): DiaDisponibilidade[] {
  return ORDEM_EXIBICAO_DIAS.map((diaSemana) => ({
    diaSemana,
    ativo: diasAtivos.includes(diaSemana),
    blocos: diasAtivos.includes(diaSemana) ? [{ inicio, fim }] : [],
  }));
}

function truncarHora(hora: string): string {
  return hora.slice(0, 5);
}

export function businessHoursParaDias(
  rows: { dia_semana: number; hora_inicio: string; hora_fim: string }[],
): DiaDisponibilidade[] {
  return ORDEM_EXIBICAO_DIAS.map((diaSemana) => {
    const blocos = rows
      .filter((row) => row.dia_semana === diaSemana)
      .map((row) => ({ inicio: truncarHora(row.hora_inicio), fim: truncarHora(row.hora_fim) }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

    return { diaSemana, ativo: blocos.length > 0, blocos };
  });
}

export function diasParaBusinessHours(
  dias: DiaDisponibilidade[],
): { dia_semana: number; hora_inicio: string; hora_fim: string }[] {
  return dias.flatMap((dia) =>
    dia.ativo
      ? dia.blocos.map((bloco) => ({
          dia_semana: dia.diaSemana,
          hora_inicio: bloco.inicio,
          hora_fim: bloco.fim,
        }))
      : [],
  );
}

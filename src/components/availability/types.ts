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

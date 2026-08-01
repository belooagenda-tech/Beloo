export type PlanServiceLookup = { id: string; nome: string };

export type PlanListItem = {
  id: string;
  nome: string;
  valor_mensal: number;
  servicos_inclusos: { service_id: string; quantidade: number | null }[];
  ciclo_dias: number;
  ativo: boolean;
};

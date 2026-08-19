export type PublicBusiness = {
  id: string;
  nome_loja: string;
  slug: string;
  categoria: string | null;
  logo_url: string | null;
  timezone: string;
  entrada_ativa: boolean;
  entrada_percentual: number;
  modo_selecao_profissional: "cliente_escolhe" | "automatico";
};

export type PublicService = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
};

// Membro de equipe visível na vitrine (aba Equipe) — só aparece quando o
// serviço escolhido tem pelo menos um profissional vinculado.
export type PublicProfessional = {
  id: string;
  nome: string;
  foto_url: string | null;
};

export type PublicProduct = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
};

export type PublicPlan = {
  id: string;
  nome: string;
  valor_mensal: number;
  ciclo_dias: number;
  servicos_inclusos: { service_id: string; quantidade: number | null }[];
  permite_pagamento_online: boolean;
};

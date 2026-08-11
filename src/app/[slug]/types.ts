export type PublicBusiness = {
  id: string;
  nome_loja: string;
  slug: string;
  categoria: string | null;
  logo_url: string | null;
  timezone: string;
  entrada_ativa: boolean;
  entrada_percentual: number;
};

export type PublicService = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
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

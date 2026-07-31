export type PublicBusiness = {
  id: string;
  nome_loja: string;
  slug: string;
  categoria: string | null;
  logo_url: string | null;
  timezone: string;
};

export type PublicService = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
};

export const CATEGORIAS = [
  { value: "manicure", label: "Manicure e pedicure" },
  { value: "sobrancelhas", label: "Sobrancelhas e cílios" },
  { value: "cabeleireiro", label: "Cabeleireiro(a)" },
  { value: "barbeiro", label: "Barbeiro" },
  { value: "esteticista", label: "Esteticista" },
  { value: "maquiador", label: "Maquiador(a)" },
  { value: "outro", label: "Outro" },
] as const;

export const DIAS_SEMANA = [
  { value: 0, label: "Domingo", curto: "Dom" },
  { value: 1, label: "Segunda", curto: "Seg" },
  { value: 2, label: "Terça", curto: "Ter" },
  { value: 3, label: "Quarta", curto: "Qua" },
  { value: 4, label: "Quinta", curto: "Qui" },
  { value: 5, label: "Sexta", curto: "Sex" },
  { value: 6, label: "Sábado", curto: "Sáb" },
] as const;

export const DISPONIBILIDADE_PADRAO_DIAS = [1, 2, 3, 4, 5];
export const DISPONIBILIDADE_PADRAO_INICIO = "09:00";
export const DISPONIBILIDADE_PADRAO_FIM = "18:00";

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

export const OPCOES_ANTECEDENCIA = [
  { valor: 0, label: "Sem antecedência mínima" },
  { valor: 30, label: "30 minutos" },
  { valor: 60, label: "1 hora" },
  { valor: 120, label: "2 horas" },
  { valor: 240, label: "4 horas" },
  { valor: 1440, label: "1 dia" },
] as const;

// Precisa ficar em sincronia com a checagem em is_slug_available() /
// slug_not_reserved (supabase/migrations/20260731000006_reserved_slugs.sql).
export const SLUGS_RESERVADOS = [
  "entrar",
  "criar-agenda",
  "app",
  "api",
  "icon.svg",
  "manifest.json",
  "favicon.ico",
  "sw.js",
  "robots.txt",
  "sitemap.xml",
  "_next",
] as const;

export const CORES_SERVICO = [
  { valor: "#7C3AED", label: "Roxo" },
  { valor: "#FB7185", label: "Coral" },
  { valor: "#10B981", label: "Verde" },
  { valor: "#F59E0B", label: "Âmbar" },
  { valor: "#0EA5E9", label: "Azul" },
  { valor: "#EC4899", label: "Rosa" },
] as const;

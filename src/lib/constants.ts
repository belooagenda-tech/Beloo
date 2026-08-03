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

export const OPCOES_CANCELAMENTO = [
  { valor: 0, label: "A qualquer momento" },
  { valor: 2, label: "Até 2 horas antes" },
  { valor: 6, label: "Até 6 horas antes" },
  { valor: 12, label: "Até 12 horas antes" },
  { valor: 24, label: "Até 24 horas antes" },
  { valor: 48, label: "Até 48 horas antes" },
  { valor: 72, label: "Até 72 horas antes" },
] as const;

export const OPCOES_ENTRADA_PERCENTUAL = [
  { valor: 10, label: "10%" },
  { valor: 20, label: "20%" },
  { valor: 30, label: "30%" },
  { valor: 40, label: "40%" },
  { valor: 50, label: "50%" },
  { valor: 100, label: "100% (valor integral)" },
] as const;

// Tempo que um agendamento fica reservado aguardando o pagamento da entrada
// antes de ser liberado automaticamente (ver /api/cron/expire-entradas).
export const ENTRADA_EXPIRACAO_MINUTOS = 30;

// Precisa ficar em sincronia com a checagem em is_slug_available() /
// slug_not_reserved (supabase/migrations/20260731000006_reserved_slugs.sql).
export const SLUGS_RESERVADOS = [
  "entrar",
  "criar-agenda",
  "app",
  "api",
  "auth",
  "offline",
  "esqueci-senha",
  "redefinir-senha",
  "privacidade",
  "termos",
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

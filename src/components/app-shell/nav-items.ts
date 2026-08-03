import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Clock,
  Users,
  Repeat,
  Wallet,
  Settings,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Painel", icon: LayoutDashboard },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app/servicos", label: "Serviços", icon: Scissors },
  { href: "/app/disponibilidade", label: "Disponibilidade", icon: Clock },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/planos", label: "Planos", icon: Repeat },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
  { href: "/app/assinatura", label: "Assinatura", icon: Sparkles },
];

// No celular, a barra inferior só tem espaço pra poucos atalhos — os mais
// usados no dia a dia ficam fixos, o resto entra no menu "Mais".
const PRIMARY_MOBILE_HREFS = ["/app", "/app/agenda", "/app/clientes", "/app/financeiro"];

export const PRIMARY_MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  PRIMARY_MOBILE_HREFS.includes(item.href),
);

export const SECONDARY_MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !PRIMARY_MOBILE_HREFS.includes(item.href),
);

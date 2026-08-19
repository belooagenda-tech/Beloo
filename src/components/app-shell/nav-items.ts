import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Rocket,
  CalendarDays,
  Scissors,
  Package,
  Clock,
  Users,
  UserCog,
  Repeat,
  Wallet,
  Settings,
  Sparkles,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Painel", icon: LayoutDashboard },
  { href: "/app/primeiros-passos", label: "Primeiros passos", icon: Rocket },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app/servicos", label: "Serviços", icon: Scissors },
  { href: "/app/produtos", label: "Produtos", icon: Package },
  { href: "/app/equipe", label: "Equipe", icon: UserCog },
  { href: "/app/disponibilidade", label: "Disponibilidade", icon: Clock },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/planos", label: "Planos", icon: Repeat },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
  { href: "/app/assinatura", label: "Assinatura", icon: Sparkles },
  { href: "/app/suporte", label: "Suporte", icon: LifeBuoy },
];

export const ADMIN_NAV_ITEM: NavItem = { href: "/app/admin", label: "Admin", icon: ShieldCheck };

export function getNavItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
}

// No celular, a barra inferior só tem espaço pra poucos atalhos — os mais
// usados no dia a dia ficam fixos, o resto entra no menu "Mais".
const PRIMARY_MOBILE_HREFS = ["/app", "/app/agenda", "/app/clientes", "/app/financeiro"];

export const PRIMARY_MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  PRIMARY_MOBILE_HREFS.includes(item.href),
);

const SECONDARY_MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !PRIMARY_MOBILE_HREFS.includes(item.href),
);

export function getSecondaryMobileNavItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...SECONDARY_MOBILE_NAV_ITEMS, ADMIN_NAV_ITEM] : SECONDARY_MOBILE_NAV_ITEMS;
}

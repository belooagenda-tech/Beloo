import {
  CalendarDays,
  ShoppingBag,
  MessageCircle,
  Wallet,
  Repeat,
  Star,
  BarChart3,
  Gift,
  CalendarClock,
  QrCode,
  Bell,
  Smartphone,
  Sparkles,
  Users,
  Heart,
  ShieldCheck,
  Clock,
  Palette,
  Hand,
  Eye,
  Scissors,
  Link2,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";

// Conjunto curado de ícones que o Editor pode escolher para cards/itens de
// lista — nunca um nome de ícone livre, só uma dessas chaves.
export const ICONS = {
  "calendar-days": CalendarDays,
  "shopping-bag": ShoppingBag,
  "message-circle": MessageCircle,
  wallet: Wallet,
  repeat: Repeat,
  star: Star,
  "bar-chart-3": BarChart3,
  gift: Gift,
  "calendar-clock": CalendarClock,
  "qr-code": QrCode,
  bell: Bell,
  smartphone: Smartphone,
  sparkles: Sparkles,
  users: Users,
  heart: Heart,
  "shield-check": ShieldCheck,
  clock: Clock,
  palette: Palette,
  hand: Hand,
  eye: Eye,
  scissors: Scissors,
  link: Link2,
  "play-circle": PlayCircle,
} satisfies Record<string, LucideIcon>;

export const ICON_KEYS = Object.keys(ICONS) as [keyof typeof ICONS, ...(keyof typeof ICONS)[]];

export type IconKey = keyof typeof ICONS;

export function resolveIcon(key: string | undefined, fallback: LucideIcon): LucideIcon {
  if (key && key in ICONS) return ICONS[key as IconKey];
  return fallback;
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Deixa só a primeira letra maiúscula. Datas em pt-BR formatadas por
// Intl.DateTimeFormat vêm todas minúsculas ("segunda-feira, 3 de agosto") —
// a classe CSS `capitalize` maiuscula CADA palavra ("Segunda-Feira, 3 De
// Agosto"), o que fica errado em português.
export function capitalizeFirst(text: string) {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text
}

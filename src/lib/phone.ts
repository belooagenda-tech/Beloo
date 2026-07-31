export function normalizePhone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

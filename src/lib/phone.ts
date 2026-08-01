export function normalizePhone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

export function formatPhoneBR(telefone: string): string {
  const digits = normalizePhone(telefone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return telefone;
}

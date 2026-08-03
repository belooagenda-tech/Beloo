export function normalizePhone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

// Telefone brasileiro: DDD (2 dígitos) + número (8 ou 9 dígitos).
export function isValidBrazilianPhone(telefone: string): boolean {
  const digits = normalizePhone(telefone);
  return digits.length === 10 || digits.length === 11;
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

// Dias até o próximo aniversário do cliente — ignora o ano de nascimento
// armazenado, só compara mês/dia contra a data de referência. Se já passou
// esse ano, conta pro ano que vem (nunca retorna negativo).
export function diasAteProximoAniversario(dataNascimento: string, referencia: Date): number {
  const [, mesStr, diaStr] = dataNascimento.split("-");
  const mes = Number(mesStr);
  const dia = Number(diaStr);
  const hojeSemHora = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  let proximo = new Date(referencia.getFullYear(), mes - 1, dia);
  if (proximo < hojeSemHora) {
    proximo = new Date(referencia.getFullYear() + 1, mes - 1, dia);
  }
  return Math.round((proximo.getTime() - hojeSemHora.getTime()) / (24 * 60 * 60 * 1000));
}

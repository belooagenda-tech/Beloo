// Helpers client-side para o rastreamento do Meta. Só chamado a partir de
// Client Components — lê cookies e fbclid da URL, nunca roda no servidor.

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// _fbp é criado pelo próprio script do Pixel (fbevents.js) assim que ele
// carrega — só precisamos ler.
export function getFbp(): string | null {
  return readCookie("_fbp");
}

// _fbc também é criado pelo Pixel quando existe ?fbclid= na URL, mas só
// depois do script carregar. Como o cadastro pode terminar antes disso (ou o
// clique original ter acontecido numa página diferente da que carregou o
// wizard), sintetizamos o mesmo formato aqui como reforço: fb.1.<timestamp
// em ms>.<fbclid> (formato documentado pelo Meta para o parâmetro fbc).
export function getFbc(): string | null {
  const existing = readCookie("_fbc");
  if (existing) return existing;

  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid) return null;

  return `fb.1.${Date.now()}.${fbclid}`;
}

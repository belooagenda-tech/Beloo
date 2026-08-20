import "server-only";

// Cliente HTTP fino para a Google Calendar API + OAuth 2.0 do Google.
// Mesmo espírito do src/lib/mercadopago/client.ts: sem SDK, só fetch — a
// superfície que a Beloo usa é pequena (login OAuth, listar/criar/atualizar/
// apagar eventos) e não vale a pena puxar a dependência inteira
// (googleapis/google-auth-library) só por isso.

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// calendar.events cobre ler/criar/editar/apagar eventos em qualquer agenda
// que o usuário tenha acesso (inclusive a "primary") — não precisamos de
// mais nada (não mexemos na lista de agendas nem nas configurações da
// conta). userinfo.email só identifica qual Gmail foi conectado, pra exibir
// em Configurações.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados.");
  }
  return { clientId, clientSecret };
}

function redirectUri() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL não configurado.");
  return `${siteUrl}/api/google-calendar/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = credentials();
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  // Força a tela de consentimento sempre — é o único jeito de garantir que o
  // Google devolva um refresh_token toda vez (sem isso, reconectar uma conta
  // que já autorizou antes só devolve access_token, e a conexão para de
  // funcionar assim que ele expira).
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

// Carrega o status HTTP — sync.ts usa isso pra distinguir "o evento já não
// existe do lado do Google" (404/410, recria em vez de falhar) de qualquer
// outro erro (token inválido, payload rejeitado, etc.), que deve propagar.
export class GoogleApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
  }
}

async function parseJsonOrThrow(response: Response, action: string) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error_description ?? body?.error?.message ?? body?.error ?? response.statusText;
    throw new GoogleApiError(`Google Calendar: falha em ${action} (${response.status}): ${message}`, response.status);
  }
  return body;
}

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
};

export async function exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
  const { clientId, clientSecret } = credentials();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  });
  const data = await parseJsonOrThrow(response, "trocar código OAuth");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresInSeconds: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
  const { clientId, clientSecret } = credentials();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await parseJsonOrThrow(response, "renovar token");
  return {
    accessToken: data.access_token,
    // O Google normalmente NÃO devolve um novo refresh_token nesse fluxo —
    // quem chama deve manter o antigo quando vier null.
    refreshToken: data.refresh_token ?? null,
    expiresInSeconds: data.expires_in,
  };
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.email ?? null;
}

export type GoogleEventDateTime = { dateTime?: string; date?: string; timeZone?: string };

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  extendedProperties?: { private?: Record<string, string> };
};

export type UpsertEventInput = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties?: { private: Record<string, string> };
};

function calendarUrl(calendarId: string, path = "") {
  return `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events${path}`;
}

// Lista eventos futuros (e recentes) de uma agenda, paginando até o limite —
// suficiente pra qualquer uso real do importador; um profissional com mais
// de ~2500 eventos num período de 6 meses é um caso que não existe na
// prática, e travar a paginação evita um loop infinito por bug da API.
export async function listEvents(
  accessToken: string,
  calendarId: string,
  range: { timeMinISO: string; timeMaxISO: string },
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const url = new URL(calendarUrl(calendarId));
    url.searchParams.set("timeMin", range.timeMinISO);
    url.searchParams.set("timeMax", range.timeMaxISO);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await parseJsonOrThrow(response, "listar eventos");
    for (const item of data.items ?? []) {
      if (item.status === "cancelled") continue;
      events.push(item);
    }
    pageToken = data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < 10);

  return events;
}

export async function getEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarEvent | null> {
  const response = await fetch(calendarUrl(calendarId, `/${encodeURIComponent(eventId)}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404 || response.status === 410) return null;
  const data = await parseJsonOrThrow(response, "buscar evento");
  if (data.status === "cancelled") return null;
  return data;
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  event: UpsertEventInput,
): Promise<GoogleCalendarEvent> {
  const response = await fetch(calendarUrl(calendarId), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(event),
  });
  return parseJsonOrThrow(response, "criar evento");
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: UpsertEventInput,
): Promise<GoogleCalendarEvent> {
  const response = await fetch(calendarUrl(calendarId, `/${encodeURIComponent(eventId)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(event),
  });
  return parseJsonOrThrow(response, "atualizar evento");
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(calendarUrl(calendarId, `/${encodeURIComponent(eventId)}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 404/410: o evento já não existe do lado do Google (apagado por lá
  // manualmente, por exemplo) — não é erro pra quem chamou, o resultado que
  // importa (evento fora da agenda) já é verdade.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    await parseJsonOrThrow(response, "apagar evento");
  }
}

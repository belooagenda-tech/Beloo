import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { refreshAccessToken } from "./client";

export type GoogleCalendarConnectionInfo = {
  calendarId: string;
  exportEnabled: boolean;
  googleEmail: string | null;
};

export async function getConnectionInfo(
  admin: SupabaseClient<Database>,
  businessId: string,
): Promise<GoogleCalendarConnectionInfo | null> {
  const { data } = await admin
    .from("google_calendar_connections")
    .select("calendar_id, export_enabled, google_email")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!data) return null;
  return { calendarId: data.calendar_id, exportEnabled: data.export_enabled, googleEmail: data.google_email };
}

// Mesmo padrão de src/lib/mercadopago/connection.ts: devolve um access_token
// válido, renovando via refresh_token quando estiver perto de expirar.
export async function getValidAccessToken(
  admin: SupabaseClient<Database>,
  businessId: string,
): Promise<string | null> {
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!connection) return null;

  const accessToken = decryptSecret(connection.access_token);

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const expiresSoon = expiresAt - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon) return accessToken;

  try {
    const refreshed = await refreshAccessToken(decryptSecret(connection.refresh_token));
    await admin
      .from("google_calendar_connections")
      .update({
        access_token: encryptSecret(refreshed.accessToken),
        // O Google normalmente não devolve um novo refresh_token nesse
        // fluxo — só grava por cima se vier um (senão mantém o já salvo).
        ...(refreshed.refreshToken ? { refresh_token: encryptSecret(refreshed.refreshToken) } : {}),
        token_expires_at: new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);
    return refreshed.accessToken;
  } catch {
    // Falhou a renovação (refresh_token revogado no lado do Google, ex.: o
    // profissional removeu o acesso da Beloo na própria conta) — devolve o
    // token atual como último recurso; se também estiver vencido, quem
    // chamou trata o erro da API do Google normalmente (best-effort, nunca
    // deve travar a criação/cancelamento do agendamento em si).
    return accessToken;
  }
}

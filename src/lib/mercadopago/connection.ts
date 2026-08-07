import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { refreshAccessToken } from "./client";

// Retorna um access_token válido para a loja, renovando via refresh_token
// quando estiver perto de expirar. Usado em todo lugar que precisa chamar a
// API do Mercado Pago em nome do profissional (checkout, consulta de
// pagamento, reembolso) — sempre com createAdminClient(), nunca client-side.
export async function getValidAccessToken(
  admin: SupabaseClient<Database>,
  businessId: string,
): Promise<string | null> {
  const { data: connection } = await admin
    .from("mp_connections")
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
      .from("mp_connections")
      .update({
        access_token: encryptSecret(refreshed.accessToken),
        refresh_token: encryptSecret(refreshed.refreshToken),
        public_key: refreshed.publicKey,
        token_expires_at: new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString(),
      })
      .eq("business_id", businessId);
    return refreshed.accessToken;
  } catch {
    // Falhou a renovação (refresh_token revogado/expirado) — devolve o token
    // atual como último recurso; se também estiver vencido, quem chamou trata
    // o erro da API do Mercado Pago normalmente.
    return accessToken;
  }
}

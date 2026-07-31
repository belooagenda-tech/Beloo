import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cliente com a service role key — ignora RLS por completo.
 * Só pode ser importado em código que roda exclusivamente no servidor
 * (Server Components, Server Actions). O pacote `server-only` quebra o
 * build se algum Client Component acabar importando este arquivo.
 *
 * Nunca repasse os resultados brutos deste cliente para o browser: quem
 * chama é responsável por selecionar só as colunas seguras para expor
 * publicamente (ver src/lib/booking e src/app/[slug]).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

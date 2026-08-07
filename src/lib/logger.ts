import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Logging estruturado para erros server-side (achado 🟠 da auditoria de
// 2026-08-07). Duas saídas, as duas melhor que só console.error solto:
// 1) console.error em JSON — a Vercel já indexa e permite buscar por campo;
// 2) tabela error_logs — alimenta a aba "Logs" em /app/admin/logs, onde o
//    dono da Beloo vê e resolve erros de operações dos assinantes sem
//    precisar de um APM externo.
//
// A gravação em (2) é "melhor esforço": nunca aguardada pelo chamador nem
// deixada derrubar o fluxo principal por causa de uma falha do logger em si.
export function logError(scope: string, error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(JSON.stringify({ level: "error", scope, message, stack, ...context, timestamp: new Date().toISOString() }));

  const businessId = extractBusinessId(context);
  const admin = createAdminClient();
  admin
    .from("error_logs")
    .insert({ scope, message, business_id: businessId, context })
    .then(({ error: insertError }) => {
      if (insertError) {
        // Não usa logError aqui (evita recursão) — só um console.error puro.
        console.error("Beloo: falha ao persistir error_log", insertError.message);
      }
    });
}

export function logWarn(scope: string, message: string, context: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ level: "warn", scope, message, ...context, timestamp: new Date().toISOString() }));
}

function extractBusinessId(context: Record<string, unknown>): string | null {
  const candidato = context.businessId ?? context.business_id;
  return typeof candidato === "string" ? candidato : null;
}

"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REF_COOKIE_NAME } from "@/lib/divulgador/referral-cookie";
import { notifyAdmins } from "@/lib/push/notify";

// Vincula o profissional recém-criado ao divulgador do cookie de indicação,
// se houver um. Nunca bloqueia nem falha visivelmente pro profissional — é
// um efeito colateral de "melhor esforço" no fim do passo 2 do wizard
// (criação da loja), chamado sem aguardar (fire-and-forget) pelo client.
export async function linkReferralIfPresentAction(businessId: string): Promise<void> {
  const store = await cookies();
  const codigoAfiliado = store.get(REF_COOKIE_NAME)?.value;
  if (!codigoAfiliado) return;

  const admin = createAdminClient();

  const { data: divulgador } = await admin
    .from("divulgadores")
    .select("id, email, status")
    .eq("codigo_afiliado", codigoAfiliado)
    .maybeSingle();
  if (!divulgador || divulgador.status !== "ativo") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const [{ data: business }, { data: profile }] = await Promise.all([
    admin.from("businesses").select("id, profile_id").eq("id", businessId).maybeSingle(),
    admin.from("profiles").select("email").eq("id", user.id).maybeSingle(),
  ]);
  // Confere que o business é mesmo da sessão atual — evita linkar um
  // businessId arbitrário passado pelo client a um divulgador qualquer.
  if (!business || business.profile_id !== user.id) return;

  // Bloqueia o profissional se indicar (mesmo e-mail cadastrado como
  // divulgador e como profissional).
  if (profile?.email && profile.email.trim().toLowerCase() === divulgador.email) return;

  // profissional_id é unique em indicacoes — uma segunda tentativa (ex.:
  // o passo é re-executado) simplesmente falha em silêncio, sem duplicar
  // nem sobrescrever o vínculo já existente.
  await admin.from("indicacoes").insert({
    divulgador_id: divulgador.id,
    profissional_id: businessId,
  });
}

// Avisa os admins da plataforma (sino + push) assim que um profissional cria
// a loja — mesmo padrão de "melhor esforço" acima: chamado sem aguardar
// (fire-and-forget) pelo client no fim do passo 2 do wizard, nunca bloqueia
// nem falha visivelmente pro profissional.
export async function notifyAdminsOfNewSignupAction(businessId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("nome_loja, slug")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return;

  await notifyAdmins(admin, {
    tipo: "novo_profissional",
    titulo: "Novo profissional cadastrado",
    corpo: `${business.nome_loja} acabou de criar a agenda (/${business.slug}).`,
    url: "/app/admin",
  });
}

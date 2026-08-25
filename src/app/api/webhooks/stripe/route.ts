import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { constructWebhookEvent, stripe } from "@/lib/stripe/client";
import { logError } from "@/lib/logger";
import { getMetaUserDataForBusiness, sendCancelSubscriptionEvent, sendSubscribeEvent } from "@/lib/meta-ads/capi";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Admin = SupabaseClient<Database>;

// ============================================================================
// account.updated — onboarding do divulgador na Stripe Connect
// ============================================================================
async function handleAccountUpdated(admin: Admin, account: Stripe.Account) {
  const { data: divulgador } = await admin
    .from("divulgadores")
    .select("id, stripe_onboarding_completo")
    .eq("stripe_account_id", account.id)
    .maybeSingle();
  if (!divulgador) return NextResponse.json({ ok: true });

  const completo = Boolean(account.charges_enabled);
  if (completo !== divulgador.stripe_onboarding_completo) {
    await admin
      .from("divulgadores")
      .update({ stripe_onboarding_completo: completo })
      .eq("id", divulgador.id);
  }

  return NextResponse.json({ ok: true });
}

// ============================================================================
// checkout.session.completed — assinatura Beloo (SaaS) criada com sucesso.
// Só nos interessa quando é a Checkout Session da assinatura da plataforma
// (mode subscription + client_reference_id = business_id); qualquer outro
// uso futuro de Checkout Session no projeto passa direto por aqui sem efeito.
// ============================================================================
async function handleCheckoutSessionCompleted(admin: Admin, session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.client_reference_id) {
    return NextResponse.json({ ok: true });
  }

  const businessId = session.client_reference_id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!subscriptionId || !customerId) {
    return new NextResponse("Missing subscription/customer on session", { status: 400 });
  }

  // Indicação (se existir) já foi gravada no cadastro do profissional —
  // aqui só consulta pra saber se essa assinatura nasce com split ou não.
  const { data: indicacao } = await admin
    .from("indicacoes")
    .select("divulgador_id")
    .eq("profissional_id", businessId)
    .maybeSingle();

  await admin.from("assinaturas_stripe").upsert(
    {
      profissional_id: businessId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      divulgador_id: indicacao?.divulgador_id ?? null,
    },
    { onConflict: "profissional_id" },
  );

  return NextResponse.json({ ok: true });
}

// Acha o business_id dono de uma assinatura Stripe. Fonte principal é
// assinaturas_stripe (gravada por handleCheckoutSessionCompleted); fallback
// é subscription_details.metadata.business_id, uma cópia imutável dos
// metadados da subscription no momento em que a invoice foi finalizada (ver
// createSaasCheckoutSession — grava business_id em subscription_data.metadata).
//
// O fallback existe porque checkout.session.completed e
// invoice.payment_succeeded chegam como dois webhooks separados, quase
// simultâneos, sem ordem garantida — em produção já aconteceu de
// invoice.payment_succeeded chegar (e ser processado) ANTES de
// checkout.session.completed criar a linha em assinaturas_stripe. Sem esse
// fallback, o handler original tratava "linha ainda não existe" como
// "não é assinatura da Beloo, ignora" — devolvia 200 (sem erro, sem log, sem
// retry do Stripe) e a assinatura ficava presa em "trial" para sempre, com
// o pagamento já aprovado na Stripe.
async function resolveBusinessIdForInvoice(
  admin: Admin,
  invoice: Stripe.Invoice,
  subscriptionId: string,
): Promise<{ businessId: string; divulgadorId: string | null } | null> {
  const { data: assinatura } = await admin
    .from("assinaturas_stripe")
    .select("profissional_id, divulgador_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (assinatura) {
    return { businessId: assinatura.profissional_id, divulgadorId: assinatura.divulgador_id };
  }

  const businessId = invoice.parent?.subscription_details?.metadata?.business_id;
  if (!businessId) return null;

  // Linha ainda não existia (a corrida descrita acima) — recria agora com o
  // que dá pra saber neste momento, pro resto do fluxo (e as próximas
  // invoices) achar a assinatura normalmente. divulgador_id vem de
  // `indicacoes`, mesma fonte que handleCheckoutSessionCompleted usa.
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const { data: indicacao } = await admin
    .from("indicacoes")
    .select("divulgador_id")
    .eq("profissional_id", businessId)
    .maybeSingle();

  await admin.from("assinaturas_stripe").upsert(
    {
      profissional_id: businessId,
      stripe_customer_id: customerId ?? "",
      stripe_subscription_id: subscriptionId,
      divulgador_id: indicacao?.divulgador_id ?? null,
    },
    { onConflict: "profissional_id" },
  );

  return { businessId, divulgadorId: indicacao?.divulgador_id ?? null };
}

// ============================================================================
// invoice.payment_succeeded — cada cobrança mensal aprovada. Atualiza o
// status de acesso (saas_subscriptions, mesma tabela/campos que o Mercado
// Pago já escreve) e, se houver divulgador vinculado, grava o espelho local
// da comissão (a Stripe já fez o split de verdade via application_fee).
// ============================================================================
async function handleInvoicePaymentSucceeded(admin: Admin, invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId) return NextResponse.json({ ok: true });

  const resolved = await resolveBusinessIdForInvoice(admin, invoice, subscriptionId);
  if (!resolved) {
    // Nem a linha existe nem a subscription carrega business_id nos
    // metadados — algo fora do fluxo normal (ex.: assinatura Stripe criada
    // manualmente no dashboard). Loga pra investigar; não é um erro
    // transitório que valha a pena o Stripe reentregar.
    logError("stripe_webhook.invoice_succeeded.sem_business_id", new Error("business_id não encontrado"), {
      invoiceId: invoice.id,
      subscriptionId,
    });
    return NextResponse.json({ ok: true });
  }
  const { businessId, divulgadorId } = resolved;

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  // Atômico e separado do update "geral" logo abaixo: só dispara Subscribe
  // quando ESTE request é quem tira a assinatura de "trial" (não uma
  // renovação, nem uma reentrega do mesmo webhook do Stripe pra essa mesma
  // fatura — a segunda tentativa encontra status já "ativo" e não bate
  // nenhuma linha no `.eq("status", "trial")`).
  const { data: activation } = await admin
    .from("saas_subscriptions")
    .update({ status: "ativo" })
    .eq("business_id", businessId)
    .eq("status", "trial")
    .select("id");
  const isFirstActivation = (activation?.length ?? 0) > 0;

  await admin
    .from("saas_subscriptions")
    .update({
      status: "ativo",
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : undefined,
    })
    .eq("business_id", businessId);

  // Além de "era trial", só conta como assinatura paga de verdade se a
  // fatura realmente cobrou algo — algumas configurações de trial no Stripe
  // emitem uma invoice.payment_succeeded de R$0 na entrada do trial, e essa
  // não pode contar como conversão "Subscribe" pro Meta.
  if (isFirstActivation && invoice.amount_paid > 0) {
    const userData = await getMetaUserDataForBusiness(admin, businessId);
    await sendSubscribeEvent({
      businessId,
      eventId: randomUUID(),
      value: invoice.amount_paid / 100,
      userData,
    });
  }

  if (divulgadorId) {
    const { data: divulgador } = await admin
      .from("divulgadores")
      .select("percentual_comissao")
      .eq("id", divulgadorId)
      .maybeSingle();

    // A Invoice (recurso lido via webhook) não expõe application_fee_amount
    // para faturas de assinatura nesta versão da API Stripe — só existe em
    // InvoiceCreateParams/UpdateParams (faturamento avulso manual). Por isso
    // calculamos a comissão aqui a partir do percentual configurado, em vez
    // de tentar ler um campo que não existe na fatura de assinatura.
    const valorAssinatura = invoice.amount_paid / 100;
    const percentual = divulgador?.percentual_comissao ?? 0;
    const valorComissao = Math.round(valorAssinatura * percentual) / 100;

    // stripe_invoice_id é único — upsert com ignoreDuplicates garante que
    // reentrega do webhook nunca duplica a comissão.
    await admin.from("comissoes_registro").upsert(
      {
        divulgador_id: divulgadorId,
        profissional_id: businessId,
        stripe_invoice_id: invoice.id!,
        valor_assinatura: valorAssinatura,
        percentual_aplicado: percentual,
        valor_comissao: valorComissao,
        status: "confirmado",
      },
      { onConflict: "stripe_invoice_id", ignoreDuplicates: true },
    );
  }

  return NextResponse.json({ ok: true });
}

// ============================================================================
// invoice.payment_failed — não bloqueia nada por conta própria (Stripe já
// tenta recobrar automaticamente); só refletimos o status de "atrasado"
// pro gating de acesso não achar que está tudo bem.
// ============================================================================
async function handleInvoicePaymentFailed(admin: Admin, invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId) return NextResponse.json({ ok: true });

  // Mesmo fallback de handleInvoicePaymentSucceeded — evita a mesma corrida
  // com checkout.session.completed (ver resolveBusinessIdForInvoice).
  const resolved = await resolveBusinessIdForInvoice(admin, invoice, subscriptionId);
  if (!resolved) return NextResponse.json({ ok: true });

  await admin
    .from("saas_subscriptions")
    .update({ status: "atrasado" })
    .eq("business_id", resolved.businessId);

  return NextResponse.json({ ok: true });
}

// ============================================================================
// customer.subscription.deleted — assinatura cancelada. Só atualiza status;
// sem split a desfazer (Stripe já não cobra mais nada, então não há mais
// nenhuma cobrança futura pra dividir).
// ============================================================================
async function handleSubscriptionDeleted(admin: Admin, subscription: Stripe.Subscription) {
  const { data: assinatura } = await admin
    .from("assinaturas_stripe")
    .select("profissional_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (!assinatura) return NextResponse.json({ ok: true });

  // Atômico, mesmo padrão do resto deste arquivo: só quem realmente tira o
  // status de "cancelado" dispara o evento — reentrega do webhook não conta
  // duas vezes.
  const { data: updated } = await admin
    .from("saas_subscriptions")
    .update({ status: "cancelado" })
    .eq("business_id", assinatura.profissional_id)
    .neq("status", "cancelado")
    .select("id");

  if ((updated?.length ?? 0) > 0) {
    const userData = await getMetaUserDataForBusiness(admin, assinatura.profissional_id);
    await sendCancelSubscriptionEvent({
      businessId: assinatura.profissional_id,
      eventId: randomUUID(),
      userData,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    logError("stripe_webhook.assinatura_invalida", err);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const admin = createAdminClient();

  // Qualquer exceção não tratada nos handlers abaixo (falha de rede com a
  // Stripe, erro inesperado de banco etc.) precisa: (1) ficar registrada em
  // error_logs — antes desta captura, um erro assim desaparecia sem deixar
  // rastro em nenhum lugar visível no admin; e (2) devolver 5xx, pro Stripe
  // reentregar o webhook automaticamente em vez de dar como entregue.
  try {
    switch (event.type) {
      case "account.updated":
        return await handleAccountUpdated(admin, event.data.object);
      case "checkout.session.completed":
        return await handleCheckoutSessionCompleted(admin, event.data.object);
      case "invoice.payment_succeeded":
        return await handleInvoicePaymentSucceeded(admin, event.data.object);
      case "invoice.payment_failed":
        return await handleInvoicePaymentFailed(admin, event.data.object);
      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(admin, event.data.object);
      default:
        break;
    }
  } catch (err) {
    logError("stripe_webhook.falha_processamento", err, { eventType: event.type, eventId: event.id });
    return new NextResponse("Internal error", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

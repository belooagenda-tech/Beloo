import "server-only";
import Stripe from "stripe";

// Usado só para: (1) a assinatura recorrente da própria Beloo (SaaS) e
// (2) as contas conectadas dos divulgadores + split automático dessa
// assinatura. Nunca usado para nada do fluxo profissional↔cliente — isso
// continua 100% Mercado Pago (ver src/lib/mercadopago/client.ts).
let stripeClient: Stripe | null = null;

export function stripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurado.");
  }
  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

// ============================================================================
// Contas conectadas (divulgadores) — Stripe Connect Express
// ============================================================================

export async function createExpressAccount(email: string): Promise<string> {
  const account = await stripe().accounts.create({
    type: "express",
    email,
    capabilities: {
      // Para contas no Brasil, a Stripe exige card_payments junto de
      // transfers — só transfers isolado é rejeitado com
      // "You cannot request the `transfers` capability without the
      // `card_payments` capability for accounts in BR" (confirmado em
      // produção). O divulgador não processa cobranças por conta própria,
      // mas a capability precisa estar ativa mesmo assim.
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account.id;
}

export async function createAccountOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export type AccountOnboardingStatus = { chargesEnabled: boolean; payoutsEnabled: boolean };

export async function getAccountOnboardingStatus(accountId: string): Promise<AccountOnboardingStatus> {
  const account = await stripe().accounts.retrieve(accountId);
  return {
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
  };
}

// ============================================================================
// Assinatura Beloo (SaaS) — Checkout Session em modo subscription. Preço
// montado na hora (price_data) porque valor_mensal é configurável pelo admin
// em saas_plans, não um Price fixo cadastrado na Stripe.
// ============================================================================

export type CreateSaasCheckoutInput = {
  businessId: string;
  email: string;
  valorMensal: number;
  successUrl: string;
  cancelUrl: string;
  // Presentes só quando o profissional veio de uma indicação com divulgador
  // de onboarding completo — nesse caso a cobrança já nasce dividida.
  split?: { destinationAccountId: string; applicationFeePercent: number };
};

export async function createSaasCheckoutSession(
  input: CreateSaasCheckoutInput,
): Promise<{ url: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email,
    client_reference_id: input.businessId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: Math.round(input.valorMensal * 100),
          recurring: { interval: "month" },
          product_data: { name: "Assinatura Beloo" },
        },
      },
    ],
    subscription_data: {
      metadata: { business_id: input.businessId },
      ...(input.split
        ? {
            application_fee_percent: input.split.applicationFeePercent,
            transfer_data: { destination: input.split.destinationAccountId },
          }
        : {}),
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe não retornou a URL do checkout.");
  }
  return { url: session.url };
}

export async function getCheckoutSession(sessionId: string) {
  return stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
}

export async function cancelStripeSubscription(subscriptionId: string): Promise<void> {
  await stripe().subscriptions.cancel(subscriptionId);
}

// ============================================================================
// Webhook
// ============================================================================

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurado.");
  }
  return stripe().webhooks.constructEvent(payload, signature, secret);
}

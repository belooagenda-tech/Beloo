import "server-only";

const API_BASE = "https://api.mercadopago.com";

function credentials() {
  const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MERCADO_PAGO_CLIENT_ID/MERCADO_PAGO_CLIENT_SECRET não configurados.");
  }
  return { clientId, clientSecret };
}

function redirectUri() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL não configurado.");
  return `${siteUrl}/api/mercadopago/callback`;
}

async function parseJsonOrThrow(response: Response, action: string) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message ?? body?.error ?? response.statusText;
    throw new Error(`Mercado Pago: falha em ${action} (${response.status}): ${message}`);
  }
  return body;
}

export type MpOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  publicKey: string | null;
  userId: string;
  expiresInSeconds: number;
};

export async function exchangeCodeForToken(code: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = credentials();
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
    refreshToken: data.refresh_token,
    publicKey: data.public_key ?? null,
    userId: String(data.user_id),
    expiresInSeconds: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = credentials();
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await parseJsonOrThrow(response, "renovar token");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    publicKey: data.public_key ?? null,
    userId: String(data.user_id),
    expiresInSeconds: data.expires_in,
  };
}

export type CreatePreferenceInput = {
  title: string;
  amount: number;
  externalReference: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
};

export async function createPreference(accessToken: string, input: CreatePreferenceInput) {
  const response = await fetch(`${API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          unit_price: input.amount,
          currency_id: "BRL",
        },
      ],
      external_reference: input.externalReference,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: "approved",
      notification_url: input.notificationUrl,
    }),
  });
  const data = await parseJsonOrThrow(response, "criar preferência de pagamento");
  return { id: data.id as string, initPoint: data.init_point as string };
}

export type MpPayment = {
  id: string;
  status: string;
  externalReference: string | null;
  transactionAmount: number;
};

export async function getPayment(accessToken: string, paymentId: string): Promise<MpPayment> {
  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await parseJsonOrThrow(response, "consultar pagamento");
  return {
    id: String(data.id),
    status: data.status,
    externalReference: data.external_reference ?? null,
    transactionAmount: data.transaction_amount,
  };
}

export async function refundPayment(accessToken: string, paymentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    await parseJsonOrThrow(response, "reembolsar pagamento");
  }
}

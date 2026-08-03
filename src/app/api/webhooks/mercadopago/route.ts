import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook-signature";
import { getPayment } from "@/lib/mercadopago/client";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { notifyProfessional } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointment");
  const dataId = searchParams.get("data.id") ?? searchParams.get("id");

  if (!appointmentId || !dataId) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const verified = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!verified) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: appointment } = await admin
    .from("appointments")
    .select("id, business_id, client_id, service_id, entrada_status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) {
    // Nada a fazer — respondemos 200 para o Mercado Pago não ficar retentando.
    return NextResponse.json({ ok: true });
  }

  // Idempotência: se a entrada já foi resolvida (paga/reembolsada/expirada),
  // não reprocessa — evita duplicar notificação em reentregas do webhook.
  if (appointment.entrada_status !== "pendente") {
    return NextResponse.json({ ok: true });
  }

  const accessToken = await getValidAccessToken(admin, appointment.business_id);
  if (!accessToken) {
    return new NextResponse("No Mercado Pago connection", { status: 409 });
  }

  const payment = await getPayment(accessToken, dataId).catch(() => null);
  if (!payment || payment.externalReference !== appointment.id) {
    return new NextResponse("Payment mismatch", { status: 400 });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("profile_id, timezone")
    .eq("id", appointment.business_id)
    .single();

  if (payment.status === "approved") {
    await admin
      .from("appointments")
      .update({ status: "agendado", entrada_status: "pago", mp_payment_id: payment.id })
      .eq("id", appointment.id);

    if (business) {
      const [{ data: client }, { data: service }] = await Promise.all([
        admin.from("clients").select("nome").eq("id", appointment.client_id).maybeSingle(),
        admin.from("services").select("nome").eq("id", appointment.service_id).maybeSingle(),
      ]);
      try {
        await notifyProfessional(admin, {
          profileId: business.profile_id,
          tipo: "entrada_paga",
          titulo: "Entrada paga",
          corpo: `${client?.nome ?? "Cliente"} pagou a entrada de ${service?.nome ?? "um atendimento"} e o horário está confirmado.`,
          appointmentId: appointment.id,
          url: "/app/agenda",
        });
      } catch {
        // não bloqueia a confirmação do pagamento
      }
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await admin
      .from("appointments")
      .update({ status: "cancelado", entrada_status: "expirado", mp_payment_id: payment.id })
      .eq("id", appointment.id);
  }
  // outros status (pending, in_process) — não faz nada, espera a próxima notificação.

  return NextResponse.json({ ok: true });
}

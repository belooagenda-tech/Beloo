"use server";

import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailableSlotsForService } from "@/lib/booking/get-available-slots";
import { normalizePhone } from "@/lib/phone";
import { clientInfoSchema } from "@/lib/validations/public-booking";
import { notifyProfessional } from "@/lib/push/notify";

export async function getAvailableSlotsAction(
  slug: string,
  serviceId: string,
): Promise<Record<string, string[]>> {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return {};

  const slots = await getAvailableSlotsForService(business.id, serviceId);
  return slots ?? {};
}

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

export async function createAppointmentAction(input: {
  slug: string;
  serviceId: string;
  inicioISO: string;
  nome: string;
  telefone: string;
}): Promise<CreateAppointmentResult> {
  const parsed = clientInfoSchema.safeParse({ nome: input.nome, telefone: input.telefone });
  if (!parsed.success) {
    return { ok: false, error: "Confira seu nome e WhatsApp e tente novamente." };
  }

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, profile_id, timezone")
    .eq("slug", input.slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: service } = await supabase
    .from("services")
    .select("id, nome, duracao_min, ativo")
    .eq("id", input.serviceId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!service || !service.ativo) {
    return { ok: false, error: "Esse serviço não está mais disponível." };
  }

  const slots = await getAvailableSlotsForService(business.id, service.id);
  const disponivel = Object.values(slots ?? {}).some((horarios) =>
    horarios.includes(input.inicioISO),
  );
  if (!disponivel) {
    return { ok: false, error: "Esse horário não está mais disponível. Escolha outro." };
  }

  const inicio = new Date(input.inicioISO);
  const fim = addMinutes(inicio, service.duracao_min);
  const telefoneNormalizado = normalizePhone(parsed.data.telefone);

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id, nome")
    .eq("business_id", business.id)
    .eq("telefone", telefoneNormalizado)
    .maybeSingle();

  let clientId = existingClient?.id;
  const clientNome = existingClient?.nome ?? parsed.data.nome;

  if (!clientId) {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({ business_id: business.id, nome: parsed.data.nome, telefone: telefoneNormalizado })
      .select("id")
      .single();
    if (clientError || !newClient) {
      return { ok: false, error: "Não foi possível concluir o agendamento. Tente novamente." };
    }
    clientId = newClient.id;
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      business_id: business.id,
      client_id: clientId,
      service_id: service.id,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: "agendado",
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return {
      ok: false,
      error:
        appointmentError?.code === "23P01"
          ? "Esse horário acabou de ser preenchido por outro cliente. Escolha outro horário."
          : "Não foi possível concluir o agendamento. Tente novamente.",
    };
  }

  const horario = formatInTimeZone(inicio, business.timezone, "dd/MM 'às' HH:mm");
  try {
    await notifyProfessional(supabase, {
      profileId: business.profile_id,
      tipo: "novo_agendamento",
      titulo: "Novo agendamento",
      corpo: `${clientNome} agendou ${service.nome} para ${horario}.`,
      appointmentId: appointment.id,
      url: "/app/agenda",
    });
  } catch {
    // O agendamento já foi criado com sucesso; falha ao notificar não pode
    // derrubar a resposta para o cliente.
  }

  return { ok: true, appointmentId: appointment.id };
}

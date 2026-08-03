"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { CATEGORIAS } from "@/lib/constants";
import type { ClientInfoInput } from "@/lib/validations/public-booking";
import { getAvailableSlotsAction, createAppointmentAction } from "./actions";
import { ServicePicker } from "./service-picker";
import { DayTimePicker } from "./day-time-picker";
import { ClientInfoForm } from "./client-info-form";
import type { PublicBusiness, PublicService } from "./types";

type Step = "servico" | "horario" | "dados";

export function PublicBookingFlow({
  business,
  services,
}: {
  business: PublicBusiness;
  services: PublicService[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("servico");
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [slots, setSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriaLabel = CATEGORIAS.find((c) => c.value === business.categoria)?.label;

  async function handleSelectService(service: PublicService) {
    setSelectedService(service);
    setStep("horario");
    setLoadingSlots(true);
    const result = await getAvailableSlotsAction(business.slug, service.id);
    setSlots(result);
    setLoadingSlots(false);
  }

  function handleSelectSlot(iso: string) {
    setSelectedIso(iso);
    setError(null);
    setStep("dados");
  }

  async function handleSubmit(values: ClientInfoInput) {
    if (!selectedService || !selectedIso) return;
    setSubmitting(true);
    setError(null);

    const result = await createAppointmentAction({
      slug: business.slug,
      serviceId: selectedService.id,
      inicioISO: selectedIso,
      nome: values.nome,
      telefone: values.telefone,
      empresa: values.empresa,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    router.push(`/${business.slug}/confirmacao?a=${result.appointmentId}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={business.nome_loja}
                className="mb-3 size-16 rounded-full object-cover"
              />
            ) : null}
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              {business.nome_loja}
            </h1>
            {categoriaLabel ? (
              <p className="text-sm text-muted-foreground">{categoriaLabel}</p>
            ) : null}
          </div>

          {step === "servico" ? (
            <div className="space-y-4">
              <ServicePicker services={services} onSelect={handleSelectService} />
              <p className="text-center text-sm text-muted-foreground">
                Já tem um agendamento?{" "}
                <Link
                  href={`/${business.slug}/meus-agendamentos`}
                  className="font-medium text-primary hover:underline"
                >
                  Ver ou cancelar
                </Link>
              </p>
            </div>
          ) : null}

          {step === "horario" && selectedService ? (
            <DayTimePicker
              slots={slots}
              timezone={business.timezone}
              loading={loadingSlots}
              onSelect={handleSelectSlot}
              onBack={() => setStep("servico")}
            />
          ) : null}

          {step === "dados" && selectedService && selectedIso ? (
            <ClientInfoForm
              service={selectedService}
              inicioISO={selectedIso}
              timezone={business.timezone}
              onSubmit={handleSubmit}
              onBack={() => setStep("horario")}
              submitting={submitting}
              error={error}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

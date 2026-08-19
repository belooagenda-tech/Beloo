"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { CATEGORIAS } from "@/lib/constants";
import type { ClientInfoInput } from "@/lib/validations/public-booking";
import { getAvailableSlotsAction, createAppointmentAction } from "./actions";
import { ServicePicker } from "./service-picker";
import { ProfessionalPicker } from "./professional-picker";
import { DayTimePicker } from "./day-time-picker";
import { ProductPicker } from "./product-picker";
import { ClientInfoForm } from "./client-info-form";
import { PlansSection } from "./plans-section";
import type {
  PublicBusiness,
  PublicPlan,
  PublicProduct,
  PublicProfessional,
  PublicService,
} from "./types";

type Step = "servico" | "profissional" | "horario" | "produtos" | "dados";

export function PublicBookingFlow({
  business,
  services,
  plans,
  products,
  professionals,
  professionalServices,
}: {
  business: PublicBusiness;
  services: PublicService[];
  plans: PublicPlan[];
  products: PublicProduct[];
  professionals: PublicProfessional[];
  professionalServices: { professional_id: string; service_id: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("servico");
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  // undefined = sem preferência (atribuição automática); string = escolhido
  // pelo cliente na etapa de profissional.
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [slots, setSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  // productId -> quantidade. Fica no estado do flow inteiro (não só do step)
  // pra sobreviver caso o cliente volte pra trocar o horário e volte aqui.
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriaLabel = CATEGORIAS.find((c) => c.value === business.categoria)?.label;

  const professionalsById = new Map(professionals.map((p) => [p.id, p]));
  // Profissionais elegíveis pro serviço escolhido — vazio quando o serviço
  // ainda não tem ninguém vinculado na aba Equipe (fluxo segue igual a
  // antes da Equipe existir, sem etapa de escolha).
  const eligibleProfessionals = selectedService
    ? professionalServices
        .filter((ps) => ps.service_id === selectedService.id)
        .map((ps) => professionalsById.get(ps.professional_id))
        .filter((p): p is PublicProfessional => p !== undefined)
    : [];
  const mostraEscolhaProfissional =
    business.modo_selecao_profissional === "cliente_escolhe" && eligibleProfessionals.length > 0;

  async function fetchSlots(service: PublicService, professionalId: string | undefined) {
    setStep("horario");
    setLoadingSlots(true);
    const result = await getAvailableSlotsAction(business.slug, service.id, professionalId);
    setSlots(result);
    setLoadingSlots(false);
  }

  async function handleSelectService(service: PublicService) {
    setSelectedService(service);
    setSelectedProfessionalId(undefined);

    const elegiveis = professionalServices
      .filter((ps) => ps.service_id === service.id)
      .map((ps) => professionalsById.get(ps.professional_id))
      .filter((p): p is PublicProfessional => p !== undefined);

    if (business.modo_selecao_profissional === "cliente_escolhe" && elegiveis.length > 0) {
      setStep("profissional");
      return;
    }

    await fetchSlots(service, undefined);
  }

  async function handleSelectProfessional(professionalId: string | undefined) {
    if (!selectedService) return;
    setSelectedProfessionalId(professionalId);
    await fetchSlots(selectedService, professionalId);
  }

  function handleSelectSlot(iso: string) {
    setSelectedIso(iso);
    setError(null);
    setStep(products.length > 0 ? "produtos" : "dados");
  }

  async function handleSubmit(values: ClientInfoInput) {
    if (!selectedService || !selectedIso) return;
    setSubmitting(true);
    setError(null);

    const produtosSelecionados = Object.entries(selectedProducts).map(([productId, quantidade]) => ({
      productId,
      quantidade,
    }));

    const result = await createAppointmentAction({
      slug: business.slug,
      serviceId: selectedService.id,
      inicioISO: selectedIso,
      nome: values.nome,
      telefone: values.telefone,
      empresa: values.empresa,
      produtos: produtosSelecionados,
      professionalId: selectedProfessionalId,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    if (result.pagamentoUrl) {
      window.location.href = result.pagamentoUrl;
      return;
    }

    router.push(`/${business.slug}/confirmacao?a=${result.appointmentId}`);
  }

  const entradaValor =
    business.entrada_ativa && business.entrada_percentual > 0 && selectedService
      ? Math.round(selectedService.preco * business.entrada_percentual) / 100
      : undefined;

  // Produtos ficam de fora do cálculo da entrada de propósito — a entrada
  // continua sendo só sobre o serviço (mesma regra de sempre); o valor dos
  // produtos é cobrado junto do restante, no dia do atendimento.
  const produtosTotal = products.reduce(
    (acc, p) => acc + (selectedProducts[p.id] ?? 0) * p.preco,
    0,
  );

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.nome_loja}
                width={64}
                height={64}
                priority
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
              <PlansSection slug={business.slug} plans={plans} services={services} />
            </div>
          ) : null}

          {step === "profissional" && selectedService ? (
            <ProfessionalPicker
              professionals={eligibleProfessionals}
              onSelect={handleSelectProfessional}
              onBack={() => setStep("servico")}
            />
          ) : null}

          {step === "horario" && selectedService ? (
            <DayTimePicker
              slots={slots}
              timezone={business.timezone}
              loading={loadingSlots}
              onSelect={handleSelectSlot}
              slug={business.slug}
              serviceId={selectedService.id}
              professionals={eligibleProfessionals}
              backLabel={mostraEscolhaProfissional ? "Trocar profissional" : "Trocar serviço"}
              onBack={() => setStep(mostraEscolhaProfissional ? "profissional" : "servico")}
            />
          ) : null}

          {step === "produtos" && selectedService ? (
            <ProductPicker
              products={products}
              selected={selectedProducts}
              onChange={setSelectedProducts}
              onContinue={() => setStep("dados")}
              onBack={() => setStep("horario")}
            />
          ) : null}

          {step === "dados" && selectedService && selectedIso ? (
            <ClientInfoForm
              slug={business.slug}
              service={selectedService}
              inicioISO={selectedIso}
              timezone={business.timezone}
              entradaValor={entradaValor}
              produtosTotal={produtosTotal}
              backLabel={products.length > 0 ? "Ver produtos" : "Trocar horário"}
              onSubmit={handleSubmit}
              onBack={() => setStep(products.length > 0 ? "produtos" : "horario")}
              submitting={submitting}
              error={error}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

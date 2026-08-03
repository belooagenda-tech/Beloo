"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AccountInput, StoreInput } from "@/lib/validations/onboarding";
import type { DiaDisponibilidade } from "@/components/availability/types";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "./wizard-progress";
import { AccountStep } from "./steps/account-step";
import { StoreStep } from "./steps/store-step";
import { CategoryStep } from "./steps/category-step";
import { LogoStep } from "./steps/logo-step";
import { AvailabilityStep } from "./steps/availability-step";

type Step = 1 | 2 | 3 | 4 | 5;

export function OnboardingWizard({ startStep }: { startStep: Step }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState<Step>(startStep);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [nomeLoja, setNomeLoja] = useState("");
  const [slug, setSlug] = useState("");
  const [categoria, setCategoria] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  async function handleAccountSubmit(values: AccountInput) {
    setSubmitting(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.senha,
      options: {
        data: { nome: values.nome, telefone: values.telefone },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Esse e-mail já está cadastrado. Que tal entrar na sua conta?"
          : "Não foi possível criar sua conta agora. Tente novamente.",
      );
      return;
    }

    if (!data.session) {
      setNeedsEmailConfirmation(values.email);
      return;
    }

    setStep(2);
  }

  async function handleStoreSubmit(values: StoreInput) {
    setSubmitting(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      setError("Sua sessão expirou. Recarregue a página e entre novamente.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("businesses")
      .insert({ profile_id: user.id, nome_loja: values.nomeLoja, slug: values.slug })
      .select("id")
      .single();
    setSubmitting(false);

    if (insertError || !data) {
      setError(
        insertError?.code === "23505"
          ? "Esse link já está em uso, escolha outro."
          : "Não foi possível salvar sua loja. Tente novamente.",
      );
      return;
    }

    setBusinessId(data.id);
    setNomeLoja(values.nomeLoja);
    setSlug(values.slug);
    setStep(3);
  }

  async function handleCategorySubmit(value: string) {
    if (!businessId) return;
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ categoria: value })
      .eq("id", businessId);
    setSubmitting(false);

    if (updateError) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }

    setCategoria(value);
    setStep(4);
  }

  async function handleLogoSubmit(file: File) {
    if (!businessId) return;
    setSubmitting(true);
    setError(null);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${businessId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setSubmitting(false);
      setError("Não foi possível enviar a imagem. Tente novamente.");
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ logo_url: `${publicUrlData.publicUrl}?v=${Date.now()}` })
      .eq("id", businessId);
    setSubmitting(false);

    if (updateError) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }

    setStep(5);
  }

  async function handleAvailabilitySubmit(values: {
    dias: DiaDisponibilidade[];
    antecedenciaMinutos: number;
    limiteDias: number;
  }) {
    if (!businessId) return;
    setSubmitting(true);
    setError(null);

    const rows = values.dias.flatMap((dia) =>
      dia.ativo
        ? dia.blocos.map((bloco) => ({
            business_id: businessId,
            dia_semana: dia.diaSemana,
            hora_inicio: bloco.inicio,
            hora_fim: bloco.fim,
          }))
        : [],
    );

    if (rows.length > 0) {
      const { error: hoursError } = await supabase.from("business_hours").insert(rows);
      if (hoursError) {
        setSubmitting(false);
        setError("Não foi possível salvar sua disponibilidade. Tente novamente.");
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        antecedencia_minima_min: values.antecedenciaMinutos,
        limite_dias_futuro: values.limiteDias,
      })
      .eq("id", businessId);
    setSubmitting(false);

    if (updateError) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  if (needsEmailConfirmation) {
    async function handleReenviar() {
      if (!needsEmailConfirmation) return;
      setReenviando(true);
      await supabase.auth.resend({ type: "signup", email: needsEmailConfirmation });
      setReenviando(false);
      setReenviado(true);
    }

    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <MailCheck className="size-6 text-secondary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong>{needsEmailConfirmation}</strong>.
          Abra seu e-mail e clique no link para continuar criando sua agenda.
        </p>
        {reenviado ? (
          <p className="text-sm font-medium text-success">E-mail reenviado.</p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleReenviar}
            disabled={reenviando}
          >
            {reenviando ? "Reenviando..." : "Não recebeu? Reenviar e-mail"}
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/entrar">Já confirmei, ir para o login</Link>}
        />
      </div>
    );
  }

  return (
    <div>
      <WizardProgress current={step} />
      {step === 1 ? (
        <AccountStep onSubmit={handleAccountSubmit} submitting={submitting} error={error} />
      ) : null}
      {step === 2 ? (
        <StoreStep
          defaultNomeLoja={nomeLoja}
          defaultSlug={slug}
          onSubmit={handleStoreSubmit}
          onBack={() => setStep(1)}
          submitting={submitting}
          error={error}
        />
      ) : null}
      {step === 3 ? (
        <CategoryStep
          defaultValue={categoria}
          onSubmit={handleCategorySubmit}
          onBack={() => setStep(2)}
          submitting={submitting}
        />
      ) : null}
      {step === 4 ? (
        <LogoStep
          onSubmit={handleLogoSubmit}
          onSkip={() => setStep(5)}
          onBack={() => setStep(3)}
          submitting={submitting}
          error={error}
        />
      ) : null}
      {step === 5 ? (
        <AvailabilityStep
          onSubmit={handleAvailabilitySubmit}
          onBack={() => setStep(4)}
          submitting={submitting}
          error={error}
        />
      ) : null}
    </div>
  );
}

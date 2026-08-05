"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  divulgadorCadastroSchema,
  type DivulgadorCadastroInput,
} from "@/lib/validations/divulgador";
import { registerDivulgadorAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CadastroForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DivulgadorCadastroInput>({ resolver: zodResolver(divulgadorCadastroSchema) });

  async function onSubmit(values: DivulgadorCadastroInput) {
    setServerError(null);
    setSubmitting(true);
    const resultado = await registerDivulgadorAction(values);
    if (!resultado.ok) {
      setSubmitting(false);
      setServerError(resultado.error);
      return;
    }
    window.location.assign(resultado.onboardingUrl);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" autoComplete="name" placeholder="Como podemos te chamar" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          {...register("email")}
        />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          {...register("senha")}
        />
        {errors.senha ? <p className="text-sm text-destructive">{errors.senha.message}</p> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Depois de cadastrar, você vai completar seus dados bancários direto
        com a Stripe — a Beloo nunca guarda essas informações.
      </p>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Criando cadastro..." : "Criar cadastro de divulgador"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já é divulgador?{" "}
        <Link href="/divulgador/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

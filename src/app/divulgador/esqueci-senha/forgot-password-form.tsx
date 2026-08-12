"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import {
  divulgadorForgotPasswordSchema,
  type DivulgadorForgotPasswordInput,
} from "@/lib/validations/divulgador";
import { requestDivulgadorPasswordResetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [enviado, setEnviado] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DivulgadorForgotPasswordInput>({ resolver: zodResolver(divulgadorForgotPasswordSchema) });

  async function onSubmit(values: DivulgadorForgotPasswordInput) {
    setServerError(null);
    const resultado = await requestDivulgadorPasswordResetAction(values.email);
    if (!resultado.ok) {
      setServerError(resultado.error);
      return;
    }
    // Não revelamos se o e-mail existe ou não — evita que alguém use este
    // formulário para descobrir quais e-mails têm cadastro de divulgador.
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <MailCheck className="size-6 text-secondary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Se esse e-mail tiver um cadastro de divulgador ativo, a equipe da Beloo vai te chamar em
          instantes com um link pra criar uma nova senha.
        </p>
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/divulgador/login">Voltar para o login</Link>}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Solicitar recuperação"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link href="/divulgador/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setEmailNaoConfirmado(null);
    setReenviado(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.senha,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        setEmailNaoConfirmado(values.email);
        return;
      }
      setServerError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente em instantes.",
      );
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  async function handleReenviar() {
    if (!emailNaoConfirmado) return;
    setReenviando(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email: emailNaoConfirmado });
    setReenviando(false);
    setReenviado(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {emailNaoConfirmado ? (
        <Alert>
          <AlertDescription className="space-y-2">
            <p>
              Seu e-mail ainda não foi confirmado. Verifique sua caixa de
              entrada ou reenvie o link de confirmação.
            </p>
            {reenviado ? (
              <p className="text-sm font-medium text-success">E-mail reenviado.</p>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReenviar}
                disabled={reenviando}
              >
                {reenviando ? "Reenviando..." : "Reenviar e-mail de confirmação"}
              </Button>
            )}
          </AlertDescription>
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
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link href="/esqueci-senha" className="text-sm text-primary hover:underline">
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("senha")}
        />
        {errors.senha ? (
          <p className="text-sm text-destructive">{errors.senha.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem uma agenda?{" "}
        <Link href="/criar-agenda" className="font-medium text-primary hover:underline">
          Criar minha agenda
        </Link>
      </p>
    </form>
  );
}

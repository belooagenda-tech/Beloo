"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { divulgadorLoginSchema, type DivulgadorLoginInput } from "@/lib/validations/divulgador";
import { loginDivulgadorAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DivulgadorLoginInput>({ resolver: zodResolver(divulgadorLoginSchema) });

  async function onSubmit(values: DivulgadorLoginInput) {
    setServerError(null);
    const resultado = await loginDivulgadorAction(values);
    if (!resultado.ok) {
      setServerError(resultado.error);
      return;
    }
    router.replace("/divulgador/dashboard");
    router.refresh();
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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link href="/divulgador/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
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
        {errors.senha ? <p className="text-sm text-destructive">{errors.senha.message}</p> : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não é divulgador?{" "}
        <Link href="/divulgador/cadastro" className="font-medium text-primary hover:underline">
          Criar cadastro
        </Link>
      </p>
    </form>
  );
}

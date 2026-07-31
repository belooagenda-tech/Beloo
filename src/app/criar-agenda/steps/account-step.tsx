"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { accountSchema, type AccountInput } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AccountStep({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit: (values: AccountInput) => void;
  submitting: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountInput>({ resolver: zodResolver(accountSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" autoComplete="name" placeholder="Ana Souza" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone">WhatsApp</Label>
        <Input
          id="telefone"
          autoComplete="tel"
          placeholder="(21) 99999-9999"
          {...register("telefone")}
        />
        {errors.telefone ? (
          <p className="text-sm text-destructive">{errors.telefone.message}</p>
        ) : null}
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
        <Label htmlFor="senha">Crie uma senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Pelo menos 6 caracteres"
          {...register("senha")}
        />
        {errors.senha ? <p className="text-sm text-destructive">{errors.senha.message}</p> : null}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Criando conta..." : "Continuar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma agenda?{" "}
        <Link href="/entrar" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

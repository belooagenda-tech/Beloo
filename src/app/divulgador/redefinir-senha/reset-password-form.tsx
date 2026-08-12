"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  divulgadorNewPasswordSchema,
  type DivulgadorNewPasswordInput,
} from "@/lib/validations/divulgador";
import { resetDivulgadorPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DivulgadorNewPasswordInput>({ resolver: zodResolver(divulgadorNewPasswordSchema) });

  async function onSubmit(values: DivulgadorNewPasswordInput) {
    setServerError(null);
    const resultado = await resetDivulgadorPasswordAction(token, values.senha, values.confirmarSenha);
    if (!resultado.ok) {
      setServerError(resultado.error);
      return;
    }
    router.replace("/divulgador/dashboard");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <Alert variant="destructive">
          <AlertDescription>Link inválido. Peça uma nova recuperação de senha.</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/divulgador/esqueci-senha">Pedir novo link</Link>}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {serverError}
            {serverError.includes("expirou") || serverError.includes("já foi usado") ? (
              <>
                {" "}
                <Link href="/divulgador/esqueci-senha" className="font-medium underline">
                  Pedir novo link
                </Link>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Pelo menos 8 caracteres"
          {...register("senha")}
        />
        {errors.senha ? <p className="text-sm text-destructive">{errors.senha.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmarSenha">Confirme a nova senha</Label>
        <Input
          id="confirmarSenha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          {...register("confirmarSenha")}
        />
        {errors.confirmarSenha ? (
          <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}

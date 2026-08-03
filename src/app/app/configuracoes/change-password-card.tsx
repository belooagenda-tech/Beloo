"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ChangePasswordCard() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

  async function onSubmit(values: NewPasswordInput) {
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: values.senha });

    if (updateError) {
      setError("Não foi possível trocar a senha. Tente novamente.");
      return;
    }

    reset();
    toast.success("Senha atualizada.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alterar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                placeholder="Pelo menos 6 caracteres"
                {...register("senha")}
              />
              {errors.senha ? (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar-nova-senha">Confirme a nova senha</Label>
              <Input
                id="confirmar-nova-senha"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                {...register("confirmarSenha")}
              />
              {errors.confirmarSenha ? (
                <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
              ) : null}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

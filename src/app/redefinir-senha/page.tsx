import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/brand/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Criar nova senha" };

export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/esqueci-senha");
  }

  return (
    <AuthShell title="Crie uma nova senha" subtitle="Escolha uma senha nova para sua conta.">
      <ResetPasswordForm />
    </AuthShell>
  );
}

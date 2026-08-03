import type { Metadata } from "next";
import { AuthShell } from "@/components/brand/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  return (
    <AuthShell
      title="Esqueceu sua senha?"
      subtitle="Informe seu e-mail e enviamos um link para você criar uma nova."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

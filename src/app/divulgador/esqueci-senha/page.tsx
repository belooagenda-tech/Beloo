import type { Metadata } from "next";
import { AuthShell } from "@/components/brand/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Esqueci minha senha — Divulgador" };

export default function DivulgadorEsqueciSenhaPage() {
  return (
    <AuthShell
      title="Esqueceu sua senha?"
      subtitle="Informe seu e-mail de divulgador e a Beloo entra em contato com um link para você criar uma nova."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

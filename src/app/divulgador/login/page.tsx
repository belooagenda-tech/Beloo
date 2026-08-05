import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/brand/auth-shell";
import { getSessionDivulgadorId } from "@/lib/divulgador/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar como divulgador" };

export default async function DivulgadorLoginPage() {
  const divulgadorId = await getSessionDivulgadorId();
  if (divulgadorId) {
    redirect("/divulgador/dashboard");
  }

  return (
    <AuthShell title="Painel do divulgador" subtitle="Entre para acompanhar suas indicações e comissões.">
      <LoginForm />
    </AuthShell>
  );
}

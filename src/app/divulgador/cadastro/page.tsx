import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/brand/auth-shell";
import { getSessionDivulgadorId } from "@/lib/divulgador/auth";
import { CadastroForm } from "./cadastro-form";

export const metadata: Metadata = { title: "Seja um divulgador Beloo" };

export default async function DivulgadorCadastroPage() {
  const divulgadorId = await getSessionDivulgadorId();
  if (divulgadorId) {
    redirect("/divulgador/dashboard");
  }

  return (
    <AuthShell
      title="Seja um divulgador Beloo"
      subtitle="Indique profissionais e ganhe uma comissão recorrente enquanto a assinatura deles estiver ativa."
    >
      <CadastroForm />
    </AuthShell>
  );
}

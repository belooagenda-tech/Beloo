import type { Metadata } from "next";
import { AuthShell } from "@/components/brand/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Criar nova senha — Divulgador" };

export default async function DivulgadorRedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell title="Crie uma nova senha" subtitle="Escolha uma senha nova pro seu acesso de divulgador.">
      <ResetPasswordForm token={token ?? ""} />
    </AuthShell>
  );
}

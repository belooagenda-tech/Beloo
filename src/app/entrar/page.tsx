import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/brand/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  const { next } = await searchParams;

  return (
    <AuthShell
      title="Que bom te ver de novo"
      subtitle="Entre para acessar sua agenda."
    >
      <LoginForm redirectTo={next && next.startsWith("/") ? next : "/app"} />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, buffer_padrao_min")
    .eq("profile_id", user!.id)
    .single();

  const { data: services } = await supabase
    .from("services")
    .select("id, business_id, nome, duracao_min, preco, buffer_min, cor, ativo, created_at")
    .eq("business_id", business!.id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Serviços
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O que você oferece, com duração e preço — isso define os horários
            que seus clientes veem no link de agendamento.
          </p>
        </div>
      </div>

      <ServicesManager
        businessId={business!.id}
        bufferPadrao={business!.buffer_padrao_min}
        initialServices={services ?? []}
      />
    </div>
  );
}

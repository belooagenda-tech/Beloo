import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ClientsListView } from "./clients-list-view";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, nome, telefone, criado_em")
    .eq("business_id", business!.id)
    .order("nome", { ascending: true });

  return <ClientsListView businessId={business!.id} initialClients={clients ?? []} />;
}

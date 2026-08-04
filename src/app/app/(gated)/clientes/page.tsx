import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { CLIENTES_PAGE_SIZE } from "./constants";
import { ClientsListView } from "./clients-list-view";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { data: clients, count } = await supabase
    .from("clients")
    .select("id, nome, telefone, criado_em", { count: "exact" })
    .eq("business_id", business!.id)
    .order("nome", { ascending: true })
    .range(0, CLIENTES_PAGE_SIZE - 1);

  return (
    <ClientsListView
      businessId={business!.id}
      initialClients={clients ?? []}
      totalCount={count ?? clients?.length ?? 0}
    />
  );
}

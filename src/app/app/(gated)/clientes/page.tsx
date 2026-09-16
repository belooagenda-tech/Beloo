import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { CLIENTES_PAGE_SIZE } from "./constants";
import { ClientsListView } from "./clients-list-view";
import { CustomBlocks } from "@/components/theme/custom-blocks";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ editorPreview?: string }>;
}) {
  const { editorPreview } = await searchParams;
  const preview = editorPreview === "1";
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { data: clients, count } = await supabase
    .from("clients")
    .select("id, nome, telefone, criado_em", { count: "exact" })
    .eq("business_id", business!.id)
    .order("nome", { ascending: true })
    .range(0, CLIENTES_PAGE_SIZE - 1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <CustomBlocks pageKey="app-clientes" position="before" preview={preview} />
      <ClientsListView
        businessId={business!.id}
        nomeLoja={business!.nome_loja}
        initialClients={clients ?? []}
        totalCount={count ?? clients?.length ?? 0}
      />
      <CustomBlocks pageKey="app-clientes" position="after" preview={preview} />
    </div>
  );
}

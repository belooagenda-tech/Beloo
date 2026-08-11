import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { ProductsManager } from "./products-manager";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProdutosPage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { data: products } = await supabase
    .from("products")
    .select("id, business_id, nome, descricao, preco, imagem_url, ativo, ordem, created_at")
    .eq("business_id", business!.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O que você vende além dos serviços — seus clientes podem adicionar ao agendamento
            pelo seu link público.
          </p>
        </div>
      </div>

      <ProductsManager businessId={business!.id} initialProducts={products ?? []} />
    </div>
  );
}

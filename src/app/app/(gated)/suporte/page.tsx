import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SupportForm } from "./support-form";

export const metadata: Metadata = { title: "Suporte" };

// Número de WhatsApp da própria Beloo — mesmo já usado (hardcoded) em
// app/app/assinatura/page.tsx pro contato de suporte de cobrança.
const WHATSAPP_BELOO = "21972652314";

export default async function SuportePage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, business_id, profile_id, mensagem, lida, created_at")
    .eq("business_id", business!.id)
    .order("created_at", { ascending: false });

  const whatsappLink = buildWhatsAppLink(
    WHATSAPP_BELOO,
    `Oi! Aqui é da ${business!.nome_loja}, uso o Beloo e gostaria de falar sobre o sistema.`,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Suporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Está precisando de algo que não tem no sistema? Ou quer que a gente melhore alguma
          coisa? Nos mande sua sugestão — é muito importante pro nosso crescimento.
        </p>
      </div>

      <Card className="border-primary/30 bg-secondary/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Prefere falar direto?</p>
            <p className="text-sm text-muted-foreground">Chama a gente no WhatsApp, respondemos rapidinho.</p>
          </div>
          <Button nativeButton={false} render={<a href={whatsappLink} target="_blank" rel="noreferrer" />}>
            <MessageCircle className="size-4" />
            Chamar no WhatsApp
          </Button>
        </CardContent>
      </Card>

      <SupportForm initialMessages={messages ?? []} />
    </div>
  );
}

import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assinatura" };

const WHATSAPP_URL =
  "https://wa.me/5521972652314?text=" +
  encodeURIComponent("Olá! Quero saber mais sobre os planos do Beloo.");

export default function AssinaturaPage() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <Sparkles className="size-6 text-secondary-foreground" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-foreground">
            Planos disponíveis em breve!
          </h1>
          <p className="text-sm text-muted-foreground">
            Estamos preparando os planos de assinatura da Beloo. Fale com a
            gente para saber mais.
          </p>
          <Button
            className="mt-2"
            render={
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                Falar no WhatsApp
              </a>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

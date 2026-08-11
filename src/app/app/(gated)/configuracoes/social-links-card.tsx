"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Aceita vazio (campo opcional, dá pra limpar) ou uma URL http(s) válida —
// sem exigir um domínio específico, então tanto instagram.com/sualoja
// quanto um link curto do Google Meu Negócio (g.page/r/...) passam.
function urlOpcional(mensagem: string) {
  return z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v), mensagem);
}

const schema = z.object({
  instagramUrl: urlOpcional("Informe uma URL válida, começando com https://."),
  googleReviewUrl: urlOpcional("Informe uma URL válida, começando com https://."),
});

type SocialLinksInput = z.infer<typeof schema>;

export function SocialLinksCard({
  businessId,
  instagramUrl,
  googleReviewUrl,
}: {
  businessId: string;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SocialLinksInput>({
    resolver: zodResolver(schema),
    defaultValues: { instagramUrl: instagramUrl ?? "", googleReviewUrl: googleReviewUrl ?? "" },
  });

  async function onSubmit(values: SocialLinksInput) {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        instagram_url: values.instagramUrl.trim() || null,
        google_review_url: values.googleReviewUrl.trim() || null,
      })
      .eq("id", businessId);
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Links atualizados.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Redes sociais e avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Assim que um cliente avalia o atendimento pelo seu link de agendamento, a Beloo também
          convida ele a deixar uma avaliação no Instagram e no Google — preencha os links abaixo pra
          ativar esse convite.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="instagram-url">Link do Instagram</Label>
            <Input
              id="instagram-url"
              placeholder="https://instagram.com/sualoja"
              {...register("instagramUrl")}
            />
            {errors.instagramUrl ? (
              <p className="text-sm text-destructive">{errors.instagramUrl.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="google-review-url">Link de avaliação do Google Meu Negócio</Label>
            <Input
              id="google-review-url"
              placeholder="https://g.page/r/sua-loja/review"
              {...register("googleReviewUrl")}
            />
            {errors.googleReviewUrl ? (
              <p className="text-sm text-destructive">{errors.googleReviewUrl.message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              No Google Meu Negócio, procure por &ldquo;Obter mais avaliações&rdquo; pra copiar esse
              link.
            </p>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

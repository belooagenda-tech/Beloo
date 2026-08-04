"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIAS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  nomeLoja: z.string().trim().min(2, "Dê um nome para a sua loja."),
  categoria: z.string().min(1, "Escolha uma categoria."),
});

type BusinessInfoInput = z.infer<typeof schema>;

export function BusinessInfoCard({
  businessId,
  nomeLoja,
  categoria,
}: {
  businessId: string;
  nomeLoja: string;
  categoria: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BusinessInfoInput>({
    resolver: zodResolver(schema),
    defaultValues: { nomeLoja, categoria: categoria ?? "" },
  });

  async function onSubmit(values: BusinessInfoInput) {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ nome_loja: values.nomeLoja, categoria: values.categoria })
      .eq("id", businessId);
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Dados da loja atualizados.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da loja</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="nome-loja-config">Nome da loja</Label>
            <Input id="nome-loja-config" {...register("nomeLoja")} />
            {errors.nomeLoja ? (
              <p className="text-sm text-destructive">{errors.nomeLoja.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Controller
              name="categoria"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        CATEGORIAS.find((o) => o.value === value)?.label ?? "Escolha uma categoria"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

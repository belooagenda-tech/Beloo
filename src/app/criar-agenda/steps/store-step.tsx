"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import { storeSchema, type StoreInput } from "@/lib/validations/onboarding";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SlugStatus = "idle" | "checking" | "available" | "taken";

export function StoreStep({
  defaultNomeLoja,
  defaultSlug,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  defaultNomeLoja?: string;
  defaultSlug?: string;
  onSubmit: (values: StoreInput) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: { nomeLoja: defaultNomeLoja ?? "", slug: defaultSlug ?? "" },
  });

  const nomeLoja = watch("nomeLoja");
  const slug = watch("slug");
  const slugEditedManually = useRef(Boolean(defaultSlug));
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

  useEffect(() => {
    if (slugEditedManually.current) return;
    setValue("slug", slugify(nomeLoja ?? ""));
  }, [nomeLoja, setValue]);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    if (slug === defaultSlug) {
      setSlugStatus("available");
      return;
    }
    setSlugStatus("checking");
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("is_slug_available", {
        candidate_slug: slug,
      });
      if (rpcError) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus(data ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timeout);
  }, [slug, defaultSlug]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "beloo.app";
  const bareSiteUrl = siteUrl.replace(/^https?:\/\//, "");

  return (
    <form
      onSubmit={handleSubmit((values) => {
        if (slugStatus === "taken") return;
        onSubmit(values);
      })}
      className="space-y-4"
      noValidate
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="nomeLoja">Nome da sua loja ou marca</Label>
        <Input
          id="nomeLoja"
          placeholder="Ana Nails"
          {...register("nomeLoja")}
        />
        {errors.nomeLoja ? (
          <p className="text-sm text-destructive">{errors.nomeLoja.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Seu link público</Label>
        <div className="flex items-center rounded-md border border-input bg-background pl-3 text-sm text-muted-foreground focus-within:ring-1 focus-within:ring-ring">
          <span className="shrink-0">{bareSiteUrl}/</span>
          <Input
            id="slug"
            className="border-0 px-1 shadow-none focus-visible:ring-0"
            {...register("slug", {
              onChange: () => {
                slugEditedManually.current = true;
              },
            })}
          />
          <span className="pr-3">
            {slugStatus === "checking" ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : slugStatus === "available" ? (
              <Check className="size-4 text-success" />
            ) : slugStatus === "taken" ? (
              <X className="size-4 text-destructive" />
            ) : null}
          </span>
        </div>
        {errors.slug ? (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        ) : slugStatus === "taken" ? (
          <p className="text-sm text-destructive">Esse link já está em uso, tente outro.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            É o endereço que seus clientes vão usar para agendar.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={submitting || slugStatus === "checking" || slugStatus === "taken"}
        >
          {submitting ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </form>
  );
}

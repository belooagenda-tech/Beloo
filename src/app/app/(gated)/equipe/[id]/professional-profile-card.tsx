"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { professionalSchema, type ProfessionalInput } from "@/lib/validations/professional";
import { CORES_SERVICO } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Professional } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TAMANHO_MAX_MB = 4;

type ServiceOption = { id: string; nome: string; ativo: boolean };

export function ProfessionalProfileCard({
  businessId,
  professional,
  services,
  initialServiceIds,
}: {
  businessId: string;
  professional: Professional;
  services: ServiceOption[];
  initialServiceIds: string[];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { nome: professional.nome },
  });

  const [cor, setCor] = useState(professional.cor ?? CORES_SERVICO[0].valor);
  const [ativo, setAtivo] = useState(professional.ativo);
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set(initialServiceIds));
  const [fotoUrl, setFotoUrl] = useState(professional.foto_url);
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(professional.foto_url);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const servicosAtivos = services.filter((s) => s.ativo || serviceIds.has(s.id));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("Envie uma imagem PNG, JPEG ou WEBP.");
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setUploadError(`A imagem precisa ter até ${TAMANHO_MAX_MB}MB.`);
      return;
    }

    setNovoArquivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setNovoArquivo(null);
    setPreviewUrl(null);
    setFotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleService(serviceId: string, checked: boolean) {
    setServiceIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(serviceId);
      else next.delete(serviceId);
      return next;
    });
  }

  async function onSubmit(values: ProfessionalInput) {
    const supabase = createClient();
    let finalFotoUrl = fotoUrl;

    if (novoArquivo) {
      const ext = novoArquivo.name.split(".").pop() || "jpg";
      const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("professional-photos")
        .upload(path, novoArquivo);
      if (uploadErr) {
        setUploadError("Não foi possível enviar a foto. Tente novamente.");
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("professional-photos").getPublicUrl(path);
      finalFotoUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("professionals")
      .update({ nome: values.nome, foto_url: finalFotoUrl, cor, ativo })
      .eq("id", professional.id);

    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("professional_services")
      .delete()
      .eq("professional_id", professional.id);
    const idsSelecionados = [...serviceIds];
    const { error: insertError } =
      !deleteError && idsSelecionados.length > 0
        ? await supabase
            .from("professional_services")
            .insert(idsSelecionados.map((serviceId) => ({ professional_id: professional.id, service_id: serviceId })))
        : { error: null };

    if (deleteError || insertError) {
      toast.error("Dados salvos, mas não foi possível atualizar os serviços vinculados.");
      return;
    }

    setFotoUrl(finalFotoUrl);
    setNovoArquivo(null);
    toast.success("Profissional atualizado.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados do profissional</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Foto</Label>
            {previewUrl ? (
              <div className="relative w-fit">
                <Image
                  src={previewUrl}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized={Boolean(novoArquivo)}
                  className="size-24 rounded-full border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="Remover foto"
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex size-24 flex-col items-center justify-center gap-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40"
              >
                <ImagePlus className="size-5" />
                <span className="text-xs">Adicionar</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nome-profissional-editar">Nome</Label>
            <Input id="nome-profissional-editar" {...register("nome")} />
            {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Cor na agenda</Label>
            <div className="flex gap-2">
              {CORES_SERVICO.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setCor(opcao.valor)}
                  aria-label={opcao.label}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                    cor === opcao.valor ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
                  )}
                  style={{ backgroundColor: opcao.valor }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Serviços que faz</Label>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
            ) : (
              <div className="space-y-1 rounded-md border border-border p-1">
                {servicosAtivos.map((service) => (
                  <div key={service.id} className="flex items-center justify-between gap-3 rounded-sm px-2 py-2">
                    <span className="text-sm text-foreground">
                      {service.nome}
                      {!service.ativo ? " (inativo)" : ""}
                    </span>
                    <Switch
                      checked={serviceIds.has(service.id)}
                      onCheckedChange={(checked) => toggleService(service.id, checked)}
                      aria-label={`${service.nome} — faz esse serviço`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Profissional ativo</p>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

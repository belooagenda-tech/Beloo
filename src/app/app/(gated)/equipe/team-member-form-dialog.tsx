"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, Plus, X } from "lucide-react";
import { professionalSchema, type ProfessionalInput } from "@/lib/validations/professional";
import { CORES_SERVICO } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Professional } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const TAMANHO_MAX_MB = 4;

type ServiceOption = { id: string; nome: string; ativo: boolean };

function TeamMemberForm({
  businessId,
  services,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  services: ServiceOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: (professional: Professional, serviceIds: string[]) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { nome: "" },
  });

  const [cor, setCor] = useState<string>(CORES_SERVICO[0].valor);
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set());
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const servicosAtivos = services.filter((s) => s.ativo);

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
    let fotoUrl: string | null = null;

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
      fotoUrl = publicUrlData.publicUrl;
    }

    const { data: professional, error } = await supabase
      .from("professionals")
      .insert({ business_id: businessId, nome: values.nome, foto_url: fotoUrl, cor })
      .select("id, business_id, nome, foto_url, cor, ativo, usa_horario_proprio, ordem, created_at")
      .single();

    if (error || !professional) {
      toast.error("Não foi possível salvar o profissional. Tente novamente.");
      return;
    }

    const idsSelecionados = [...serviceIds];
    if (idsSelecionados.length > 0) {
      const { error: vinculoError } = await supabase
        .from("professional_services")
        .insert(idsSelecionados.map((serviceId) => ({ professional_id: professional.id, service_id: serviceId })));
      if (vinculoError) {
        toast.error("Profissional criado, mas não foi possível vincular os serviços. Ajuste na página dele.");
      }
    }

    onSaved(professional, idsSelecionados);
    onOpenChange(false);
    toast.success("Profissional criado.");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Novo profissional</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label>Foto (opcional)</Label>
          {previewUrl ? (
            <div className="relative w-fit">
              <Image
                src={previewUrl}
                alt=""
                width={96}
                height={96}
                unoptimized
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
          <Label htmlFor="nome-profissional">Nome</Label>
          <Input id="nome-profissional" placeholder="Maria Silva" {...register("nome")} />
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
          {servicosAtivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre serviços antes de vinculá-los a um profissional.
            </p>
          ) : (
            <div className="space-y-1 rounded-md border border-border p-1">
              {servicosAtivos.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-3 rounded-sm px-2 py-2"
                >
                  <span className="text-sm text-foreground">{service.nome}</span>
                  <Switch
                    checked={serviceIds.has(service.id)}
                    onCheckedChange={(checked) => toggleService(service.id, checked)}
                    aria-label={`${service.nome} — faz esse serviço`}
                  />
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Na vitrine pública, um serviço só mostra os profissionais que fazem ele. Sem
            nenhum vinculado, o serviço segue sem escolha de profissional.
          </p>
        </div>

        <DialogFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function TeamMemberFormDialog({
  businessId,
  services,
  onSaved,
}: {
  businessId: string;
  services: ServiceOption[];
  onSaved: (professional: Professional, serviceIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Novo profissional
          </Button>
        }
      />
      <DialogContent>
        {open ? (
          <TeamMemberForm
            key={formKey}
            businessId={businessId}
            services={services}
            onOpenChange={setOpen}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

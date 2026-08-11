"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TAMANHO_MAX_MB = 4;

function ProductForm({
  businessId,
  product,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (product: Product) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nome: product?.nome ?? "",
      descricao: product?.descricao ?? "",
      preco: product?.preco ?? 0,
    },
  });

  const [ativo, setAtivo] = useState(product?.ativo ?? true);
  const [imagemUrl, setImagemUrl] = useState(product?.imagem_url ?? null);
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imagem_url ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImagemUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: ProductInput) {
    const supabase = createClient();
    let finalImagemUrl = imagemUrl;

    if (novoArquivo) {
      const ext = novoArquivo.name.split(".").pop() || "jpg";
      const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, novoArquivo);
      if (uploadErr) {
        setUploadError("Não foi possível enviar a imagem. Tente novamente.");
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
      finalImagemUrl = publicUrlData.publicUrl;
    }

    const payload = {
      business_id: businessId,
      nome: values.nome,
      descricao: values.descricao?.trim() || null,
      preco: values.preco,
      imagem_url: finalImagemUrl,
      ativo,
    };

    const query = product
      ? supabase.from("products").update(payload).eq("id", product.id)
      : supabase.from("products").insert(payload);

    const { data, error } = await query
      .select("id, business_id, nome, descricao, preco, imagem_url, ativo, ordem, created_at")
      .single();

    if (error || !data) {
      toast.error("Não foi possível salvar o produto. Tente novamente.");
      return;
    }

    onSaved(data);
    onOpenChange(false);
    toast.success(product ? "Produto atualizado." : "Produto criado.");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
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
                unoptimized={Boolean(novoArquivo)}
                className="size-24 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                aria-label="Remover imagem"
                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary/40"
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
          <Label htmlFor="nome-produto">Nome</Label>
          <Input id="nome-produto" placeholder="Shampoo profissional 300ml" {...register("nome")} />
          {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descricao-produto">Descrição (opcional)</Label>
          <Input id="descricao-produto" placeholder="Uso recomendado, marca, etc." {...register("descricao")} />
          {errors.descricao ? (
            <p className="text-sm text-destructive">{errors.descricao.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preco-produto">Preço (R$)</Label>
          <Input
            id="preco-produto"
            type="number"
            min={0}
            step={0.01}
            {...register("preco", { valueAsNumber: true })}
          />
          {errors.preco ? <p className="text-sm text-destructive">{errors.preco.message}</p> : null}
        </div>

        {product ? (
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Produto ativo</p>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function ProductFormDialog({
  businessId,
  product,
  open,
  formKey,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  product: Product | null;
  open: boolean;
  formKey: number;
  onOpenChange: (open: boolean) => void;
  onSaved: (product: Product) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <ProductForm
            key={formKey}
            businessId={businessId}
            product={product}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

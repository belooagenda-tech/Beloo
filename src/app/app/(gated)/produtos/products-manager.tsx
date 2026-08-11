"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductFormDialog } from "./product-form-dialog";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductsManager({
  businessId,
  initialProducts,
}: {
  businessId: string;
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSaved(product: Product) {
    setProducts((prev) => {
      const existe = prev.some((p) => p.id === product.id);
      return existe ? prev.map((p) => (p.id === product.id ? product : p)) : [...prev, product];
    });
  }

  async function handleToggleAtivo(product: Product, ativo: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("products").update({ ativo }).eq("id", product.id);
    if (error) {
      toast.error("Não foi possível atualizar o produto.");
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ativo } : p)));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (error) {
      toast.error("Não foi possível excluir o produto.");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Produto excluído.");
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus className="size-4" />
        Novo produto
      </Button>

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado ainda. Cadastre o que você vende para
            oferecer no agendamento — é opcional, o cliente sempre pode pular.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id}>
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  {product.imagem_url ? (
                    <Image
                      src={product.imagem_url}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                      <Package className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{product.nome}</p>
                    <p className="text-sm text-muted-foreground">{formatarPreco(product.preco)}</p>
                  </div>
                  {!product.ativo ? <Badge variant="secondary">Inativo</Badge> : null}
                  <Switch
                    checked={product.ativo}
                    onCheckedChange={(checked) => handleToggleAtivo(product, checked)}
                    aria-label="Produto ativo"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(product)}
                    aria-label="Editar produto"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(product)}
                    aria-label="Excluir produto"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ProductFormDialog
        businessId={businessId}
        product={editing}
        open={dialogOpen}
        formKey={dialogKey}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{deleteTarget?.nome}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Vendas antigas desse produto
              continuam registradas no histórico normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

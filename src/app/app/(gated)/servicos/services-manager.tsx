"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/supabase/types";
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
import { ServiceFormDialog } from "./service-form-dialog";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServicesManager({
  businessId,
  bufferPadrao,
  initialServices,
  professionals = [],
  professionalServices = [],
}: {
  businessId: string;
  bufferPadrao: number;
  initialServices: Service[];
  // Só usados pra mostrar (somente leitura) quem faz cada serviço — o
  // vínculo em si é editado na aba Equipe. Vazios numa loja que não usa a
  // funcionalidade, aí essa lista simplesmente não aparece.
  professionals?: { id: string; nome: string }[];
  professionalServices?: { professional_id: string; service_id: string }[];
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSaved(service: Service) {
    setServices((prev) => {
      const existe = prev.some((s) => s.id === service.id);
      return existe ? prev.map((s) => (s.id === service.id ? service : s)) : [...prev, service];
    });
  }

  async function handleToggleAtivo(service: Service, ativo: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("services").update({ ativo }).eq("id", service.id);
    if (error) {
      toast.error("Não foi possível atualizar o serviço.");
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, ativo } : s)));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (error) {
      toast.error(
        error.code === "23503"
          ? "Esse serviço já tem agendamentos e não pode ser excluído. Desative-o em vez disso."
          : "Não foi possível excluir o serviço.",
      );
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Serviço excluído.");
  }

  const professionalsById = new Map(professionals.map((p) => [p.id, p.nome]));

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus className="size-4" />
        Novo serviço
      </Button>

      {services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum serviço cadastrado ainda. Comece adicionando o primeiro.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {services.map((service) => (
            <li key={service.id}>
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: service.cor ?? "#7C3AED" }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {service.nome}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {service.duracao_min} min · {formatarPreco(service.preco)}
                      {service.buffer_min !== null ? (
                        <> · buffer {service.buffer_min} min</>
                      ) : (
                        <> · buffer padrão ({bufferPadrao} min)</>
                      )}
                    </p>
                    {professionals.length > 0 ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {professionalServices
                          .filter((ps) => ps.service_id === service.id)
                          .map((ps) => professionalsById.get(ps.professional_id))
                          .filter((nome): nome is string => Boolean(nome))
                          .join(", ") || "Sem profissional vinculado (edite na aba Equipe)"}
                      </p>
                    ) : null}
                  </div>
                  {!service.ativo ? <Badge variant="secondary">Inativo</Badge> : null}
                  <Switch
                    checked={service.ativo}
                    onCheckedChange={(checked) => handleToggleAtivo(service, checked)}
                    aria-label="Serviço ativo"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(service)}
                    aria-label="Editar serviço"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(service)}
                    aria-label="Excluir serviço"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ServiceFormDialog
        businessId={businessId}
        bufferPadrao={bufferPadrao}
        service={editing}
        open={dialogOpen}
        formKey={dialogKey}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{deleteTarget?.nome}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se o serviço já tiver
              agendamentos, use o interruptor para desativá-lo em vez de
              excluir.
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

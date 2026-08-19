"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Professional } from "@/lib/supabase/types";
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
import { TeamMemberFormDialog } from "./team-member-form-dialog";

type ServiceOption = { id: string; nome: string; ativo: boolean };

export function TeamManager({
  businessId,
  services,
  initialProfessionals,
  initialProfessionalServices,
}: {
  businessId: string;
  services: ServiceOption[];
  initialProfessionals: Professional[];
  initialProfessionalServices: { professional_id: string; service_id: string }[];
}) {
  const [professionals, setProfessionals] = useState<Professional[]>(initialProfessionals);
  const [professionalServices, setProfessionalServices] = useState(initialProfessionalServices);
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [deleting, setDeleting] = useState(false);

  const servicesById = new Map(services.map((s) => [s.id, s.nome]));

  function handleSaved(professional: Professional, serviceIds: string[]) {
    setProfessionals((prev) => [...prev, professional]);
    setProfessionalServices((prev) => [
      ...prev,
      ...serviceIds.map((serviceId) => ({ professional_id: professional.id, service_id: serviceId })),
    ]);
  }

  async function handleToggleAtivo(professional: Professional, ativo: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("professionals").update({ ativo }).eq("id", professional.id);
    if (error) {
      toast.error("Não foi possível atualizar o profissional.");
      return;
    }
    setProfessionals((prev) => prev.map((p) => (p.id === professional.id ? { ...p, ativo } : p)));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("professionals").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (error) {
      toast.error("Não foi possível excluir o profissional.");
      return;
    }
    setProfessionals((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setProfessionalServices((prev) => prev.filter((ps) => ps.professional_id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Profissional excluído.");
  }

  return (
    <div className="space-y-4">
      <TeamMemberFormDialog businessId={businessId} services={services} onSaved={handleSaved} />

      {professionals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum profissional cadastrado ainda. Trabalha sozinho(a)? Não precisa cadastrar
            ninguém aqui — o sistema continua funcionando normalmente.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {professionals.map((professional) => {
            const servicosDoProfissional = professionalServices
              .filter((ps) => ps.professional_id === professional.id)
              .map((ps) => servicesById.get(ps.service_id))
              .filter((nome): nome is string => Boolean(nome));

            return (
              <li key={professional.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 py-4">
                    {professional.foto_url ? (
                      <Image
                        src={professional.foto_url}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: professional.cor ?? "#7C3AED" }}
                      >
                        <User className="size-4" />
                      </div>
                    )}
                    <Link href={`/app/equipe/${professional.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground hover:underline">
                        {professional.nome}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {servicosDoProfissional.length > 0
                          ? servicosDoProfissional.join(", ")
                          : "Nenhum serviço vinculado ainda"}
                      </p>
                    </Link>
                    {!professional.ativo ? <Badge variant="secondary">Inativo</Badge> : null}
                    <Switch
                      checked={professional.ativo}
                      onCheckedChange={(checked) => handleToggleAtivo(professional, checked)}
                      aria-label="Profissional ativo"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(professional)}
                      aria-label="Excluir profissional"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{deleteTarget?.nome}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Agendamentos já feitos com esse profissional
              continuam no histórico, só ficam sem profissional atribuído.
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

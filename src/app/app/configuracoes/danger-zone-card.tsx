"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteMyAccountAction } from "./delete-account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PALAVRA_CONFIRMACAO = "EXCLUIR";

export function DangerZoneCard() {
  const router = useRouter();
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleExcluir() {
    setExcluindo(true);
    const resultado = await deleteMyAccountAction();

    if (!resultado.ok) {
      setExcluindo(false);
      toast.error(resultado.error);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Excluir sua conta apaga permanentemente sua loja, serviços,
          clientes, agendamentos, planos e todo o histórico financeiro. Essa
          ação não pode ser desfeita.
        </p>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmacao("");
          }}
        >
          <AlertDialogTrigger
            render={
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" />
                Excluir minha conta
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza que quer excluir sua conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os seus dados serão apagados permanentemente, incluindo
                o histórico de clientes e pagamentos. Digite{" "}
                <strong>{PALAVRA_CONFIRMACAO}</strong> para confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacao-exclusao" className="sr-only">
                Confirmação
              </Label>
              <Input
                id="confirmacao-exclusao"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder={PALAVRA_CONFIRMACAO}
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExcluir}
                disabled={confirmacao !== PALAVRA_CONFIRMACAO || excluindo}
              >
                {excluindo ? "Excluindo..." : "Excluir permanentemente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

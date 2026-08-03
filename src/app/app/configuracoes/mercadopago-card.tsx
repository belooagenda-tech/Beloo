"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Unlink } from "lucide-react";
import { OPCOES_ENTRADA_PERCENTUAL } from "@/lib/constants";
import { disconnectMercadoPagoAction, updateEntradaSettingsAction } from "./mercadopago-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function MercadoPagoCard({
  connected,
  mpEmail,
  initialEntradaAtiva,
  initialEntradaPercentual,
}: {
  connected: boolean;
  mpEmail: string | null;
  initialEntradaAtiva: boolean;
  initialEntradaPercentual: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entradaAtiva, setEntradaAtiva] = useState(initialEntradaAtiva);
  const [entradaPercentual, setEntradaPercentual] = useState(
    initialEntradaPercentual > 0 ? initialEntradaPercentual : 30,
  );
  const [salvando, setSalvando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  useEffect(() => {
    const status = searchParams.get("mp");
    if (status === "conectado") {
      toast.success("Mercado Pago conectado com sucesso.");
      router.replace("/app/configuracoes");
    } else if (status === "erro") {
      toast.error("Não foi possível conectar sua conta do Mercado Pago. Tente novamente.");
      router.replace("/app/configuracoes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSalvarEntrada(nextAtiva: boolean, nextPercentual: number) {
    setSalvando(true);
    const resultado = await updateEntradaSettingsAction({
      ativa: nextAtiva,
      percentual: nextPercentual,
    });
    setSalvando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      setEntradaAtiva(initialEntradaAtiva);
      return;
    }
    toast.success("Configuração de entrada atualizada.");
  }

  async function handleDesconectar() {
    setDesconectando(true);
    await disconnectMercadoPagoAction();
    setDesconectando(false);
    setEntradaAtiva(false);
    router.refresh();
    toast.success("Mercado Pago desconectado.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pagamento de entrada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {connected ? "Conta do Mercado Pago conectada" : "Nenhuma conta conectada"}
              </p>
              {connected && mpEmail ? (
                <p className="text-xs text-muted-foreground">{mpEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Conecte sua conta para receber pagamentos de entrada diretamente.
                </p>
              )}
            </div>
          </div>

          {connected ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Unlink className="size-4" />
                    Desconectar
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar Mercado Pago?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A cobrança de entrada será desativada automaticamente, já
                    que ela depende dessa conta para receber os pagamentos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDesconectar} disabled={desconectando}>
                    {desconectando ? "Desconectando..." : "Desconectar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/api/mercadopago/connect">Conectar Mercado Pago</Link>}
            />
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="entrada-ativa" className="text-sm font-medium text-foreground">
                Cobrar entrada para confirmar agendamento
              </Label>
              <p className="text-xs text-muted-foreground">
                O cliente paga a entrada pelo link público antes do horário
                ser confirmado.
              </p>
            </div>
            <Switch
              id="entrada-ativa"
              checked={entradaAtiva}
              disabled={!connected || salvando}
              onCheckedChange={(checked) => {
                setEntradaAtiva(checked);
                handleSalvarEntrada(checked, entradaPercentual);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Percentual da entrada</Label>
            <Select
              value={String(entradaPercentual)}
              disabled={!connected || !entradaAtiva || salvando}
              onValueChange={(value) => {
                const percentual = Number(value);
                setEntradaPercentual(percentual);
                handleSalvarEntrada(entradaAtiva, percentual);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_ENTRADA_PERCENTUAL.map((opcao) => (
                  <SelectItem key={opcao.valor} value={String(opcao.valor)}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

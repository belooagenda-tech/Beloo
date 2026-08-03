"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  subscriptionToKeys,
} from "@/lib/push/client-subscribe";
import { Button } from "@/components/ui/button";

type Estado = "verificando" | "nao-suportado" | "negado" | "inativo" | "ativo";

export function ClientPushOptIn({
  onSubscribe,
  label = "Ativar lembrete por notificação",
}: {
  onSubscribe: (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => Promise<{ ok: boolean; error?: string }>;
  label?: string;
}) {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let active = true;

    async function detectar(): Promise<Estado> {
      if (!isPushSupported()) return "nao-suportado";
      if (Notification.permission === "denied") return "negado";
      try {
        const sub = await getExistingSubscription();
        return sub ? "ativo" : "inativo";
      } catch {
        return "inativo";
      }
    }

    detectar().then((resultado) => {
      if (active) setEstado(resultado);
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleAtivar() {
    setProcessando(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEstado(permission === "denied" ? "negado" : "inativo");
        return;
      }

      const subscription = await subscribeToPush();
      const resultado = await onSubscribe(subscriptionToKeys(subscription));

      if (!resultado.ok) {
        toast.error(resultado.error ?? "Não foi possível ativar as notificações.");
        return;
      }

      setEstado("ativo");
      toast.success("Notificações ativadas.");
    } catch {
      toast.error("Não foi possível ativar as notificações. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  if (estado === "verificando" || estado === "nao-suportado") return null;

  if (estado === "negado") {
    return (
      <p className="text-xs text-muted-foreground">
        As notificações estão bloqueadas no navegador — permita nas
        configurações do site para ativar lembretes.
      </p>
    );
  }

  if (estado === "ativo") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-success">
        <Check className="size-3.5" />
        Notificações ativadas
      </p>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleAtivar} disabled={processando}>
      <Bell className="size-4" />
      {processando ? "Ativando..." : label}
    </Button>
  );
}

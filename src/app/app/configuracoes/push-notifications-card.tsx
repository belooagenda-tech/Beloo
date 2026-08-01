"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  subscriptionToKeys,
} from "@/lib/push/client-subscribe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Estado = "verificando" | "nao-suportado" | "negado" | "inativo" | "ativo";

export function PushNotificationsCard({ profileId }: { profileId: string }) {
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
      const { endpoint, keys } = subscriptionToKeys(subscription);
      const supabase = createClient();
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ profile_id: profileId, endpoint, keys }, { onConflict: "endpoint" });

      if (error) {
        toast.error("Não foi possível ativar as notificações. Tente novamente.");
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

  async function handleDesativar() {
    setProcessando(true);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEstado("inativo");
      toast.success("Notificações desativadas.");
    } catch {
      toast.error("Não foi possível desativar. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notificações push</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {estado === "nao-suportado" ? (
          <p className="text-sm text-muted-foreground">
            Seu navegador não suporta notificações push, mas você continua
            recebendo tudo pelo sino no topo do app.
          </p>
        ) : estado === "negado" ? (
          <p className="text-sm text-muted-foreground">
            As notificações estão bloqueadas nas configurações do navegador.
            Permita notificações para este site para ativá-las.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Receba um aviso no celular quando um novo agendamento chegar e
              um lembrete pouco antes do seu dia começar.
            </p>
            {estado === "ativo" ? (
              <Button variant="outline" onClick={handleDesativar} disabled={processando}>
                <BellOff className="size-4" />
                {processando ? "Desativando..." : "Desativar notificações"}
              </Button>
            ) : (
              <Button onClick={handleAtivar} disabled={processando || estado === "verificando"}>
                <Bell className="size-4" />
                {processando ? "Ativando..." : "Ativar notificações"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

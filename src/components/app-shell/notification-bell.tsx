"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DESTINO_POR_TIPO: Record<Notification["tipo"], string> = {
  novo_agendamento: "/app/agenda",
  cancelamento: "/app/agenda",
  reagendamento: "/app/agenda",
  entrada_paga: "/app/agenda",
  lembrete_dia: "/app/agenda",
  plano_pago: "/app/clientes",
  avaliacao_recebida: "/app/clientes",
  assinatura_expirando: "/app/assinatura",
};

function formatarRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.round(diffMs / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.round(horas / 24);
  return `há ${dias}d`;
}

export function NotificationBell({ initialNotifications }: { initialNotifications: Notification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.lida).length;

  async function marcarComoLida(notification: Notification) {
    if (!notification.lida) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, lida: true } : n)),
      );
      const supabase = createClient();
      await supabase.from("notifications").update({ lida: true }).eq("id", notification.id);
    }
    router.push(DESTINO_POR_TIPO[notification.tipo] ?? "/app/agenda");
  }

  async function marcarTodasComoLidas() {
    const idsNaoLidas = notifications.filter((n) => !n.lida).map((n) => n.id);
    if (idsNaoLidas.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ lida: true }).in("id", idsNaoLidas);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute top-1 right-1 flex size-2 rounded-full bg-coral" aria-hidden="true" />
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm font-medium text-foreground">Notificações</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={marcarTodasComoLidas}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação ainda.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => marcarComoLida(notification)}
                className="flex-col items-start gap-0.5 whitespace-normal"
              >
                <div className="flex w-full items-center gap-1.5">
                  {!notification.lida ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-coral" aria-hidden="true" />
                  ) : null}
                  <span className="text-sm font-medium text-foreground">{notification.titulo}</span>
                </div>
                {notification.corpo ? (
                  <p className="text-sm text-muted-foreground">{notification.corpo}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{formatarRelativo(notification.created_at)}</p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

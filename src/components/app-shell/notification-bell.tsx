"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
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
  lista_espera: "/app/agenda",
  assinatura_expirando: "/app/assinatura",
  novo_profissional: "/app/admin",
  divulgador_recuperacao_senha: "/app/admin",
};

// Algumas notificações (ex.: recuperação de senha do divulgador) trazem um
// link acionável dentro do corpo — sem provedor de e-mail configurado ainda,
// esse texto é o único lugar onde o link existe. Extrai pra oferecer um
// botão "Copiar link" direto, em vez de obrigar a selecionar o texto à mão.
function extrairLink(corpo: string | null): string | null {
  if (!corpo) return null;
  return corpo.match(/https?:\/\/\S+/)?.[0] ?? null;
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.lida).length;

  async function marcarLida(notification: Notification) {
    if (notification.lida) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, lida: true } : n)),
    );
    const supabase = createClient();
    await supabase.from("notifications").update({ lida: true }).eq("id", notification.id);
  }

  function handleAbrir(notification: Notification) {
    marcarLida(notification);
    setMenuOpen(false);
    router.push(DESTINO_POR_TIPO[notification.tipo] ?? "/app/agenda");
  }

  async function handleCopiarLink(notification: Notification, link: string) {
    marcarLida(notification);
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado — já pode colar e enviar por WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link manualmente na notificação.");
    }
  }

  async function marcarTodasComoLidas() {
    const idsNaoLidas = notifications.filter((n) => !n.lida).map((n) => n.id);
    if (idsNaoLidas.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ lida: true }).in("id", idsNaoLidas);
  }

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
            {notifications.map((notification) => {
              const link = extrairLink(notification.corpo);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-md px-1.5 py-1 text-sm whitespace-normal",
                    !notification.lida && "bg-accent/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleAbrir(notification)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-md text-left hover:bg-accent hover:text-accent-foreground"
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
                  </button>
                  {link ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 w-full"
                      onClick={() => handleCopiarLink(notification, link)}
                    >
                      <Copy className="size-3.5" />
                      Copiar link
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

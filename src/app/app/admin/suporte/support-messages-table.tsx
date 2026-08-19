"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { markSupportMessageReadAction } from "./actions";

export type SupportMessageRow = {
  id: string;
  nomeLoja: string;
  telefone: string | null;
  mensagem: string;
  lida: boolean;
  createdAt: string;
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function LinhaMensagem({ message }: { message: SupportMessageRow }) {
  const [lida, setLida] = useState(message.lida);
  const [pending, startTransition] = useTransition();

  function handleMarcarLida() {
    startTransition(async () => {
      const result = await markSupportMessageReadAction(message.id);
      if (result.ok) {
        setLida(true);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="border-b border-border py-3 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{message.nomeLoja}</span>
            {!lida ? (
              <Badge className="bg-primary/15 text-primary text-xs" variant="secondary">
                Nova
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-foreground">{message.mensagem}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatarDataHora(message.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {message.telefone ? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Responder ${message.nomeLoja} no WhatsApp`}
              nativeButton={false}
              render={
                <a
                  href={buildWhatsAppLink(
                    message.telefone,
                    `Oi! Aqui é da Beloo, vi sua mensagem sobre "${message.mensagem.slice(0, 60)}${
                      message.mensagem.length > 60 ? "…" : ""
                    }".`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <MessageCircle className="size-3.5" />
            </Button>
          ) : null}
          {!lida ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={handleMarcarLida}>
              {pending ? "Salvando..." : "Marcar como lida"}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function SupportMessagesTable({ messages }: { messages: SupportMessageRow[] }) {
  if (messages.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma mensagem por aqui.</p>;
  }

  return (
    <ul>
      {messages.map((message) => (
        <LinhaMensagem key={message.id} message={message} />
      ))}
    </ul>
  );
}

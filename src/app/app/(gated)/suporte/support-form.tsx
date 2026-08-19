"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { sendSupportMessageAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupportMessage } from "@/lib/supabase/types";

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export function SupportForm({ initialMessages }: { initialMessages: SupportMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [mensagem, setMensagem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const resultado = await sendSupportMessageAction(mensagem);
    setSubmitting(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setMessages((prev) => [resultado.message, ...prev]);
    setMensagem("");
    toast.success("Mensagem enviada! Assim que possível a gente te responde por aqui ou no WhatsApp.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mande sua sugestão</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="mensagem-suporte">Sua mensagem</Label>
              <Textarea
                id="mensagem-suporte"
                placeholder="Conte o que está faltando, o que travou, ou o que você gostaria que melhorasse..."
                rows={5}
                maxLength={2000}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              <Send className="size-4" />
              {submitting ? "Enviando..." : "Enviar mensagem"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {messages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suas mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {messages.map((message) => (
                <li key={message.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground">{message.mensagem}</p>
                    <Badge variant={message.lida ? "secondary" : "outline"} className="shrink-0">
                      {message.lida ? "Lida" : "Aguardando"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatarDataHora(message.created_at)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

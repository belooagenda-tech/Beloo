"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveErrorLogAction } from "./actions";

export type LogRow = {
  id: string;
  scope: string;
  message: string;
  businessNome: string | null;
  context: Record<string, unknown>;
  resolved: boolean;
  createdAt: string;
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function LinhaLog({ log }: { log: LogRow }) {
  const [resolvido, setResolvido] = useState(log.resolved);
  const [expandido, setExpandido] = useState(false);
  const [pending, startTransition] = useTransition();

  const contextoEntries = Object.entries(log.context).filter(([chave]) => chave !== "stack");

  function handleResolver() {
    startTransition(async () => {
      const result = await resolveErrorLogAction(log.id);
      if (result.ok) {
        setResolvido(true);
        toast.success("Marcado como resolvido.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="border-b border-border py-3 last:border-0">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{log.scope}</span>
            {log.businessNome ? (
              <Badge variant="outline" className="text-xs">
                {log.businessNome}
              </Badge>
            ) : null}
            {resolvido ? (
              <Badge className="bg-success/15 text-success text-xs" variant="secondary">
                Resolvido
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{log.message}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatarDataHora(log.createdAt)}</p>
        </div>
      </button>

      {expandido && contextoEntries.length > 0 ? (
        <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
          {JSON.stringify(Object.fromEntries(contextoEntries), null, 2)}
        </pre>
      ) : null}

      {!resolvido ? (
        <div className="mt-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={handleResolver}>
            {pending ? "Salvando..." : "Marcar como resolvido"}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function LogsTable({ logs }: { logs: LogRow[] }) {
  if (logs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhum log encontrado.</p>;
  }

  return (
    <ul>
      {logs.map((log) => (
        <LinhaLog key={log.id} log={log} />
      ))}
    </ul>
  );
}

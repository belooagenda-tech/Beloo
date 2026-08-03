"use client";

import { useEffect, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneBR, normalizePhone } from "@/lib/phone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { AgendaClient } from "./types";

export function ClientPicker({
  businessId,
  onSelect,
}: {
  businessId: string;
  onSelect: (client: AgendaClient) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgendaClient[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AgendaClient | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const termo = query.trim();
    timeoutRef.current = setTimeout(async () => {
      if (termo.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      const supabase = createClient();
      const digitos = normalizePhone(termo);
      // PostgREST usa vírgula/parênteses como sintaxe do filtro .or() — remove
      // esses caracteres do termo digitado para não quebrar/desviar o filtro.
      const termoSeguro = termo.replace(/[,()]/g, "");
      const { data } = await supabase
        .from("clients")
        .select("id, nome, telefone")
        .eq("business_id", businessId)
        .or(`nome.ilike.%${termoSeguro}%,telefone.ilike.%${digitos || termoSeguro}%`)
        .order("nome", { ascending: true })
        .limit(6);
      setResults(data ?? []);
      setOpen(true);
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, businessId]);

  function handlePick(client: AgendaClient) {
    setSelected(client);
    setOpen(false);
    setQuery("");
    onSelect(client);
  }

  function handleClear() {
    setSelected(null);
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 p-2.5">
        <div className="flex items-center gap-2 text-sm">
          <User className="size-4 text-primary" />
          <div>
            <p className="font-medium text-foreground">{selected.nome}</p>
            <p className="text-xs text-muted-foreground">{formatPhoneBR(selected.telefone)}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <X className="size-4" />
          Trocar
        </Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor="busca-cliente">Buscar cliente cadastrado</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="busca-cliente"
          className="pl-8"
          placeholder="Nome ou WhatsApp"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            <ul>
              {results.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => handlePick(client)}
                  >
                    <span className="font-medium text-foreground">{client.nome}</span>
                    <span className="text-xs text-muted-foreground">{formatPhoneBR(client.telefone)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

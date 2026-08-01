"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizePhone, formatPhoneBR } from "@/lib/phone";
import { NewClientDialog } from "./new-client-dialog";
import type { ClientListItem } from "./types";

export function ClientsListView({
  businessId,
  initialClients,
}: {
  businessId: string;
  initialClients: ClientListItem[];
}) {
  const [clients, setClients] = useState(initialClients);
  const [busca, setBusca] = useState("");

  const buscaDigits = normalizePhone(busca);
  const filtrados = clients.filter((client) => {
    if (!busca.trim()) return true;
    const nomeMatch = client.nome.toLowerCase().includes(busca.trim().toLowerCase());
    const telefoneMatch = buscaDigits.length > 0 && client.telefone.includes(buscaDigits);
    return nomeMatch || telefoneMatch;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} cadastrado
            {clients.length === 1 ? "" : "s"}.
          </p>
        </div>
        <NewClientDialog
          businessId={businessId}
          onCreated={(client) =>
            setClients((prev) => [...prev, client].sort((a, b) => a.nome.localeCompare(b.nome)))
          }
        />
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {clients.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : "Nenhum cliente encontrado para essa busca."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((client) => (
            <li key={client.id}>
              <Link href={`/app/clientes/${client.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {client.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPhoneBR(client.telefone)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

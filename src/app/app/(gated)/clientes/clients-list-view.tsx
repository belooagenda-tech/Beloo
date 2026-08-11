"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { normalizePhone, formatPhoneBR } from "@/lib/phone";
import { NewClientDialog } from "./new-client-dialog";
import { InactiveClientsView } from "./inactive-clients-view";
import { BirthdayClientsView } from "./birthday-clients-view";
import { CLIENTES_PAGE_SIZE } from "./constants";
import type { ClientListItem } from "./types";

export function ClientsListView({
  businessId,
  nomeLoja,
  initialClients,
  totalCount,
}: {
  businessId: string;
  nomeLoja: string;
  initialClients: ClientListItem[];
  totalCount: number;
}) {
  const [clients, setClients] = useState(initialClients);
  const [busca, setBusca] = useState("");
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [aba, setAba] = useState<"todos" | "inativos" | "aniversariantes">("todos");

  const haMaisParaCarregar = clients.length < totalCount;

  async function handleCarregarMais() {
    setCarregandoMais(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select("id, nome, telefone, criado_em")
      .eq("business_id", businessId)
      .order("nome", { ascending: true })
      .range(clients.length, clients.length + CLIENTES_PAGE_SIZE - 1);
    setCarregandoMais(false);

    if (data) {
      setClients((prev) => [...prev, ...data]);
    }
  }

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
            {totalCount} cliente{totalCount === 1 ? "" : "s"} cadastrado
            {totalCount === 1 ? "" : "s"}.
          </p>
        </div>
        <NewClientDialog
          businessId={businessId}
          onCreated={(client) =>
            setClients((prev) => [...prev, client].sort((a, b) => a.nome.localeCompare(b.nome)))
          }
        />
      </div>

      <div className="inline-flex rounded-lg border border-border p-0.5">
        <Button
          type="button"
          size="sm"
          variant={aba === "todos" ? "secondary" : "ghost"}
          onClick={() => setAba("todos")}
        >
          Todos
        </Button>
        <Button
          type="button"
          size="sm"
          variant={aba === "inativos" ? "secondary" : "ghost"}
          onClick={() => setAba("inativos")}
        >
          Inativos
        </Button>
        <Button
          type="button"
          size="sm"
          variant={aba === "aniversariantes" ? "secondary" : "ghost"}
          onClick={() => setAba("aniversariantes")}
        >
          Aniversariantes
        </Button>
      </div>

      {aba === "inativos" ? (
        <InactiveClientsView businessId={businessId} nomeLoja={nomeLoja} />
      ) : aba === "aniversariantes" ? (
        <BirthdayClientsView businessId={businessId} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {busca.trim() && haMaisParaCarregar ? (
            <Alert>
              <AlertDescription>
                A busca considera só os {clients.length} clientes já carregados.
                Carregue mais abaixo para incluir o restante.
              </AlertDescription>
            </Alert>
          ) : null}

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

          {!busca.trim() && haMaisParaCarregar ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCarregarMais}
              disabled={carregandoMais}
            >
              {carregandoMais ? "Carregando..." : `Carregar mais (${totalCount - clients.length} restantes)`}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

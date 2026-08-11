"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InactiveClient = {
  id: string;
  nome: string;
  telefone: string;
  ultimaVisita: string | null;
  diasSemVisita: number;
};

const OPCOES_DIAS = [30, 60, 90, 120] as const;

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

// Carregado só quando o profissional troca pra aba "Inativos" — busca todos
// os clientes da loja (sem paginação, ao contrário da lista normal) porque
// esse relatório precisa varrer todo mundo, não só a primeira página.
export function InactiveClientsView({
  businessId,
  nomeLoja,
}: {
  businessId: string;
  nomeLoja: string;
}) {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<InactiveClient[]>([]);
  const [diasLimite, setDiasLimite] = useState(60);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const [{ data: clients }, { data: appointments }] = await Promise.all([
        supabase.from("clients").select("id, nome, telefone, criado_em").eq("business_id", businessId),
        supabase
          .from("appointments")
          .select("client_id, inicio")
          .eq("business_id", businessId)
          .eq("status", "concluido"),
      ]);
      if (!ativo) return;

      const ultimaVisitaPorCliente = new Map<string, string>();
      for (const a of appointments ?? []) {
        const atual = ultimaVisitaPorCliente.get(a.client_id);
        if (!atual || a.inicio > atual) ultimaVisitaPorCliente.set(a.client_id, a.inicio);
      }

      const agora = Date.now();
      const lista: InactiveClient[] = (clients ?? []).map((c) => {
        const ultimaVisita = ultimaVisitaPorCliente.get(c.id) ?? null;
        // Cliente que nunca voltou depois do cadastro conta a inatividade a
        // partir do próprio cadastro, não fica de fora do relatório.
        const referencia = ultimaVisita ?? c.criado_em;
        const dias = Math.floor((agora - new Date(referencia).getTime()) / (24 * 60 * 60 * 1000));
        return { id: c.id, nome: c.nome, telefone: c.telefone, ultimaVisita, diasSemVisita: dias };
      });

      setClientes(lista);
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [businessId]);

  const filtrados = clientes
    .filter((c) => c.diasSemVisita >= diasLimite)
    .sort((a, b) => b.diasSemVisita - a.diasSemVisita);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Carregando..."
            : `${filtrados.length} cliente${filtrados.length === 1 ? "" : "s"} sem visita`}
        </p>
        <Select value={String(diasLimite)} onValueChange={(v) => v && setDiasLimite(Number(v))}>
          <SelectTrigger className="w-auto">
            <SelectValue>{(value: string | null) => `${value ?? diasLimite} dias ou mais`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {OPCOES_DIAS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} dias ou mais
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? null : filtrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum cliente inativo nesse período — bom sinal!
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((cliente) => (
            <li key={cliente.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <Link href={`/app/clientes/${cliente.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{cliente.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {cliente.ultimaVisita
                        ? `Última visita: ${formatarData(cliente.ultimaVisita)} · ${cliente.diasSemVisita} dias`
                        : `Nunca voltou desde o cadastro · ${cliente.diasSemVisita} dias`}
                    </p>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={buildWhatsAppLink(
                          cliente.telefone,
                          `Oi, ${cliente.nome}! Faz tempo que a gente não se vê por aqui na ${nomeLoja} — bora marcar um horário? 😊`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <MessageCircle className="size-4" />
                    Chamar
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

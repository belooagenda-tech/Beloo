"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { diasAteProximoAniversario } from "@/lib/clients/birthday";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BirthdayClient = {
  id: string;
  nome: string;
  telefone: string;
  dataNascimento: string;
  diasAte: number;
};

const OPCOES_DIAS = [7, 14, 30] as const;

function formatarDataCurta(dataNascimento: string) {
  const [, mes, dia] = dataNascimento.split("-");
  return `${dia}/${mes}`;
}

export function BirthdayClientsView({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<BirthdayClient[]>([]);
  const [diasLimite, setDiasLimite] = useState(14);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("id, nome, telefone, data_nascimento")
        .eq("business_id", businessId)
        .not("data_nascimento", "is", null);
      if (!ativo) return;

      const hoje = new Date();
      const lista: BirthdayClient[] = (data ?? [])
        .filter((c): c is typeof c & { data_nascimento: string } => Boolean(c.data_nascimento))
        .map((c) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          dataNascimento: c.data_nascimento,
          diasAte: diasAteProximoAniversario(c.data_nascimento, hoje),
        }));

      setClientes(lista);
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [businessId]);

  const filtrados = clientes.filter((c) => c.diasAte <= diasLimite).sort((a, b) => a.diasAte - b.diasAte);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Carregando..."
            : `${filtrados.length} aniversariante${filtrados.length === 1 ? "" : "s"}`}
        </p>
        <Select value={String(diasLimite)} onValueChange={(v) => v && setDiasLimite(Number(v))}>
          <SelectTrigger className="w-auto">
            <SelectValue>{(value: string | null) => `Próximos ${value ?? diasLimite} dias`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {OPCOES_DIAS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Próximos {d} dias
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? null : filtrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum aniversário nesse período. Cadastre a data de nascimento dos clientes em
            &ldquo;Editar&rdquo; no perfil de cada um.
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
                      {formatarDataCurta(cliente.dataNascimento)} ·{" "}
                      {cliente.diasAte === 0 ? "hoje!" : `em ${cliente.diasAte} dia${cliente.diasAte === 1 ? "" : "s"}`}
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
                          `Parabéns, ${cliente.nome}! 🎉 Desejamos um dia especial. Que tal comemorar com um horário reservado pra você?`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <Gift className="size-4" />
                    Parabenizar
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

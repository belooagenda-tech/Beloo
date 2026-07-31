"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { PublicService } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServicePicker({
  services,
  onSelect,
}: {
  services: PublicService[];
  onSelect: (service: PublicService) => void;
}) {
  if (services.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Essa loja ainda não cadastrou serviços disponíveis para agendamento online.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => onSelect(service)}
          className="block w-full text-left"
        >
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{service.nome}</p>
                <p className="text-sm text-muted-foreground">{service.duracao_min} min</p>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {formatarPreco(service.preco)}
              </span>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

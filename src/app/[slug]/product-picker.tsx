"use client";

import Image from "next/image";
import { ArrowLeft, Minus, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicProduct } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Step opcional entre "Horário" e "Seus dados" — só aparece quando a loja
// tem produtos ativos cadastrados. Sempre dá pra pular: quem não quer levar
// nada segue o agendamento normalmente, sem nenhum campo obrigatório aqui.
export function ProductPicker({
  products,
  selected,
  onChange,
  onContinue,
  onBack,
}: {
  products: PublicProduct[];
  selected: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  function setQuantidade(productId: string, quantidade: number) {
    const next = { ...selected };
    if (quantidade <= 0) {
      delete next[productId];
    } else {
      next[productId] = quantidade;
    }
    onChange(next);
  }

  const totalItens = Object.values(selected).reduce((acc, q) => acc + q, 0);
  const totalValor = products.reduce(
    (acc, p) => acc + (selected[p.id] ?? 0) * p.preco,
    0,
  );

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Trocar horário
      </Button>

      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Quer levar algum produto?
        </h2>
        <p className="text-sm text-muted-foreground">
          Opcional — some ao valor do seu atendimento. Você pode pular essa etapa.
        </p>
      </div>

      <ul className="space-y-2">
        {products.map((product) => {
          const quantidade = selected[product.id] ?? 0;
          return (
            <li key={product.id}>
              <Card>
                <CardContent className="flex items-center gap-3 py-3">
                  {product.imagem_url ? (
                    <Image
                      src={product.imagem_url}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                      <Package className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{product.nome}</p>
                    <p className="text-sm text-muted-foreground">{formatarPreco(product.preco)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Diminuir quantidade de ${product.nome}`}
                      disabled={quantidade === 0}
                      onClick={() => setQuantidade(product.id, quantidade - 1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-4 text-center text-sm font-medium tabular-nums text-foreground">
                      {quantidade}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Aumentar quantidade de ${product.nome}`}
                      onClick={() => setQuantidade(product.id, quantidade + 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Button type="button" className="w-full" onClick={onContinue}>
        {totalItens > 0
          ? `Continuar · +${formatarPreco(totalValor)} em produtos`
          : "Continuar sem produtos"}
      </Button>
    </div>
  );
}

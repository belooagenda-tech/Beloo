"use client";

import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicProfessional } from "./types";

export function ProfessionalPicker({
  professionals,
  onSelect,
  onBack,
}: {
  professionals: PublicProfessional[];
  // undefined = "sem preferência" (o profissional é atribuído automaticamente).
  onSelect: (professionalId: string | undefined) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Trocar serviço
      </Button>

      <p className="text-sm text-muted-foreground">Com quem você quer ser atendido(a)?</p>

      <div className="space-y-2">
        <button type="button" onClick={() => onSelect(undefined)} className="block w-full text-left">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                <User className="size-4" />
              </div>
              <p className="text-sm font-medium text-foreground">Sem preferência</p>
            </CardContent>
          </Card>
        </button>

        {professionals.map((professional) => (
          <button
            key={professional.id}
            type="button"
            onClick={() => onSelect(professional.id)}
            className="block w-full text-left"
          >
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 py-4">
                {professional.foto_url ? (
                  <Image
                    src={professional.foto_url}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <User className="size-4" />
                  </div>
                )}
                <p className="text-sm font-medium text-foreground">{professional.nome}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

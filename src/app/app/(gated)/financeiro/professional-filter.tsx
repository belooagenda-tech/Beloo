"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Valor do <Select> pra "todos os profissionais" — o componente base não
// aceita item com value="", então usamos um sentinel e omitimos o parâmetro
// da URL nesse caso.
const TODOS = "__todos__";

export function ProfessionalFilter({
  periodo,
  professionalId,
  professionals,
}: {
  periodo: string;
  professionalId: string | null;
  professionals: { id: string; nome: string }[];
}) {
  const router = useRouter();

  function handleChange(value: string | null) {
    const params = new URLSearchParams({ periodo });
    if (value && value !== TODOS) params.set("profissional", value);
    router.push(`/app/financeiro?${params.toString()}`);
  }

  return (
    <Select value={professionalId ?? TODOS} onValueChange={handleChange}>
      <SelectTrigger className="w-auto min-w-40">
        <SelectValue>
          {(value: string | null) => {
            if (!value || value === TODOS) return "Todos os profissionais";
            return professionals.find((p) => p.id === value)?.nome ?? "Todos os profissionais";
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>Todos os profissionais</SelectItem>
        {professionals.map((professional) => (
          <SelectItem key={professional.id} value={professional.id}>
            {professional.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

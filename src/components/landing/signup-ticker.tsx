"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Avisos ilustrativos de "alguém acabou de criar a agenda" — puramente
// decorativo (prova social comum em landing pages), nunca lido de nenhum
// dado real. Nomes/cidades/categorias fictícios, sorteados em loop.
const EXEMPLOS = [
  { nome: "Camila", cidade: "São Paulo, SP", categoria: "manicure" },
  { nome: "Juliana", cidade: "Belo Horizonte, MG", categoria: "cabeleireira" },
  { nome: "Rafael", cidade: "Curitiba, PR", categoria: "barbeiro" },
  { nome: "Beatriz", cidade: "Salvador, BA", categoria: "esteticista" },
  { nome: "Larissa", cidade: "Recife, PE", categoria: "designer de sobrancelhas" },
  { nome: "Thiago", cidade: "Porto Alegre, RS", categoria: "barbeiro" },
  { nome: "Amanda", cidade: "Fortaleza, CE", categoria: "maquiadora" },
  { nome: "Patrícia", cidade: "Rio de Janeiro, RJ", categoria: "cabeleireira" },
];

const TEMPOS_ATRAS = ["agora mesmo", "há 2 min", "há 5 min", "há 8 min", "há 12 min"];

const INTERVALO_MS = 9000;
const VISIVEL_MS = 6000;

export function SignupTicker() {
  const [indice, setIndice] = useState(0);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // Primeiro toast aparece depois de um tempinho na página (não assim que
    // carrega, pra não competir com o hero) e depois repete em loop.
    const primeiro = window.setTimeout(() => setVisivel(true), 3500);
    return () => window.clearTimeout(primeiro);
  }, []);

  useEffect(() => {
    if (!visivel) return;
    const esconder = window.setTimeout(() => setVisivel(false), VISIVEL_MS);
    return () => window.clearTimeout(esconder);
  }, [visivel]);

  useEffect(() => {
    const loop = window.setInterval(() => {
      setIndice((i) => (i + 1) % EXEMPLOS.length);
      setVisivel(true);
    }, INTERVALO_MS);
    return () => window.clearInterval(loop);
  }, []);

  const exemplo = EXEMPLOS[indice];
  const tempo = TEMPOS_ATRAS[indice % TEMPOS_ATRAS.length];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed bottom-4 left-4 z-30 hidden max-w-72 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg transition-all duration-500 sm:flex",
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <CalendarCheck className="size-4" />
      </span>
      <p className="text-xs text-foreground">
        <strong>{exemplo.nome}</strong>, {exemplo.categoria} em {exemplo.cidade}, acabou de criar a
        agenda na Beloo
        <span className="text-muted-foreground"> · {tempo}</span>
      </p>
    </div>
  );
}

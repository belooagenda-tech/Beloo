import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const DEPOIMENTOS = [
  {
    nome: "Juliana Souza",
    loja: "Studio Sobrancelha & Cia",
    iniciais: "JS",
    texto:
      "A Beloo facilitou muito o meu dia a dia. Agora recebo agendamentos direto no link e minhas clientes adoraram.",
  },
  {
    nome: "Carlos Mendes",
    loja: "Barbearia do Carlão",
    iniciais: "CM",
    texto:
      "Simples de usar e super completo. Meus clientes adoram a agenda e o horário chega certinho, sem furo.",
  },
  {
    nome: "Fernanda Lima",
    loja: "Fernanda Lima Nail Designer",
    iniciais: "FL",
    texto: "Prático, moderno e me ajuda a vender mais. O suporte também é excelente.",
  },
];

export function TestimonialsSection() {
  return (
    <section id="depoimentos" className="bg-secondary/30 px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Quem usa, agenda com mais tranquilidade
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {DEPOIMENTOS.map((d) => (
            <div key={d.nome} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-1 text-warning">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="size-3.5 fill-warning" />
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground">&ldquo;{d.texto}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{d.iniciais}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.loja}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

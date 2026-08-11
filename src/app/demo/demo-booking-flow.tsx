"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AtSign,
  CalendarCheck,
  Minus,
  Package,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { capitalizeFirst } from "@/lib/utils";

// ============================================================================
// Dados 100% simulados — nada aqui é uma loja real, nenhuma escrita acontece
// em lugar nenhum. Só existe pra deixar o visitante viver o fluxo de
// agendamento público antes de criar a própria conta.
// ============================================================================

const DEMO_NOME_LOJA = "Espaço Bella Hair";
const DEMO_INSTAGRAM = "@espacobellahair";
const DEMO_GOOGLE_NOTA = "4.9";

type DemoService = { id: string; nome: string; duracaoMin: number; preco: number };
type DemoProduct = { id: string; nome: string; preco: number };

const DEMO_SERVICES: DemoService[] = [
  { id: "s1", nome: "Corte feminino", duracaoMin: 45, preco: 80 },
  { id: "s2", nome: "Escova modelada", duracaoMin: 40, preco: 60 },
  { id: "s3", nome: "Coloração completa", duracaoMin: 90, preco: 150 },
  { id: "s4", nome: "Manicure + pedicure", duracaoMin: 50, preco: 65 },
];

const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "p1", nome: "Shampoo profissional 300ml", preco: 55 },
  { id: "p2", nome: "Óleo reparador de pontas", preco: 42 },
  { id: "p3", nome: "Kit finalização", preco: 98 },
];

const DEMO_PLANO = {
  nome: "Plano Cuidados Mensal",
  valor: 139,
  itens: ["2× Escova modelada por mês", "1× Manicure + pedicure por mês"],
};

// Entrada de 30% — só pra ilustrar a funcionalidade na tela de resumo; a
// demo nunca chega a cobrar nada de verdade, é sempre texto informativo.
const DEMO_ENTRADA_PERCENTUAL = 30;

const HORARIOS_BASE = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"];

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarDiasComHorarios() {
  const dias: { dataStr: string; label: string; horarios: string[] }[] = [];
  const hoje = new Date();
  for (let i = 0; i < 4; i++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + i);
    // No dia de hoje, só mostra os horários que ainda não passaram — mesmo
    // cuidado da agenda real, pra não parecer um mock óbvio.
    const horaAtual = i === 0 ? hoje.getHours() + hoje.getMinutes() / 60 : -1;
    const horarios = HORARIOS_BASE.filter((h) => {
      const [hh, mm] = h.split(":").map(Number);
      return hh + mm / 60 > horaAtual + 0.25;
    });
    if (horarios.length === 0) continue;
    const label = capitalizeFirst(
      new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" })
        .format(data)
        .replace(/\./g, ""),
    );
    dias.push({ dataStr: data.toDateString(), label, horarios });
    if (dias.length === 3) break;
  }
  return dias;
}

type Step = "servico" | "horario" | "produtos" | "dados" | "confirmacao";

export function DemoBookingFlow() {
  const [step, setStep] = useState<Step>("servico");
  const [selectedService, setSelectedService] = useState<DemoService | null>(null);
  const [selectedDia, setSelectedDia] = useState<string | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const dias = useMemo(() => gerarDiasComHorarios(), []);

  function handleSelectService(service: DemoService) {
    setSelectedService(service);
    setStep("horario");
  }

  function handleSelectHorario(dataStr: string, horario: string) {
    setSelectedDia(dataStr);
    setSelectedHorario(horario);
    setStep("produtos");
  }

  function setQuantidade(productId: string, quantidade: number) {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      if (quantidade <= 0) delete next[productId];
      else next[productId] = quantidade;
      return next;
    });
  }

  function handleConfirmar() {
    if (!nome.trim() || !telefone.trim()) return;
    setConfirmando(true);
    // Delay curto só pra sensação de "processando" bater com o fluxo real —
    // não existe nenhuma chamada de rede acontecendo aqui.
    setTimeout(() => {
      setConfirmando(false);
      setStep("confirmacao");
    }, 700);
  }

  const produtosTotal = DEMO_PRODUCTS.reduce(
    (acc, p) => acc + (selectedProducts[p.id] ?? 0) * p.preco,
    0,
  );
  const entradaValor = selectedService
    ? Math.round((selectedService.preco * DEMO_ENTRADA_PERCENTUAL) / 100)
    : 0;
  const diaLabel = dias.find((d) => d.dataStr === selectedDia)?.label ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/">
          <Logo />
        </Link>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="size-3.5" />
          Agenda de demonstração
        </Badge>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-secondary-foreground">
              {DEMO_NOME_LOJA.charAt(0)}
            </div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">{DEMO_NOME_LOJA}</h1>
            <p className="text-sm text-muted-foreground">Salão de beleza e estética</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <AtSign className="size-3.5" />
                {DEMO_INSTAGRAM}
              </span>
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-warning text-warning" />
                {DEMO_GOOGLE_NOTA} no Google
              </span>
            </div>
          </div>

          {step === "servico" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {DEMO_SERVICES.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleSelectService(service)}
                    className="block w-full text-left"
                  >
                    <Card className="transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{service.nome}</p>
                          <p className="text-sm text-muted-foreground">{service.duracaoMin} min</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {formatarPreco(service.preco)}
                        </span>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Planos</h2>
                </div>
                <Card>
                  <CardContent className="space-y-2 py-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{DEMO_PLANO.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatarPreco(DEMO_PLANO.valor)}/mês
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DEMO_PLANO.itens.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exemplo de plano recorrente — na sua agenda, o cliente assina e paga direto por aqui.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {step === "horario" && selectedService ? (
            <div className="space-y-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("servico")}>
                <ArrowLeft className="size-4" />
                Trocar serviço
              </Button>
              <div className="space-y-4">
                {dias.map((dia) => (
                  <div key={dia.dataStr}>
                    <p className="mb-2 text-sm font-medium text-foreground">{dia.label}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {dia.horarios.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleSelectHorario(dia.dataStr, h)}
                          className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-secondary"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === "produtos" && selectedService ? (
            <div className="space-y-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("horario")}>
                <ArrowLeft className="size-4" />
                Trocar horário
              </Button>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Quer levar algum produto?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Opcional — some ao valor do atendimento. Dá pra pular essa etapa.
                </p>
              </div>
              <ul className="space-y-2">
                {DEMO_PRODUCTS.map((product) => {
                  const quantidade = selectedProducts[product.id] ?? 0;
                  return (
                    <li key={product.id}>
                      <Card>
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                            <Package className="size-4" />
                          </div>
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
              <Button type="button" className="w-full" onClick={() => setStep("dados")}>
                {produtosTotal > 0
                  ? `Continuar · +${formatarPreco(produtosTotal)} em produtos`
                  : "Continuar sem produtos"}
              </Button>
            </div>
          ) : null}

          {step === "dados" && selectedService ? (
            <div className="space-y-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("produtos")}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>

              <Card>
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-foreground">{selectedService.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {diaLabel} às {selectedHorario} · {formatarPreco(selectedService.preco)}
                  </p>
                  {produtosTotal > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      + produtos: {formatarPreco(produtosTotal)} (pago no dia)
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium text-primary">
                    Entrada de {formatarPreco(entradaValor)} para confirmar · restante{" "}
                    {formatarPreco(selectedService.preco - entradaValor + produtosTotal)} no dia
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-telefone">WhatsApp</Label>
                  <Input
                    id="demo-telefone"
                    placeholder="(21) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-nome">Seu nome</Label>
                  <Input
                    id="demo-nome"
                    placeholder="Como podemos te chamar"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={confirmando || !nome.trim() || !telefone.trim()}
                  onClick={handleConfirmar}
                >
                  {confirmando ? "Aguarde..." : "Ir para pagamento"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "confirmacao" && selectedService ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
                    <CalendarCheck className="size-6 text-success" />
                  </div>
                  <h1 className="font-heading text-lg font-semibold text-foreground">
                    Agendamento confirmado, {nome.trim().split(" ")[0]}!
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedService.nome} com <strong>{DEMO_NOME_LOJA}</strong>
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {diaLabel} às {selectedHorario}
                  </p>
                  {produtosTotal > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      + produtos escolhidos: {formatarPreco(produtosTotal)} (pago no dia)
                    </p>
                  ) : null}
                  <p className="text-xs font-medium text-success">
                    Você já pagou {formatarPreco(entradaValor)} de entrada — falta pagar{" "}
                    {formatarPreco(selectedService.preco - entradaValor + produtosTotal)} no local.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/40 bg-secondary/40">
                <CardContent className="space-y-3 py-6 text-center">
                  <p className="font-heading text-lg font-semibold text-foreground">
                    🎉 Viu como foi fácil?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Foi assim, sozinho(a) e a qualquer hora, que seus clientes vão agendar com{" "}
                    <strong>você</strong> — sem grupo de WhatsApp lotado, sem ida e volta de mensagem.
                    E depois do atendimento, você ainda pode convidar quem avaliou a te seguir no
                    Instagram e avaliar no Google.
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    nativeButton={false}
                    render={<Link href="/criar-agenda">Criar minha agenda grátis</Link>}
                  />
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep("servico");
                      setSelectedService(null);
                      setSelectedDia(null);
                      setSelectedHorario(null);
                      setSelectedProducts({});
                      setNome("");
                      setTelefone("");
                    }}
                  >
                    Testar de novo
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

import { describe, it, expect } from "vitest";
import { buildWhatsAppLink, buildAppointmentReminderMessage, buildPlanRenewalMessage } from "./whatsapp";

describe("buildWhatsAppLink", () => {
  it("monta a URL com DDI 55 + telefone formatado, mesmo com máscara na entrada", () => {
    const link = buildWhatsAppLink("(21) 97265-2314", "Olá");
    expect(link).toBe("https://wa.me/5521972652314?text=Ol%C3%A1");
  });

  it("codifica espaços, acentos e emojis da mensagem corretamente", () => {
    const link = buildWhatsAppLink("21972652314", "Oi, você tem horário às 14h? 😊");
    const url = new URL(link);
    expect(url.searchParams.get("text")).toBe("Oi, você tem horário às 14h? 😊");
  });

  it("funciona com telefone fixo (10 dígitos)", () => {
    const link = buildWhatsAppLink("2132652314", "Oi");
    expect(link).toBe("https://wa.me/552132652314?text=Oi");
  });
});

describe("buildAppointmentReminderMessage", () => {
  it("monta a mensagem de lembrete com os dados do agendamento", () => {
    const mensagem = buildAppointmentReminderMessage({
      clienteNome: "Maria",
      servicoNome: "Corte feminino",
      nomeLoja: "Studio Bela",
      dataHoraFormatada: "10/08 às 14:00",
    });
    expect(mensagem).toContain("Maria");
    expect(mensagem).toContain("Corte feminino");
    expect(mensagem).toContain("Studio Bela");
    expect(mensagem).toContain("10/08 às 14:00");
  });

  it("não inclui link de gerenciar quando não informado", () => {
    const mensagem = buildAppointmentReminderMessage({
      clienteNome: "Maria",
      servicoNome: "Corte feminino",
      nomeLoja: "Studio Bela",
      dataHoraFormatada: "10/08 às 14:00",
    });
    expect(mensagem).not.toContain("remarcar");
  });

  it("inclui o link de remarcar/cancelar quando informado", () => {
    const mensagem = buildAppointmentReminderMessage({
      clienteNome: "Maria",
      servicoNome: "Corte feminino",
      nomeLoja: "Studio Bela",
      dataHoraFormatada: "10/08 às 14:00",
      linkGerenciar: "https://beloo.app/studio-bela/meus-agendamentos",
    });
    expect(mensagem).toContain("remarcar ou cancelar");
    expect(mensagem).toContain("https://beloo.app/studio-bela/meus-agendamentos");
  });

  it("usa o template customizado do profissional quando informado", () => {
    const mensagem = buildAppointmentReminderMessage({
      clienteNome: "Maria",
      servicoNome: "Corte feminino",
      nomeLoja: "Studio Bela",
      dataHoraFormatada: "10/08 às 14:00",
      template: "E aí {cliente}, bora {servico} dia {data_hora}? Te espero na {loja}!",
    });
    expect(mensagem).toBe("E aí Maria, bora Corte feminino dia 10/08 às 14:00? Te espero na Studio Bela!");
  });

  it("cai no template padrão quando o customizado é vazio/nulo", () => {
    const mensagem = buildAppointmentReminderMessage({
      clienteNome: "Maria",
      servicoNome: "Corte feminino",
      nomeLoja: "Studio Bela",
      dataHoraFormatada: "10/08 às 14:00",
      template: null,
    });
    expect(mensagem).toContain("Passando para lembrar");
  });

  it("mantém placeholder desconhecido como texto literal em vez de quebrar", () => {
    const mensagem = buildAppointmentReminderMessage({
      clienteNome: "Maria",
      servicoNome: "Corte feminino",
      nomeLoja: "Studio Bela",
      dataHoraFormatada: "10/08 às 14:00",
      template: "Oi {cliente}, valor: {preco}",
    });
    expect(mensagem).toBe("Oi Maria, valor: {preco}");
  });
});

describe("buildPlanRenewalMessage", () => {
  it("monta a mensagem de cobrança de renovação de plano", () => {
    const mensagem = buildPlanRenewalMessage({
      clienteNome: "João",
      planoNome: "Plano Básico",
      nomeLoja: "Studio Bela",
      dataRenovacaoFormatada: "15/08",
    });
    expect(mensagem).toContain("João");
    expect(mensagem).toContain("Plano Básico");
    expect(mensagem).toContain("Studio Bela");
    expect(mensagem).toContain("15/08");
  });
});

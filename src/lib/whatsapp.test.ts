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

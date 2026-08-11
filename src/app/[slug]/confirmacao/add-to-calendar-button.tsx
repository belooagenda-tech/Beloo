"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Formato UTC exigido pelo padrão iCalendar (YYYYMMDDTHHMMSSZ) — não precisa
// se preocupar com fuso aqui, `new Date(iso)` já traz o instante absoluto
// certo e os apps de calendário convertem pro fuso local sozinhos.
function toIcsDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcs(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

// Gera e baixa um arquivo .ics na hora, sem nenhuma biblioteca nova — o
// formato é simples o bastante pra montar como string (mesmo espírito do
// export-csv-button.tsx do Financeiro).
export function AddToCalendarButton({
  titulo,
  descricao,
  inicioISO,
  fimISO,
  local,
}: {
  titulo: string;
  descricao: string;
  inicioISO: string;
  fimISO: string;
  local: string;
}) {
  function handleClick() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Beloo//Agendamento//PT-BR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@beloo.app`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${toIcsDate(inicioISO)}`,
      `DTEND:${toIcsDate(fimISO)}`,
      `SUMMARY:${escapeIcs(titulo)}`,
      `DESCRIPTION:${escapeIcs(descricao)}`,
      `LOCATION:${escapeIcs(local)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "agendamento-beloo.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick}>
      <CalendarPlus className="size-4" />
      Adicionar ao calendário
    </Button>
  );
}

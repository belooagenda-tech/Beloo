"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Evento não padronizado no lib.dom.d.ts do TS — só existe em
// Chrome/Edge/navegadores baseados em Chromium.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "beloo:install-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function foiDispensadoRecentemente(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const dias = (Date.now() - Number(raw)) / (24 * 60 * 60 * 1000);
  return dias < DISMISS_DAYS;
}

// Prompt de "adicionar à tela inicial" — Android/Chrome/Edge conseguem
// mostrar o diálogo nativo do navegador via beforeinstallprompt; iOS Safari
// não expõe esse evento (Apple não implementa), então ali só dá pra
// instruir o passo manual (Compartilhar -> Adicionar à Tela de Início).
// Montado dentro de AppShell — só aparece pra quem já está logado em /app,
// contexto certo pra sugerir instalar "o app de trabalho".
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarInstrucaoIos, setMostrarInstrucaoIos] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    if (isStandalone() || foiDispensadoRecentemente()) return;

    if (isIos()) {
      // Mesmo padrão de ClientPushOptIn/PushNotificationsCard: o setState
      // vai num .then() em vez de direto no corpo do efeito — evita
      // renders em cascata sincronamente ligados ao mount (react-hooks
      // não recomenda setState direto ali, mesmo quando o valor já é
      // conhecido de cara).
      Promise.resolve().then(() => setMostrarInstrucaoIos(true));
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDispensado(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }

  if (dispensado || (!deferredPrompt && !mostrarInstrucaoIos)) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-4 py-2.5 sm:px-6 print:hidden">
      <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {mostrarInstrucaoIos ? (
          <p className="text-sm text-foreground">
            Instale o Beloo na tela inicial: toque em{" "}
            <Share className="inline size-3.5 -translate-y-px" aria-hidden="true" /> Compartilhar e depois em
            &ldquo;Adicionar à Tela de Início&rdquo;.
          </p>
        ) : (
          <p className="text-sm text-foreground">
            Instale o Beloo no seu celular e acesse como um app, direto da tela inicial.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {deferredPrompt ? (
          <Button type="button" size="sm" onClick={handleInstall}>
            Instalar
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dispensar"
          onClick={handleDismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

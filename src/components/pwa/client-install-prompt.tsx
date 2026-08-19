"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mesmo tipo de install-prompt.tsx (não padronizado no lib.dom.d.ts do TS).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Prompt de instalação pro CLIENTE FINAL na vitrine pública — distinto do
// InstallPrompt de app/(gated) (esse é pro profissional). Instalar por
// aqui usa o manifest por loja de /api/public-manifest/[slug] (ver
// generateMetadata em app/[slug]/layout.tsx), então o ícone criado abre de
// volta na página de agendamento dessa loja, nunca em /app (área do dono,
// atrás de login) — por isso não dá pra reaproveitar o InstallPrompt do
// profissional aqui. Dispensa é por loja (chave inclui o slug): o cliente
// decide app a app, não é uma escolha "pra sempre" pra todo o Beloo.
export function ClientInstallPrompt({ slug, nomeLoja }: { slug: string; nomeLoja: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarInstrucaoIos, setMostrarInstrucaoIos] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  const dismissKey = `beloo:client-install-dismissed:${slug}`;

  useEffect(() => {
    const raw = localStorage.getItem(dismissKey);
    const dispensadoRecentemente = raw
      ? (Date.now() - Number(raw)) / (24 * 60 * 60 * 1000) < DISMISS_DAYS
      : false;
    if (isStandalone() || dispensadoRecentemente) return;

    if (isIos()) {
      // setState direto no corpo do efeito dispara um lint de "cascading
      // renders" (react-hooks/set-state-in-effect) — mesmo contorno já
      // usado em install-prompt.tsx, joga pra um microtask.
      Promise.resolve().then(() => setMostrarInstrucaoIos(true));
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function handleDismiss() {
    localStorage.setItem(dismissKey, String(Date.now()));
    setDispensado(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    localStorage.setItem(dismissKey, String(Date.now()));
  }

  if (dispensado || (!deferredPrompt && !mostrarInstrucaoIos)) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-4 py-2.5 sm:px-10 print:hidden">
      <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {mostrarInstrucaoIos ? (
          <p className="text-sm text-foreground">
            Instale o app da <strong>{nomeLoja}</strong>: toque em{" "}
            <Share className="inline size-3.5 -translate-y-px" aria-hidden="true" /> Compartilhar e depois em
            &ldquo;Adicionar à Tela de Início&rdquo; — receba avisos de promoções, cupons e do seu
            agendamento.
          </p>
        ) : (
          <p className="text-sm text-foreground">
            Instale o app da <strong>{nomeLoja}</strong> e receba avisos de promoções, cupons de
            desconto e informações do seu agendamento direto no celular.
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

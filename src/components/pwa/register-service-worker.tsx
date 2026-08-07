"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// Registra o Service Worker e cuida do fluxo de atualização: quando uma
// versão nova termina de instalar (fica "waiting"), mostra um toast com
// "Atualizar" em vez de trocar a versão em uso sem avisar — evita o usuário
// ficar preso numa versão antiga do app shell (achado 🟠 da auditoria de
// 2026-08-07) e evita trocar de JS no meio de uma ação em andamento.
function promptToUpdate(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting;
  if (!waiting) return;

  toast("Uma nova versão do Beloo está disponível.", {
    id: "sw-update",
    duration: Infinity,
    action: {
      label: "Atualizar",
      onClick: () => {
        waiting.postMessage("SKIP_WAITING");
      },
    },
  });
}

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Só recarrega quando a troca foi pedida pelo usuário (clique em
      // "Atualizar" chama skipWaiting, que dispara este evento) — sem essa
      // guarda, o primeiro registro do SW também dispararia um reload.
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Uma versão já pode estar esperando (ex.: usuário abriu o app,
        // fechou antes de atualizar, e voltou depois).
        promptToUpdate(registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              promptToUpdate(registration);
            }
          });
        });

        // Navegadores só checam o sw.js automaticamente em navegações; numa
        // PWA instalada (standalone), o usuário pode ficar com a aba aberta
        // por muito tempo sem navegar — checa de novo sempre que a aba volta
        // a ficar visível.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        });
      })
      .catch(() => {});
  }, []);

  return null;
}

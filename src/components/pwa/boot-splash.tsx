import { LogoMark } from "@/components/brand/logo";

// Fallback do <Suspense> em app/app/layout.tsx: cobre o tempo entre o
// usuário abrir o app (ícone na tela inicial) e o layout autenticado
// resolver auth + negócio + perfil + notificações. Sem isso, o navegador
// não tem nada pra pintar nesse intervalo — tela preta/em branco até tudo
// responder. É HTML+CSS puro (sem client JS), então pinta assim que o
// primeiro chunk da resposta chega, antes até da página terminar de
// carregar o bundle.
export function BootSplash() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
      <LogoMark className="size-16 animate-[boot-pulse_1.6s_ease-in-out_infinite]" />
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
        beloo
      </span>
    </div>
  );
}

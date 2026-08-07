import { ImageResponse } from "next/og";

// Splash screen do iOS gerada em código (sem depender de asset de design
// pronto) — ver <link rel="apple-touch-startup-image"> em layout.tsx, que
// aponta pra essa rota com w/h de cada tamanho de tela coberto. iOS 15+ já
// sintetiza uma tela de abertura básica a partir de theme_color + ícone do
// manifest quando não encontra uma explícita, então isso aqui é polish, não
// pré-requisito pro PWA funcionar (achado 🟢 da auditoria de 2026-08-07).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const width = Math.min(Number(searchParams.get("w")) || 1170, 3000);
  const height = Math.min(Number(searchParams.get("h")) || 2532, 3000);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
        }}
      >
        <div style={{ fontSize: Math.round(width * 0.14), fontWeight: 700, color: "#7C3AED", fontFamily: "sans-serif" }}>
          Beloo
        </div>
      </div>
    ),
    { width, height },
  );
}

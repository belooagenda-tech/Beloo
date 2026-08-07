import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Gerada em código (não depende de um asset de design pronto) — usa as
// mesmas cores da marca definidas em globals.css. Serve de OG image padrão
// para qualquer página que não defina a própria (achado 🟡 da auditoria de
// 2026-08-07: nenhum preview ao compartilhar links da Beloo).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>Beloo</div>
        <div style={{ fontSize: 32, marginTop: 16, opacity: 0.9 }}>Agenda online para profissionais</div>
      </div>
    ),
    { ...size },
  );
}

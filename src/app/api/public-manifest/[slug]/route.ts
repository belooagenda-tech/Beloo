import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Manifest PWA por loja — separado do manifest.json global (usado pelo
// profissional em /app). Um cliente que instala pelo link público precisa
// abrir de volta na página de agendamento daquela loja (start_url/scope
// escopados a /{slug}), nunca em /app (que é a área do dono, atrás de
// login) — por isso não dá pra reaproveitar o mesmo manifest pros dois
// públicos. `id` distinto garante que cada loja vira um "app" instalável
// separado, mesmo todas vivendo na mesma origem.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) {
    return new NextResponse("Not found", { status: 404 });
  }

  const manifest = {
    id: `/${slug}`,
    name: `${business.nome_loja} — agendamento online`,
    short_name: business.nome_loja,
    description: `Agende, veja seus horários e acompanhe novidades de ${business.nome_loja}.`,
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAFAFA",
    theme_color: "#7C3AED",
    lang: "pt-BR",
    categories: ["business", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // Nome da loja muda raramente — cache curto tira carga do Supabase
      // sem deixar um rebranding preso por muito tempo.
      "Cache-Control": "public, max-age=3600",
    },
  });
}

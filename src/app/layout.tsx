import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { MetaPixel } from "@/components/meta-pixel/meta-pixel";
import { getMetaAdsSettings } from "@/lib/meta-ads/settings";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://beloo.app";
const TITLE_PADRAO = "Beloo — Agenda online para profissionais";
const DESCRICAO_PADRAO =
  "Configure sua agenda, compartilhe seu link e receba agendamentos. O jeito simples de organizar seu dia a dia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_PADRAO,
    template: "%s · Beloo",
  },
  description: DESCRICAO_PADRAO,
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS Safari não lê o `display: standalone` do manifest.json pra decidir
  // se abre em tela cheia — precisa dessas meta tags específicas (que o
  // Next injeta a partir daqui) além do link de apple-touch-icon acima.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Beloo",
  },
  openGraph: {
    title: TITLE_PADRAO,
    description: DESCRICAO_PADRAO,
    url: SITE_URL,
    siteName: "Beloo",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_PADRAO,
    description: DESCRICAO_PADRAO,
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
};

// Splash screens do iOS instalado (standalone) — cobre os tamanhos de tela
// mais comuns hoje. Não é exaustivo (existem ~15 variações de tela entre
// modelos de iPhone/iPad); o Safari 15+ já sintetiza uma tela de abertura
// razoável a partir de theme_color + ícone quando não acha nenhuma destas,
// então isso é polish visual, não algo que quebra sem estar 100% completo.
const APPLE_SPLASH_SCREENS = [
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 }, // iPhone 15/14 Pro Max
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 }, // iPhone 15/14/13
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 }, // iPhone 12/13
  { w: 750, h: 1334, dw: 375, dh: 667, dpr: 2 }, // iPhone SE/8/7/6s
  { w: 2048, h: 2732, dw: 1024, dh: 1366, dpr: 2 }, // iPad Pro 12.9"
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { pixelId, trackingEnabled } = await getMetaAdsSettings();

  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {APPLE_SPLASH_SCREENS.map((s) => (
          <link
            key={`${s.w}x${s.h}`}
            rel="apple-touch-startup-image"
            href={`/apple-splash?w=${s.w}&h=${s.h}`}
            media={`(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`}
          />
        ))}
      </head>
      <body className="min-h-full flex flex-col">
        <MetaPixel pixelId={trackingEnabled ? pixelId : null} />
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}

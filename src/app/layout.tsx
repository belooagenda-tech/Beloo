import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}

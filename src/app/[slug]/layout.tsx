import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClientInstallPrompt } from "@/components/pwa/client-install-prompt";
import { getPublicBusiness } from "./data";

// Sobrescreve, só pra essa árvore de rotas (vitrine pública + confirmação +
// meus agendamentos + planos), o manifest/appleWebApp do layout raiz — que
// são pro profissional em /app. O manifest daqui é gerado por loja em
// /api/public-manifest/[slug] (start_url/scope = /{slug}), pra quem
// instalar pelo link público abrir de volta na página da loja, nunca em
// /app (área do dono, atrás de login). Next mescla metadata por segmento
// substituindo chaves simples como essas (não faz merge profundo), então
// isso não precisa repetir o resto do metadata do layout raiz.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBusiness(slug);
  if (!data) return {};

  return {
    manifest: `/api/public-manifest/${slug}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: data.business.nome_loja,
    },
  };
}

export default async function PublicSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicBusiness(slug);

  return (
    <>
      {data ? <ClientInstallPrompt slug={slug} nomeLoja={data.business.nome_loja} /> : null}
      {children}
    </>
  );
}

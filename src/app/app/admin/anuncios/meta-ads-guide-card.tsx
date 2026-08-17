import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetaAdsGuideCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como conseguir as chaves e conectar o Pixel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-muted-foreground">
        <ol className="list-decimal space-y-4 pl-4 marker:font-semibold marker:text-foreground">
          <li>
            <p className="font-medium text-foreground">Pixel ID</p>
            <p className="mt-1">
              Acesse{" "}
              <span className="font-mono text-xs">business.facebook.com/events_manager</span> com a
              conta que administra os anúncios da Beloo. Escolha (ou crie) a fonte de dados do tipo
              &ldquo;Pixel&rdquo;, entre em <strong>Configurações</strong> e copie o número que aparece
              como &ldquo;ID do Pixel&rdquo; — cole no campo abaixo.
            </p>
          </li>
          <li>
            <p className="font-medium text-foreground">Access Token da Conversions API</p>
            <p className="mt-1">
              No mesmo Pixel, vá em <strong>Configurações → Conversions API</strong>. O jeito mais
              rápido é clicar em &ldquo;Gerar token de acesso&rdquo; ali mesmo — vale pra começar a
              testar hoje. Pra produção de verdade, o recomendado é criar um{" "}
              <strong>usuário do sistema</strong> em Configurações do Negócio → Usuários → Usuários do
              sistema, dar acesso a esse Pixel e gerar um token por lá (não expira sozinho). De
              qualquer forma, o token nunca aparece de novo depois de salvo aqui — se precisar trocar,
              gere um novo no Meta e cole por cima.
            </p>
          </li>
          <li>
            <p className="font-medium text-foreground">Test Event Code (só durante os testes)</p>
            <p className="mt-1">
              No Events Manager, dentro do Pixel, abra a aba <strong>Testar eventos</strong>. Um código
              (tipo <span className="font-mono text-xs">TEST12345</span>) aparece no topo — cole abaixo
              e use os botões de &ldquo;Testar eventos&rdquo; desta página. Os eventos aparecem ali em
              tempo real, com o motivo de qualquer falha. Depois de confirmar que está tudo certo, é
              recomendado <strong>apagar esse campo</strong>: eventos marcados com Test Event Code não
              contam pra otimização de anúncio, então ele não pode ficar preenchido em produção.
            </p>
          </li>
          <li>
            <p className="font-medium text-foreground">Ligar de verdade</p>
            <p className="mt-1">
              Com Pixel ID e Access Token salvos, ligue <strong>Rastreamento ativo</strong>. A partir
              daí o Pixel carrega em todas as páginas do site e os eventos de cadastro/trial/assinatura
              passam a ser enviados de verdade. Nos primeiros dias, acompanhe a aba{" "}
              <strong>Visão geral</strong> do Events Manager pra conferir volume e a qualidade de
              correspondência (match quality) dos eventos server-side.
            </p>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}

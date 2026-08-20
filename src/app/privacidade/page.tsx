import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" atualizadoEm="20 de agosto de 2026">
      <section>
        <p>
          A Beloo é uma ferramenta de agenda online para profissionais de
          beleza. Esta política explica quais dados coletamos, por que
          coletamos e o que você pode fazer com eles.
        </p>
      </section>

      <section>
        <h2>Quem somos</h2>
        <p>
          A Beloo processa dados de três tipos de pessoa: o{" "}
          <strong>profissional</strong>, que cria uma conta e usa a Beloo
          para organizar sua agenda; o <strong>cliente final</strong>, que
          agenda horários pela página pública do profissional sem precisar
          criar conta; e o <strong>parceiro de indicação</strong>
          (&quot;divulgador&quot;), que se cadastra para indicar a Beloo a
          outros profissionais e recebe comissão pelas assinaturas geradas.
        </p>
      </section>

      <section>
        <h2>Dados que coletamos do profissional</h2>
        <ul>
          <li>Nome, telefone e e-mail informados no cadastro.</li>
          <li>
            Dados da loja: nome da marca, categoria, logo (opcional) e
            configurações de agenda.
          </li>
          <li>
            Serviços, clientes, agendamentos, pagamentos registrados e planos
            cadastrados por você na plataforma.
          </li>
          <li>
            Membros de equipe que você cadastra (nome, foto e cor de
            identificação) — eles não têm login próprio nem acesso à
            plataforma; é responsabilidade sua, como dono da loja, informá-los
            de que os dados estão cadastrados na Beloo.
          </li>
          <li>
            Assinatura de notificações push do navegador, se você optar por
            ativá-las — usadas para lembretes, avisos de pagamento e
            promoções que você mesmo decide enviar aos seus clientes.
          </li>
          <li>
            Se você conectar sua conta do Google Calendar, o e-mail dessa
            conta e um token de acesso (ver seção própria abaixo).
          </li>
        </ul>
      </section>

      <section>
        <h2>Dados que coletamos do cliente final</h2>
        <p>
          Quando alguém agenda um horário pela sua página pública, coletamos
          apenas o nome e o WhatsApp informados no momento do agendamento.
          Esses dados ficam associados à sua conta como profissional — a
          Beloo não os utiliza para nenhuma outra finalidade além de
          viabilizar o agendamento e, se o cliente autorizar notificações no
          navegador, enviar lembretes e avisos relacionados ao horário
          marcado.
        </p>
      </section>

      <section>
        <h2>Dados que coletamos do parceiro de indicação (divulgador)</h2>
        <p>
          Quem se cadastra no programa de indicação informa nome, e-mail e
          senha, e recebe um link de afiliado próprio. Para receber as
          comissões geradas, o divulgador conecta uma conta Stripe Connect —
          a Beloo não armazena dados bancários ou de cartão diretamente,
          essas informações ficam com a Stripe.
        </p>
      </section>

      <section>
        <h2>Para que usamos esses dados</h2>
        <ul>
          <li>Calcular horários disponíveis e evitar conflitos de agenda.</li>
          <li>Enviar notificações de novos agendamentos, cancelamentos e lembretes.</li>
          <li>
            Gerar relatórios financeiros e de uso de planos, visíveis apenas
            para o profissional dono da agenda.
          </li>
          <li>Calcular e pagar comissões de indicação aos divulgadores.</li>
          <li>Autenticação e segurança da conta.</li>
        </ul>
      </section>

      <section>
        <h2>Integração com o Google Calendar (opcional)</h2>
        <p>
          Se você conectar sua conta do Google em Configurações, a Beloo
          passa a: (1) criar, atualizar e apagar eventos na sua agenda do
          Google refletindo os agendamentos feitos pela plataforma; e (2), só
          quando você escolher explicitamente quais eventos importar, trazer
          compromissos existentes no seu Google Calendar como horários
          bloqueados na Agenda da Beloo. A Beloo nunca lê nem importa nada do
          seu Google Calendar automaticamente — a importação é sempre um
          evento por vez, escolhido por você.
        </p>
        <p>
          O token de acesso à sua conta Google fica criptografado no banco de
          dados e só é usado pelo servidor da Beloo, nunca exposto ao
          navegador. Você pode desligar a sincronização automática ou
          desconectar sua conta a qualquer momento em Configurações — isso
          não apaga os eventos já criados na sua agenda do Google nem os
          horários já importados para a Beloo.
        </p>
      </section>

      <section>
        <h2>Com quem compartilhamos</h2>
        <p>
          Os dados são armazenados com o Supabase (banco de dados e
          autenticação) e a aplicação roda na infraestrutura da Vercel,
          ambos atuando como operadores de dados a serviço da Beloo.
          Pagamentos são processados pelo Mercado Pago (entrada de
          agendamentos e planos) e pela Stripe (assinatura da Beloo e
          comissões de divulgadores) — a Beloo não armazena dados de cartão.
          Se você conectar sua conta, o Google Calendar recebe os dados
          descritos na seção acima. Não vendemos dados a terceiros.
        </p>
        <p>
          Quando um profissional se cadastra a partir de um anúncio no
          Instagram ou Facebook, enviamos ao Meta (dono dessas redes) uma
          versão criptografada (hash, não reversível) do seu e-mail e
          telefone, junto com identificadores do próprio anúncio — usados
          só para medir a eficácia da campanha, nunca para outra finalidade.
          Isso só acontece com dados do profissional, nunca com dados de
          clientes finais, e só quando o rastreamento de anúncios está
          habilitado pela Beloo.
        </p>
      </section>

      <section>
        <h2>Isolamento entre profissionais</h2>
        <p>
          Cada profissional só acessa os dados da própria loja. Os dados de
          clientes, agendamentos e financeiro de uma conta nunca ficam
          visíveis para outro profissional cadastrado na Beloo.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>
          Como profissional, você pode editar seus dados a qualquer momento
          em Configurações, e excluir permanentemente sua conta e todos os
          dados associados (loja, clientes, agendamentos, histórico
          financeiro) na mesma tela. Como cliente final, você pode pedir a
          exclusão dos seus dados diretamente ao profissional com quem
          agendou, já que é ele quem administra essas informações. Como
          divulgador, você pode pedir a exclusão da sua conta e dados
          associados entrando em contato pelo e-mail de suporte abaixo.
        </p>
      </section>

      <section>
        <h2>Contato</h2>
        <p>
          Dúvidas sobre esta política podem ser enviadas para o e-mail de
          suporte informado no rodapé do site.
        </p>
      </section>
    </LegalPage>
  );
}

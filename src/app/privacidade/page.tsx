import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" atualizadoEm="03 de agosto de 2026">
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
          A Beloo processa dados de dois tipos de pessoa: o{" "}
          <strong>profissional</strong>, que cria uma conta e usa a Beloo
          para organizar sua agenda, e o <strong>cliente final</strong>, que
          agenda horários pela página pública do profissional sem precisar
          criar conta.
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
            Assinatura de notificações push do navegador, se você optar por
            ativá-las.
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
          navegador, enviar lembretes do horário marcado.
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
          <li>Autenticação e segurança da conta.</li>
        </ul>
      </section>

      <section>
        <h2>Com quem compartilhamos</h2>
        <p>
          Os dados são armazenados com o Supabase (banco de dados e
          autenticação) e a aplicação roda na infraestrutura da Vercel,
          ambos atuando como operadores de dados a serviço da Beloo. Não
          vendemos nem compartilhamos dados com terceiros para fins de
          publicidade.
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
          agendou, já que é ele quem administra essas informações.
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

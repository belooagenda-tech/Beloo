import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" atualizadoEm="03 de agosto de 2026">
      <section>
        <p>
          Estes termos regem o uso da Beloo, uma ferramenta de agenda online
          para profissionais autônomos de beleza (manicures,
          sobrancelheiras, barbeiros, esteticistas e afins).
        </p>
      </section>

      <section>
        <h2>O que é a Beloo</h2>
        <p>
          A Beloo permite que um profissional configure sua disponibilidade,
          cadastre serviços e receba agendamentos por um link público, além
          de organizar clientes, planos e o controle financeiro básico dos
          próprios atendimentos.
        </p>
      </section>

      <section>
        <h2>Cadastro e responsabilidade pela conta</h2>
        <ul>
          <li>
            Você é responsável por manter a confidencialidade da sua senha e
            por tudo o que acontece na sua conta.
          </li>
          <li>
            As informações que você cadastra (serviços, preços, horários,
            dados de clientes) são de sua responsabilidade — a Beloo não
            valida a exatidão desses dados.
          </li>
          <li>
            Você não pode usar um link de loja (slug) que viole marcas de
            terceiros ou tente se passar por outra pessoa ou empresa.
          </li>
        </ul>
      </section>

      <section>
        <h2>Uso da página pública de agendamento</h2>
        <p>
          A página pública da sua loja pode ser acessada por qualquer
          pessoa com o link. Você é responsável por confirmar, cancelar ou
          entrar em contato com clientes conforme as regras que você mesmo
          configura (antecedência mínima, prazo de cancelamento etc.).
        </p>
      </section>

      <section>
        <h2>Pagamentos registrados na plataforma</h2>
        <p>
          Por padrão, a Beloo registra pagamentos informados manualmente
          pelo profissional (dinheiro, Pix, débito, crédito) — ela não
          processa nem intermedeia a movimentação financeira desses
          registros, que servem apenas para o seu controle interno.
        </p>
      </section>

      <section>
        <h2>Disponibilidade do serviço</h2>
        <p>
          Fazemos o possível para manter a Beloo no ar, mas não garantimos
          disponibilidade ininterrupta. Não nos responsabilizamos por perdas
          decorrentes de indisponibilidade temporária, falhas de terceiros
          (como o provedor de hospedagem ou banco de dados) ou uso indevido
          da plataforma por outros usuários.
        </p>
      </section>

      <section>
        <h2>Cancelamento da conta</h2>
        <p>
          Você pode excluir sua conta a qualquer momento em Configurações.
          A exclusão é permanente e apaga todos os dados da sua loja,
          incluindo clientes e histórico financeiro.
        </p>
      </section>

      <section>
        <h2>Alterações nestes termos</h2>
        <p>
          Podemos atualizar estes termos conforme a Beloo evolui. Mudanças
          relevantes serão comunicadas pelos canais habituais de contato.
        </p>
      </section>

      <section>
        <h2>Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para o e-mail de
          suporte informado no rodapé do site.
        </p>
      </section>
    </LegalPage>
  );
}

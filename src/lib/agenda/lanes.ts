// Particiona itens do dia (agendamentos + bloqueios) que se sobrepõem no
// tempo em "colunas" lado a lado — só entra em jogo quando a loja tem vários
// profissionais atendendo ao mesmo tempo (ver appointments_no_overlap em
// supabase/migrations/20260819000001_professionals.sql: com um único
// profissional/loja como recurso, nunca existe sobreposição real, então
// todo item cai sozinho na própria "coluna" e ocupa a largura inteira).
//
// Algoritmo em duas passadas, mesmo usado por calendários do tipo
// Google/Outlook (heurística, não coloração ótima de intervalos — suficiente
// pro volume de itens de um dia):
//   1. Agrupa itens em clusters transitivos (A se sobrepõe com B, B com C =>
//      A, B, C no mesmo cluster, mesmo que A e C não se sobreponham direto).
//   2. Dentro de cada cluster, varredura gulosa: cada item pega a primeira
//      coluna já livre (cujo último item termina antes dele começar); se
//      nenhuma está livre, abre uma coluna nova. Todo item do cluster
//      recebe o mesmo "lanesTotal" (nº de colunas abertas nesse cluster),
//      pra dividirem a largura de forma uniforme.
export type LaneItem = { id: string; inicio: number; fim: number };
export type LaneAssignment = { lane: number; lanesTotal: number };

export function computeLanes(items: LaneItem[]): Map<string, LaneAssignment> {
  const assignments = new Map<string, LaneAssignment>();
  if (items.length === 0) return assignments;

  const ordenados = [...items].sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);

  const clusters: LaneItem[][] = [];
  let atual: LaneItem[] = [ordenados[0]];
  let fimAtual = ordenados[0].fim;

  for (let i = 1; i < ordenados.length; i++) {
    const item = ordenados[i];
    if (item.inicio < fimAtual) {
      atual.push(item);
      fimAtual = Math.max(fimAtual, item.fim);
    } else {
      clusters.push(atual);
      atual = [item];
      fimAtual = item.fim;
    }
  }
  clusters.push(atual);

  for (const cluster of clusters) {
    const laneEndTimes: number[] = [];
    const laneByItemId = new Map<string, number>();

    for (const item of cluster) {
      let laneEncontrada = -1;
      for (let lane = 0; lane < laneEndTimes.length; lane++) {
        if (laneEndTimes[lane] <= item.inicio) {
          laneEncontrada = lane;
          break;
        }
      }
      if (laneEncontrada === -1) {
        laneEncontrada = laneEndTimes.length;
        laneEndTimes.push(item.fim);
      } else {
        laneEndTimes[laneEncontrada] = item.fim;
      }
      laneByItemId.set(item.id, laneEncontrada);
    }

    const lanesTotal = laneEndTimes.length;
    for (const item of cluster) {
      assignments.set(item.id, { lane: laneByItemId.get(item.id)!, lanesTotal });
    }
  }

  return assignments;
}

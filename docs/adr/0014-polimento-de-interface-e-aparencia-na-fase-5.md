# 0014 — Polimento de interface e Aparência antecipada para a Fase 5

Pedido do desenvolvedor (19/10/2026).

## Aparência na Fase 5

- A tela **Aparência** (fundo, feltro, faces e verso independentes, prévia ao vivo, tudo desbloqueado)
  sai da Fase 6 e entra na Fase 5, junto com conta, histórico e salas. A spec (10.1, 11.2 e 15) foi
  atualizada. A Fase 4 (sanma) continua sendo a próxima e só começa com liberação do desenvolvedor.

## Mão sempre organizada

- A opção "Organizar mão" saiu do menu da mesa e das preferências: a mão fica sempre em ordem, com a
  peça comprada à parte até o descarte. Preferências antigas com `autoSort` são ignoradas.

## Confirmações e botões

- `confirm()` do navegador foi trocado por um diálogo próprio (`ConfirmDialog`): selo com hanzi
  (退 ao sair da partida, 复 ao restaurar preferências), foco inicial no botão seguro, Esc/clique fora
  cancela. Na mesa ele usa unidades maiores para compensar a escala do palco.
- Movimento comum dos botões em `components/Button.module.css` (via `composes`): sobe no hover, afunda
  ao pressionar e um reflexo de laca atravessa a face. Seletores ganham um "pop" ao serem escolhidos e as
  chaves liga/desliga deslizam com mola.
- "Voltar" virou um botão-pílula (`BackLink`) com seta animada em todas as telas.
- Tutorial: índice com selos numerados em hanzi (一…六) e barra de progresso; anterior/próximo viraram
  botões com o nome do capítulo; o último capítulo leva a "Começar uma partida"; cada capítulo entra com
  uma transição suave.
- Tudo respeita "reduzir movimento" (regras globais).

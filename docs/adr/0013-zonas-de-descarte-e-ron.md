# 0013 — Zonas de descarte, painéis fora da mesa e anúncio do ron

Pedido do desenvolvedor (15/10/2026), a partir de capturas de tela.

## Zonas de descarte

- Cada jogador tem uma casa de rio delimitada (6×3 pedras, filete dourado e cantoneiras), como no
  Mahjong Soul; a casa de quem está na vez acende. A terceira fileira pode passar da borda (spec 10.2).
- Pedras do rio passaram de 36 para 32 px e a mão virada do jogador da frente foi para a borda: o rio
  não invade mais a mão do adversário.

## Painéis

- Guia no canto inferior direito (cresce para cima); botões de ação logo acima da mão, à direita.
- Placas do jogador da direita e do da frente na coluna direita, fora da mesa — não cobrem pedras.
- O selo "N já visíveis na mesa" saiu; fica só o destaque nas peças.

## Ron

- No anúncio do ron, um raio dourado sai de quem ganhou, a pedra da vitória corre por ele e crava em
  quem descartou, com o selo 放銃 e a frase "Você fez ron em X!" / "X fez ron em você". O anúncio do ron
  dura 2,6 s (os demais seguem 1,7 s); clicar pula.

## Guia com 14 peças

- Na sua vez (14 peças) sem peça sob o mouse, o guia não calcula esperas: diz que o descarte certo deixa
  em tenpai e pede para passar o mouse nas peças. Antes mostrava "Nenhuma vitória possível" por engano.

## Ajustes seguintes (mesmo dia)

- Menu da mesa virou uma barra de ícones no canto superior esquerdo (som, música, organizar mão, tela
  cheia, sair); cada botão mantém o nome em `aria-label` e dica (`title`).
- Placa do jogador da frente: compacta, numa linha, centralizada acima da mesa. Placa do jogador da
  direita encostada na borda direita da mesa, na altura da mão dele.
- Guia mais à direita e acima da mão (não cobre a pedra comprada).
- Mão do jogador da frente com pedras de 27 px e rio um pouco mais perto do centro: folga da borda e do rio.

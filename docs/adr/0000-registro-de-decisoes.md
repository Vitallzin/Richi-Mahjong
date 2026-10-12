# 0000 — Registro de valores de regra confirmados

Fonte: spec v1.4, seção 16. Uma linha por decisão. Alterar aqui **e** em `src/engine/rules/presets.ts`.

## Confirmado (prints/fontes do Mahjong Soul)

- Yonma: pontos iniciais 25.000; alvo 30.000.
- Yonma: peças vermelhas 0/3/4, padrão 3 (4 = 5m, dois 5p, 5s).
- Yonma e sanma: tobi ligado por padrão; kuitan ligado; han mínimo 1.
- Tempos pré-definidos: 3+5, 5+10, 5+20 (padrão), 60+0, 300+0.
- Sanma: pontos iniciais 35.000; alvo 40.000.
- Sanma: peças vermelhas 0 ou 2, padrão 2 (um 5p e um 5s; sem 5m vermelho).
- Sanma: tsumo-loss ligado por padrão e desligável (desligado = north-bisection).
- Sanma: sem chi; sem 2m–8m; 1m⇄9m como indicadores de dora.
- Sanma: muro morto de 14 com 8 reposições; indicador de dora na 5ª peça.
- Sanma: kita fixo e ligado (sem chave); tsumo na reposição de kita = rinshan; kita conta como chamada mas não abre a mão; ron sobre kita sem yaku de chankan.
- Sanma: Norte é vento inútil (sem yakuhai nem fu de vento).
- Resultado final: apenas ranking por pontos (sem uma/oka).
- Realtime Database: regiões disponíveis us-central1, europe-west1, asia-southeast1.

## Decisões do desenvolvedor

- Tempo 5+20: base volta a cada jogada; banco só diminui e volta cheio a cada mão; exibição `base-banco`.
- Agari-yame: opção `agariYame`, padrão ligado, encerra automaticamente. Tenpai-yame fora da v1.
- Sem sugestão de descarte (nem ao vivo nem em revisão).
- "Uma mão": encerra ao fim de E1, inclusive em empate exaustivo ou abortivo.
- Han mínimo: dora/aka/ura contam, mas é obrigatório ter ao menos 1 yaku.
- Pao: apenas daisangen e daisuushii.
- Passar ron sobre kita ⇒ furiten temporário até o próximo descarte próprio.
- Personagens v1: Ren (defensivo), Akari (agressiva), Sora (equilibrado).
- Yaku locais fora da v1. Kiriage mangan como opção nossa, desligada por padrão.
- Validação numérica: 100–200.000, passo 100; rejeitar com mensagem.
- Desempate de colocação: Leste inicial > Sul > Oeste > Norte.
- Região do banco: us-central1.
- Honba/noten do sanma provisórios: 300 / 3.000 (constantes `honbaRon` e `notenTotal` por modalidade).
- Faces das pedras: conjunto com licença clara → senão CSS (preferência) → senão SVG.

## Convenções padrão adotadas

- Riichi exige ≥ 4 peças no muro vivo.
- Extensão: só Leste vai até Sul 4, Leste-Sul até Oeste 4, limites absolutos inclusive para renchan (ADR 0006).
- Kazoe yakuman a partir de 13 han.
- Yakuman duplo: kokushi 13 esperas, suuankou tanki, chuuren 9 esperas, daisuushii.
- Karaten conta como tenpai no pagamento de noten.
- Par de vento duplo vale 4 fu.
- Kita conta para dora, kan-dora e ura-dora (Norte dora ⇒ cada kita vale 2).
- Kita e kan fechado em riichi só se não alterarem as esperas.
- Dora de ankan imediata; de daiminkan/kakan após o descarte seguinte.
- Chankan sobre ankan só para kokushi musou.
- Empates abortivos do sanma: só kyuushu kyuuhai e suukaikan.
- North-bisection arredonda cada parte para cima a 100.

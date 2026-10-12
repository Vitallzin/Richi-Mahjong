// Opções de regra (spec 6.3), mensagens de validação (6.4) e tela de configuração (6.6).
export const rules = {
  'rules.length.label': 'Duração',
  'rules.length.description': 'Uma mão, só Leste (4 mãos ou mais) ou Leste-Sul (8 mãos ou mais).',
  'rules.length.oneHand': 'Uma mão',
  'rules.length.east': 'Só Leste',
  'rules.length.south': 'Leste-Sul',
  'rules.startingPoints.label': 'Pontos iniciais',
  'rules.startingPoints.description': 'Pontos de cada jogador no início da partida.',
  'rules.targetPoints.label': 'Pontos mínimos para vencer',
  'rules.targetPoints.description':
    'Na última mão, se o 1º colocado tem menos que isso, a partida se estende para o próximo vento.',
  'rules.tobi.label': 'Quebra (tobi)',
  'rules.tobi.description': 'Encerra a partida se alguém ficar com menos de 0 pontos.',
  'rules.agariYame.label': 'Agari-yame',
  'rules.agariYame.description':
    'Na última mão, se o dealer vencer estando em 1º e com o alvo, a partida termina sozinha.',
  'rules.akaDora.label': 'Peças vermelhas',
  'rules.akaDora.description': 'Quantidade de cincos vermelhos; cada um vale +1 dora.',
  'rules.kuitan.label': 'Tanyao aberto',
  'rules.kuitan.description': 'Permite tanyao (só peças 2 a 8) com a mão aberta.',
  'rules.hanMinimum.label': 'Han mínimo',
  'rules.hanMinimum.description':
    'Han mínimo para vencer (dora conta, mas ainda é preciso ter um yaku). Yakuman sempre vale.',
  'rules.kiriageMangan.label': 'Arredondar mangan',
  'rules.kiriageMangan.description': 'Arredonda 4 han/30 fu e 3 han/60 fu para mangan.',
  'rules.tsumoLoss.label': 'Tsumo-loss',
  'rules.tsumoLoss.description':
    'Ligado: o tsumo rende menos porque a parte do 4º jogador ausente não é cobrada.',
  'rules.nukiDora.label': 'Nuki-dora (Norte)',
  'rules.nukiDora.description':
    'Cada Norte retirado (kita) vale +1 dora. Sempre ligado no modo de 3.',

  'rules.value.on': 'Ligado',
  'rules.value.off': 'Desligado',

  'rules.issue.unknownOption': 'Opção desconhecida.',
  'rules.issue.notInMode': 'Esta opção não existe neste modo de jogo.',
  'rules.issue.invalidValue': 'Valor não permitido para esta opção.',
  'rules.issue.outOfRange': 'Use um valor entre 100 e 200.000.',
  'rules.issue.notMultipleOfStep': 'Use um múltiplo de 100.',
  'rules.issue.locked': 'Esta opção é fixa neste modo.',
  'rules.issue.targetNotAboveStart':
    'O alvo não é maior que os pontos iniciais: a partida nunca será estendida.',
  'rules.issue.lowStartWithTobi':
    'Com tão poucos pontos e a quebra ligada, a partida pode acabar na primeira mão.',
} as const;

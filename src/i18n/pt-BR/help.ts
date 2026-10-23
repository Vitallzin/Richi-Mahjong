// Ajudas (spec 9), boas-vindas (9.1), configurações (10.1) e tutorial (10.8).
export const help = {
  // Painel de ajuda na mesa
  'help.panel': 'Guia',
  'help.state.complete': 'Mão completa!',
  'help.state.completeYaku': 'Mão completa com yaku: você pode declarar Tsumo.',
  'help.state.completeNoYaku': 'Mão completa, mas sem yaku: não dá para vencer assim.',
  'help.state.completeBelowMin': 'Mão completa com yaku, mas abaixo do han mínimo da regra.',
  'help.state.tenpai': 'Tenpai: falta 1 peça.',
  'help.state.discardToTenpai':
    'Com o descarte certo você fica em tenpai. Passe o mouse nas peças para ver as esperas.',
  'help.state.shanten': 'Faltam {n} trocas para chegar ao tenpai.',
  'help.state.shanten1': 'Falta 1 troca para chegar ao tenpai.',
  'help.state.noWaits': 'Tenpai só de forma: você mesmo tem todas as cópias da espera.',
  'help.afterDiscard': 'Se descartar esta peça:',
  'help.waits': 'Esperas',
  'help.notVisible': '{n} não visíveis',
  'help.notVisible1': '1 não visível',
  'help.notVisible0': 'nenhuma não visível',
  'help.yaku.both': 'Com yaku no ron e no tsumo',
  'help.yaku.tsumoOnly': 'Sem yaku no ron; com tsumo você teria {yaku}',
  'help.yaku.ronOnly': 'Com yaku no ron; no tsumo também',
  'help.yaku.none': 'No Yaku: vencer com esta peça não é permitido',
  'help.yaku.riichi': 'No Yaku agora, mas com riichi você teria yaku',
  'help.yaku.belowMin': 'Tem yaku, mas fica abaixo do han mínimo',
  'help.furiten': 'Furiten: você não pode vencer por ron (só por tsumo).',
  'help.noRealWin': 'Nenhuma vitória possível no momento (sem yaku ou sem cópias não visíveis).',
  'help.realWin': 'Vitória possível.',
  'help.structure':
    'Mão completa = 4 grupos (sequências ou trincas) + 1 par. Ou 7 pares diferentes, ou os 13 órfãos.',
  'help.dora': 'Indicador: {indicator} → Dora: {dora}',

  // Rótulos das pedras
  'label.dragon.abbr.0': 'Br',
  'label.dragon.abbr.1': 'Vd',
  'label.dragon.abbr.2': 'Vm',
  'label.dragon.name.0': 'Branco',
  'label.dragon.name.1': 'Verde',
  'label.dragon.name.2': 'Vermelho',

  // Boas-vindas (spec 9.1)
  'welcome.title': 'Bem-vindo à mesa!',
  'welcome.intro':
    'Antes da primeira partida, escolha as ajudas que quer usar. Elas não mudam as regras e não jogam por você — só mostram o que você já poderia saber.',
  'welcome.start': 'Começar a jogar',
  'welcome.later': 'Decidir depois',
  'welcome.tutorial': 'Quero ler o tutorial antes',

  // Descrições das ajudas (boas-vindas e /ajudas)
  'helps.title': 'Acessibilidade',
  'helps.rules.label': 'Ajuda de regras',
  'helps.rules.desc':
    'Mostra quanto falta para a mão ficar pronta (tenpai) e se ela já está completa.',
  'helps.waits.label': 'Esperas e peças restantes',
  'helps.waits.desc':
    'Quando você está em tenpai, mostra quais peças completam a mão e quantas cópias você ainda não viu.',
  'helps.noYaku.label': 'Aviso de No Yaku',
  'helps.noYaku.desc':
    'Avisa quando vencer não seria permitido por falta de yaku, separando ron e tsumo.',
  'helps.furiten.label': 'Aviso de furiten',
  'helps.furiten.desc':
    'Avisa quando você não pode vencer por ron por causa dos próprios descartes.',
  'helps.doraHint.label': 'Indicador → Dora',
  'helps.doraHint.desc':
    'Mostra qual peça é a dora (a seguinte ao indicador), e não só o indicador.',
  'helps.yakuPath.label': 'Caminho de yaku',
  'helps.yakuPath.desc':
    'Mostra no guia qual yaku a sua mão está seguindo (ex.: Toitoi, Yakuhai), para aprender os nomes jogando.',
  'help.path.title': 'Caminho de yaku',
  'help.path.estimate': 'pela forma da mão',
  'help.path.sure': 'garantido nas esperas',
  'help.path.openNone': 'Mão aberta sem yaku à vista: sem yaku você não pode vencer.',
  'helps.bonusGlow.label': 'Brilho nas peças de bônus',
  'helps.bonusGlow.desc':
    'Dora e cincos vermelhos brilham de leve na mesa, para você não perder pontos extras.',
  'helps.seenHighlight.label': 'Destacar peças já vistas',
  'helps.seenHighlight.desc':
    'Ao passar o mouse (ou tocar) numa peça da sua mão, as cópias dela já descartadas ou expostas na mesa brilham.',
  'helps.noCalls.label': 'Sem chamadas',
  'helps.noCalls.desc':
    'Modo iniciante: não oferece chi, pon e kan dos descartes alheios (Ron continua aparecendo).',
  'helps.riichi.label': 'Riichi',
  'helps.riichi.confirm': 'Sugerir e confirmar',
  'helps.riichi.auto': 'Declarar direto quando só há uma opção',
  'helps.riichi.desc':
    'Com várias opções de descarte, o jogo sempre pergunta qual descarte declara o riichi.',
  'helps.labels.title': 'Rótulos nas pedras',
  'helps.labels.desc': 'Textos sobre as pedras para ajudar a reconhecê-las.',
  'helps.labels.numbers': 'Números nos naipes',
  'helps.labels.winds': 'Ventos',
  'helps.labels.dragons': 'Dragões',
  'helps.labels.off': 'Desligado',
  'helps.labels.abbr': 'Abreviado (L/S/O/N)',
  'helps.labels.dragonAbbr': 'Abreviado (Br/Vd/Vm)',
  'helps.labels.name': 'Nome',
  'helps.labels.both': 'Nome e abreviação',
  'helps.labels.preview': 'Prévia',
  'helps.keyboard.title': 'Atalhos de teclado',
  'helps.keyboard.lead': 'Jogue sem mouse: as teclas valem sempre que a ação aparece na mesa.',
  'helps.keyboard.hand': 'Na sua mão',
  'helps.keyboard.actions': 'Ações',
  'helps.keyboard.left': 'Seta para a esquerda',
  'helps.keyboard.right': 'Seta para a direita',
  'helps.keyboard.choose': 'Escolher peça',
  'helps.keyboard.discard': 'Descartar a peça escolhida',
  'helps.saved': 'As escolhas ficam salvas neste aparelho.',

  // Configurações
  'settings.title': 'Configurações',
  'settings.sound': 'Som',
  'settings.volume': 'Volume',
  'settings.mute': 'Sem som',
  'settings.music': 'Música ambiente',
  'settings.music.desc': 'Música calma de cítara chinesa e sinos, composta ao vivo pelo jogo.',
  'settings.musicVolume': 'Volume da música',
  'settings.hoverSounds': 'Som ao passar o mouse',
  'settings.hoverSounds.desc': 'Um toque suave ao passar sobre botões e peças.',
  'settings.a11y': 'Acessibilidade',
  'settings.reduceMotion': 'Reduzir movimento',
  'settings.reduceMotion.desc': 'Desliga animações (também segue a preferência do sistema).',
  'settings.highContrast': 'Alto contraste',
  'settings.highContrast.desc': 'Cores mais fortes em textos, bordas e botões.',
  'settings.tileScale': 'Tamanho das peças da mão',
  'settings.tileScale.normal': 'Normal',
  'settings.tileScale.large': 'Grande',
  'settings.tileScale.xlarge': 'Maior',
  'settings.language': 'Idioma',
  'settings.language.ptBR': 'Português (Brasil)',
  'settings.data': 'Dados salvos',
  'settings.data.desc': 'Preferências e partida em andamento ficam salvas só neste aparelho.',
  'settings.data.clearMatch': 'Apagar partida salva',
  'settings.data.clearMatchDone': 'Partida salva apagada.',
  'settings.data.reset': 'Restaurar todas as preferências',
  'settings.data.resetConfirm': 'Restaurar todas as preferências para o padrão?',
  'settings.data.resetMessage':
    'Sons, ajudas, acessibilidade e aparência voltam ao padrão. A partida salva não é apagada.',
  'settings.data.resetAction': 'Restaurar',
  'settings.data.resetDone': 'Preferências restauradas.',
  'settings.welcomeAgain': 'Ver a tela de boas-vindas de novo',

  // Modo treino
  'setup.training': 'Modo treino: mostrar mãos',
  'setup.training.desc':
    'Mostra as mãos dos bots abertas para você aprender a ler o jogo. Só em partida solo; os bots não ganham nada com isso. Partidas em modo treino não entram nas estatísticas.',

  // Tutorial
  'tutorial.title': 'Aprender Mahjong',
  'tutorial.chapters': 'Capítulos',
  'tutorial.prev': 'Anterior',
  'tutorial.next': 'Próximo',
  'tutorial.progress': 'Capítulo {n} de {total}',
  'tutorial.done': 'Pronto para jogar?',
  'tutorial.play': 'Começar uma partida',
  'tutorial.notFound': 'Capítulo não encontrado.',

  // Anúncios para leitor de tela
  'announce.discard': '{name} descartou {tile}',
  'announce.riichi': '{name} declarou riichi',
  'announce.call': '{name} chamou {call}',
  'announce.draw': 'Você comprou {tile}',
  'announce.win': '{name} venceu',
  'announce.draw.exhaustive': 'Empate: o muro acabou',
} as const;

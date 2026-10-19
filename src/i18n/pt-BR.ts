// Textos de interface em português do Brasil (spec 0.3: nunca strings soltas em componentes).
import { game } from './pt-BR/game';
import { help } from './pt-BR/help';
import { rules } from './pt-BR/rules';
import { yaku } from './pt-BR/yaku';

export const ptBR = {
  ...game,
  ...help,
  ...rules,
  ...yaku,

  'app.title': 'Riichi Mahjong',
  'app.subtitle': 'Mahjong japonês em português, com guia opcional para iniciantes',

  'menu.play': 'Jogar partida',
  'menu.tutorial': 'Tutorial e regras',
  'menu.help': 'Ajudas e acessibilidade',
  'menu.settings': 'Configurações',
  'menu.appearance': 'Aparência',
  'appearance.title': 'Aparência',
  'appearance.lead':
    'Monte a sua mesa: cenário, feltro, faces e verso das pedras se combinam livremente.',
  'appearance.preview': 'Prévia',
  'appearance.background': 'Cenário',
  'appearance.felt': 'Feltro',
  'appearance.faces': 'Faces das pedras',
  'appearance.back': 'Verso das pedras',
  'appearance.restore': 'Restaurar padrão',
  'appearance.note': 'Fica salvo neste aparelho. Em salas, cada jogador vê a própria aparência.',
  'appearance.background.sakura': 'Noite de Sakura',
  'appearance.background.jade': 'Lago de Jade',
  'appearance.background.crimson': 'Crepúsculo Carmim',
  'appearance.background.ink': 'Tinta e Lua',
  'appearance.felt.violet': 'Violeta',
  'appearance.felt.jade': 'Jade',
  'appearance.felt.crimson': 'Carmim',
  'appearance.felt.indigo': 'Índigo',
  'appearance.felt.ink': 'Laca negra',
  'appearance.faces.ivory': 'Marfim',
  'appearance.faces.celadon': 'Celadon',
  'appearance.faces.night': 'Laca noturna',
  'appearance.back.violet': 'Violeta',
  'appearance.back.jade': 'Jade',
  'appearance.back.cinnabar': 'Cinábrio',
  'appearance.back.gold': 'Ouro',
  'appearance.back.indigo': 'Índigo',
  'menu.rooms': 'Salas privadas',
  'menu.comingSoon': 'Em breve',
  'menu.ariaLabel': 'Menu principal',

  'common.back': 'Voltar ao menu',
  'common.cancel': 'Cancelar',

  'notFound.title': 'Página não encontrada',
  'notFound.body': 'O endereço "{path}" não existe.',
} as const;

export type MessageKey = keyof typeof ptBR;

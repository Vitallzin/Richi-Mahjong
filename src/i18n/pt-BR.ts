// Textos de interface em português do Brasil (spec 0.3: nunca strings soltas em componentes).
import { game } from './pt-BR/game';
import { rules } from './pt-BR/rules';
import { yaku } from './pt-BR/yaku';

export const ptBR = {
  ...game,
  ...rules,
  ...yaku,

  'app.title': 'Riichi Mahjong',
  'app.subtitle': 'Mahjong japonês em português, com guia opcional para iniciantes',

  'menu.play': 'Jogar partida',
  'menu.tutorial': 'Tutorial e regras',
  'menu.help': 'Ajudas e acessibilidade',
  'menu.settings': 'Configurações',
  'menu.appearance': 'Aparência',
  'menu.rooms': 'Salas privadas',
  'menu.comingSoon': 'Em breve',
  'menu.ariaLabel': 'Menu principal',

  'screen.underConstruction.title': 'Em construção',
  'screen.underConstruction.body': 'Esta parte do jogo ainda está sendo preparada. Volte em breve!',
  'common.back': 'Voltar ao menu',

  'notFound.title': 'Página não encontrada',
  'notFound.body': 'O endereço "{path}" não existe.',
} as const;

export type MessageKey = keyof typeof ptBR;

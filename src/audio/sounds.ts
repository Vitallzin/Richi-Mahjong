/**
 * Efeitos sonoros (spec 11.5): sem música; mapa evento → som; volume e mudo. Howler cuida de
 * desbloquear o áudio no iOS no primeiro toque.
 */
import { Howl, Howler } from 'howler';
import type { PlayerEvent, Seat } from '../engine';

export type SoundId =
  | 'discard'
  | 'draw'
  | 'chi'
  | 'pon'
  | 'kan'
  | 'riichi'
  | 'ron'
  | 'tsumo'
  | 'handEnd'
  | 'roundStart'
  | 'timeWarning'
  | 'click';

const IDS: readonly SoundId[] = [
  'discard',
  'draw',
  'chi',
  'pon',
  'kan',
  'riichi',
  'ron',
  'tsumo',
  'handEnd',
  'roundStart',
  'timeWarning',
  'click',
];

let cache: Partial<Record<SoundId, Howl>> | null = null;

/** Pré-carrega os sons (chamar ao iniciar a partida). */
export function preloadSounds(): void {
  if (cache) return;
  cache = {};
  for (const id of IDS) cache[id] = new Howl({ src: [`/sounds/${id}.wav`], preload: true });
}

export function setAudio(volume: number, muted: boolean): void {
  Howler.volume(Math.max(0, Math.min(1, volume)));
  Howler.mute(muted);
}

export function play(id: SoundId): void {
  preloadSounds();
  cache?.[id]?.play();
}

/** Qual som cada evento dispara para o jogador local (null = silêncio). */
export function soundFor(event: PlayerEvent, localSeat: Seat): SoundId | null {
  switch (event.type) {
    case 'HandStarted':
      return 'roundStart';
    case 'TileDrawn':
      return event.seat === localSeat ? 'draw' : null;
    case 'TileDiscarded':
      return event.riichi ? 'riichi' : 'discard';
    case 'CallMade':
      return event.meld.type === 'chi' ? 'chi' : event.meld.type === 'pon' ? 'pon' : 'kan';
    case 'KitaDeclared':
      return 'pon';
    case 'HandWon':
      return event.wins[0]?.winType === 'tsumo' ? 'tsumo' : 'ron';
    case 'ExhaustiveDraw':
    case 'AbortiveDraw':
    case 'MatchEnded':
      return 'handEnd';
    default:
      return null;
  }
}

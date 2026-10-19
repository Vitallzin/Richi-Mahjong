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
  | 'click'
  | 'stamp'
  | 'whoosh'
  | 'scoreTick'
  | 'yourTurn';

/** Volume relativo de cada som (os arquivos saem normalizados do gerador). */
const LEVEL: Readonly<Record<SoundId, number>> = {
  discard: 0.85,
  draw: 0.45,
  chi: 0.75,
  pon: 0.8,
  kan: 0.8,
  riichi: 0.9,
  ron: 1,
  tsumo: 1,
  handEnd: 0.7,
  roundStart: 0.55,
  timeWarning: 0.6,
  click: 0.35,
  stamp: 0.9,
  whoosh: 0.45,
  scoreTick: 0.3,
  yourTurn: 0.5,
};

let cache: Partial<Record<SoundId, Howl>> | null = null;

/** Pré-carrega os sons (chamar ao iniciar a partida). */
export function preloadSounds(): void {
  if (cache) return;
  cache = {};
  for (const id of Object.keys(LEVEL) as SoundId[]) {
    cache[id] = new Howl({ src: [`/sounds/${id}.wav`], preload: true, volume: LEVEL[id] });
  }
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
      // A reposição (kan/kita) não toca: o som da chamada que veio antes é o que importa.
      return event.seat === localSeat && !event.rinshan ? 'draw' : null;
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
      return 'handEnd';
    default:
      return null;
  }
}

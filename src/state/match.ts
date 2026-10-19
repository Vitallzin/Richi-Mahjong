/**
 * Partida em andamento: a UI só conhece a MatchSession (spec 5.1). Guardada fora do React para
 * sobreviver à navegação entre telas.
 */
import { CHARACTERS, type BotSkill, type CharacterId } from '../bots';
import { workerBotRunner } from '../bots/workerClient';
import type { RuleSet, Seat } from '../engine';
import {
  clearMatch,
  LocalSession,
  loadMatch,
  randomSeed,
  type MatchSession,
  type SeatSetup,
  type TimerSettings,
} from '../session';
import type { CharacterChoice } from './settings';

let current: MatchSession | null = null;

export const currentSession = (): MatchSession | null => current;

export function closeSession(): void {
  current?.dispose();
  current = null;
}

/** Resolve "Aleatório" sem repetir personagens já escolhidos (spec 8.3). */
export function resolveCharacters(
  choices: readonly CharacterChoice[],
  count: number,
  rand = randomSeed,
): CharacterId[] {
  const chosen = choices.slice(0, count).filter((c): c is CharacterId => c !== 'random');
  const pool = CHARACTERS.map((c) => c.id).filter((id) => !chosen.includes(id));
  return choices.slice(0, count).map((c) => {
    if (c !== 'random') return c;
    const fallback = CHARACTERS.map((x) => x.id);
    const from = pool.length > 0 ? pool : fallback;
    const pick = from[rand() % from.length] as CharacterId;
    const i = pool.indexOf(pick);
    if (i >= 0) pool.splice(i, 1);
    return pick;
  });
}

export interface SoloOptions {
  readonly rules: RuleSet;
  readonly timer: TimerSettings;
  readonly difficulty: BotSkill;
  readonly characters: readonly CharacterChoice[];
  readonly playerName: string;
  readonly training: boolean;
}

export function startSoloMatch(opts: SoloOptions): MatchSession {
  closeSession();
  const n = opts.rules.players;
  const localSeat = (randomSeed() % n) as Seat;
  const bots = resolveCharacters(opts.characters, n - 1);
  const seats: SeatSetup[] = [];
  let b = 0;
  for (let i = 0; i < n; i++) {
    if (i === localSeat) seats.push({ kind: 'human', name: opts.playerName });
    else seats.push({ kind: 'bot', skill: opts.difficulty, characterId: bots[b++] ?? 'sora' });
  }
  current = LocalSession.create(
    opts.rules,
    { timer: opts.timer, training: opts.training },
    seats,
    localSeat,
    { botRunner: workerBotRunner },
  );
  return current;
}

/** Retoma a partida salva, se houver. */
export function resumeSavedMatch(): MatchSession | null {
  if (current) return current;
  const saved = loadMatch();
  if (saved.status !== 'ok') {
    if (saved.status === 'incompatible') clearMatch();
    return null;
  }
  current = LocalSession.resume(saved.snapshot, { botRunner: workerBotRunner });
  return current;
}

export function abandonSavedMatch(): void {
  closeSession();
  clearMatch();
}

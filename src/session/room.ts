/**
 * Protocolo das salas privadas (spec 13): o anfitrião é o servidor. Tipos do que trafega pelo
 * Realtime Database, sem depender do Firebase (o transporte é injetado), para testar a lógica.
 */
import type { BotSkill, CharacterId } from '../bots';
import type { Action, Mode, RuleSet } from '../engine';
import type { MatchSettings, SeatSetup } from './types';

/** Versão do protocolo: cliente com versão diferente recebe aviso para recarregar (13.4). */
export const PROTOCOL_VERSION = 2;
/** Tolerância de rede somada ao prazo de jogadores remotos (13.5). */
export const NETWORK_GRACE_MS = 1000;
/** Salas expiram depois de um dia (limpeza feita pelo próprio anfitrião, 13.8). */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Jogador parado (ADR 0020): um bot assume o assento. Com tempo ilimitado, depois de IDLE_TURN_MS
 * sem decidir; com relógio, depois de IDLE_TIMEOUTS estouros seguidos; no resultado da mão (sem
 * relógio), depois de IDLE_SUMMARY_MS sem continuar.
 */
export const IDLE_TURN_MS = 60_000;
export const IDLE_SUMMARY_MS = 60_000;
export const IDLE_TIMEOUTS = 2;

export interface IdleRules {
  readonly turnMs: number;
  readonly summaryMs: number;
  readonly timeouts: number;
}

export const ROOM_IDLE: IdleRules = {
  turnMs: IDLE_TURN_MS,
  summaryMs: IDLE_SUMMARY_MS,
  timeouts: IDLE_TIMEOUTS,
};

/** Por que um bot está jogando no lugar de alguém: saiu/caiu (away) ou ficou parado (idle). */
export type CoverReason = 'away' | 'idle';

/** Só fotos de conta Google (as regras do banco e o CSP aceitam apenas esse domínio). */
export const isGooglePhoto = (url: string | null | undefined): url is string =>
  typeof url === 'string' &&
  url.length <= 512 &&
  /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//.test(url);

/** Alfabeto sem ambiguidade (sem 0/O/1/I), igual à regra do banco. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** Aleatório criptográfico em [0, 1): o código é a única chave para entrar na sala. */
const secureRandom = (): number =>
  (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;

export function generateRoomCode(random: () => number = secureRandom): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++)
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)] ?? 'A';
  return code;
}

export const isRoomCode = (code: string): boolean =>
  new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code);

/** Normaliza o que o jogador digitou (minúsculas, espaços, link colado). */
export function parseRoomCode(input: string): string | null {
  const last = input.trim().split('/').pop() ?? '';
  const code = last.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return isRoomCode(code) ? code : null;
}

export type RoomStatus = 'lobby' | 'playing' | 'ended';

export interface RoomMeta {
  readonly hostUid: string;
  readonly status: RoomStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly mode: Mode;
  /** RuleSet em JSON (o banco apaga listas vazias; texto evita surpresas). */
  readonly rules: string;
  readonly settings: string;
  readonly protocolVersion: number;
}

export interface RoomSeat {
  readonly type: 'empty' | 'human' | 'bot';
  readonly uid?: string;
  readonly displayName: string;
  readonly avatar?: string;
  /** Foto da conta Google (quando o avatar escolhido é a foto). */
  readonly photoURL?: string;
  readonly characterId?: CharacterId;
  /** Durante a partida: um bot está jogando por este humano. */
  readonly cover?: CoverReason;
}

/** Quem entrou na sala (members/{uid}), sentado ou não. */
export interface RoomMember {
  readonly displayName: string;
  readonly avatar: string;
  readonly photoURL?: string;
}

/** Relógio de um jogador, em tempo restante (o convidado conta a partir do recebimento). */
export interface ClockPayload {
  readonly baseMs: number;
  readonly bankMs: number;
  readonly hasBank: boolean;
}

/** O que só aquele jogador lê: a própria visão (spec 13.3). Visão e eventos vão como JSON. */
export interface PrivatePayload {
  readonly seq: number;
  readonly view: string;
  readonly events: string;
  readonly clock: ClockPayload | null;
  readonly lastError: string | null;
}

/** Resumo mínimo público (placar), legível por todos os membros. */
export interface PublicPayload {
  readonly seq: number;
  readonly phase: string;
  readonly scores: readonly number[];
  readonly handsPlayed: number;
}

export interface HostUpdate {
  readonly seq: number;
  /** Por uid do jogador convidado. */
  readonly privates: Readonly<Record<string, PrivatePayload>>;
  readonly public: PublicPayload;
}

export interface InboxMessage {
  readonly uid: string;
  readonly clientSeq: number;
  readonly action: Action;
}

/** Pedidos no lobby, também pelo inbox (só o anfitrião escreve os assentos). */
export type LobbyRequest =
  | {
      readonly type: 'claimSeat';
      readonly seat: number;
      readonly name: string;
      readonly avatar: string;
    }
  | { readonly type: 'leaveSeat' }
  /** Volta a jogar depois de um bot assumir por inatividade (ADR 0020). */
  | { readonly type: 'resume' };

export const isLobbyRequest = (a: { readonly type: string }): a is LobbyRequest =>
  a.type === 'claimSeat' || a.type === 'leaveSeat' || a.type === 'resume';

/** Assentos do lobby → assentos da partida (vazios viram bots, spec 13.2). */
export function seatsForMatch(
  seats: readonly RoomSeat[],
  difficulty: BotSkill,
  fallback: readonly CharacterId[],
): SeatSetup[] {
  let bot = 0;
  return seats.map((s) => {
    if (s.type === 'human' && s.uid) return humanSetup(s.uid, s);
    const characterId = s.characterId ?? fallback[bot % fallback.length] ?? 'sora';
    bot += 1;
    return { kind: 'bot', skill: difficulty, characterId };
  });
}

/** Assento de partida de um humano a partir do que está no banco. */
export function humanSetup(
  uid: string,
  p: { readonly displayName: string; readonly avatar?: string; readonly photoURL?: string },
): SeatSetup {
  return {
    kind: 'human',
    name: p.displayName,
    uid,
    ...(p.avatar ? { avatar: p.avatar } : {}),
    ...(isGooglePhoto(p.photoURL) ? { photoURL: p.photoURL } : {}),
  };
}

/** Assento de partida → assento no banco (com o bot de cobertura, se houver). */
export function roomSeatOf(setup: SeatSetup, cover?: CoverReason | null): RoomSeat {
  if (setup.kind === 'bot') return { type: 'bot', displayName: '', characterId: setup.characterId };
  return {
    type: 'human',
    ...(setup.uid ? { uid: setup.uid } : {}),
    displayName: setup.name.slice(0, 24) || '?',
    ...(setup.avatar ? { avatar: setup.avatar.slice(0, 64) } : {}),
    ...(isGooglePhoto(setup.photoURL) ? { photoURL: setup.photoURL } : {}),
    ...(cover ? { cover } : {}),
  };
}

export interface RoomConfig {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
}

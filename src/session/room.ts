/**
 * Protocolo das salas privadas (spec 13): o anfitrião é o servidor. Tipos do que trafega pelo
 * Realtime Database, sem depender do Firebase (o transporte é injetado), para testar a lógica.
 */
import type { BotSkill, CharacterId } from '../bots';
import type { Action, Mode, RuleSet } from '../engine';
import type { MatchSettings, SeatSetup } from './types';

/** Versão do protocolo: cliente com versão diferente recebe aviso para recarregar (13.4). */
export const PROTOCOL_VERSION = 1;
/** Tolerância de rede somada ao prazo de jogadores remotos (13.5). */
export const NETWORK_GRACE_MS = 1000;
/** Salas expiram depois de um dia (limpeza feita pelo próprio anfitrião, 13.8). */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

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
  readonly characterId?: CharacterId;
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
  | { readonly type: 'leaveSeat' };

export const isLobbyRequest = (a: { readonly type: string }): a is LobbyRequest =>
  a.type === 'claimSeat' || a.type === 'leaveSeat';

/** Assentos do lobby → assentos da partida (vazios viram bots, spec 13.2). */
export function seatsForMatch(
  seats: readonly RoomSeat[],
  difficulty: BotSkill,
  fallback: readonly CharacterId[],
): SeatSetup[] {
  let bot = 0;
  return seats.map((s) => {
    if (s.type === 'human' && s.uid) {
      return {
        kind: 'human',
        name: s.displayName,
        uid: s.uid,
        ...(s.avatar ? { avatar: s.avatar } : {}),
      };
    }
    const characterId = s.characterId ?? fallback[bot % fallback.length] ?? 'sora';
    bot += 1;
    return { kind: 'bot', skill: difficulty, characterId };
  });
}

export interface RoomConfig {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
}

/**
 * Cliente do Worker dos bots: um Worker para a aba, pedidos numerados e respostas por promessa.
 * Só para o navegador; testes e simulações usam os bots direto (síncronos).
 */
import type { Action, LegalActions, PlayerView } from '../engine';
import type { BotSkill } from './policy';
import type { CharacterId } from './characters';
import type { BotReply, BotRequest } from './worker';

/** Decide de forma assíncrona; null = este bot roda direto na thread principal. */
export interface BotRunner {
  decide(
    skill: BotSkill,
    character: CharacterId,
    view: PlayerView,
    legal: LegalActions,
    seed: number,
  ): Promise<Action> | null;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (a: Action) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<BotReply>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.action) p.resolve(e.data.action);
    else p.reject(new Error(e.data.error ?? 'bot sem resposta'));
  };
  worker.onerror = () => {
    for (const p of pending.values()) p.reject(new Error('worker caiu'));
    pending.clear();
    worker = null;
  };
  return worker;
}

/** Difícil no Worker; Fácil e Normal ficam na thread principal (rápidos o bastante, spec 8.4). */
export const workerBotRunner: BotRunner = {
  decide(skill, character, view, legal, seed) {
    if (skill !== 'hard' || typeof Worker === 'undefined') return null;
    return new Promise<Action>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      const req: BotRequest = { id, skill, character, view, legal, seed };
      getWorker().postMessage(req);
    });
  },
};

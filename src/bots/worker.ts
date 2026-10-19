/**
 * Web Worker dos bots (spec 8.4): recebe a PlayerView serializada e devolve a ação por mensagem.
 * Usado pelo Difícil, que pensa mais; a mesa nunca trava enquanto ele decide.
 */
import { createRng, type Action, type LegalActions, type PlayerView } from '../engine';
import { createBot, type BotPolicy, type BotSkill, type CharacterId } from './index';

export interface BotRequest {
  readonly id: number;
  readonly skill: BotSkill;
  readonly character: CharacterId;
  readonly view: PlayerView;
  readonly legal: LegalActions;
  readonly seed: number;
}

export interface BotReply {
  readonly id: number;
  readonly action?: Action;
  readonly error?: string;
}

const cache = new Map<string, BotPolicy>();

const scope = globalThis as unknown as {
  onmessage: ((e: MessageEvent<BotRequest>) => void) | null;
  postMessage: (reply: BotReply) => void;
};

scope.onmessage = (e) => {
  const { id, skill, character, view, legal, seed } = e.data;
  try {
    const key = `${skill}:${character}`;
    let bot = cache.get(key);
    if (!bot) {
      bot = createBot(skill, character);
      cache.set(key, bot);
    }
    scope.postMessage({ id, action: bot.decide(view, legal, createRng(seed)) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};

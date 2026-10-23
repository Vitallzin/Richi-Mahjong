// As regras do banco listam as chaves aceitas (o resto é recusado, para limitar tamanho). Este teste
// roda sem emulador e falha se o app passar a gravar uma chave que as regras não conhecem.
import { readFileSync } from 'node:fs';
import { RULE_OPTIONS } from '../src/engine';
import {
  sampleActions,
  sampleMember,
  sampleMeta,
  samplePrivate,
  samplePublic,
  sampleSeats,
  sampleSettings,
  sampleSummary,
} from './support/dbSamples';

type RuleNode = { readonly [key: string]: RuleNode | string | boolean };

const rules = (JSON.parse(readFileSync('database.rules.json', 'utf8')) as { rules: RuleNode })
  .rules;

const child = (node: RuleNode, ...path: string[]): RuleNode =>
  path.reduce((n, key) => n[key] as RuleNode, node);

/** Caminhos de `value` que não têm nó nas regras (nem curinga `$x` além de `$other`). */
function uncovered(node: RuleNode, value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, v]) => {
    const wildcard = Object.keys(node).find((k) => k.startsWith('$') && k !== '$other');
    const next = (node[key] ?? (wildcard ? node[wildcard] : undefined)) as RuleNode | undefined;
    return next ? uncovered(next, v, `${path}/${key}`) : [`${path}/${key}`];
  });
}

const user = child(rules, 'users', '$uid');
const room = child(rules, 'rooms', '$code');

describe('regras do banco cobrem o que o app grava', () => {
  it('preferências e histórico', () => {
    // o verificador acusa chave desconhecida (inclusive aninhada)
    expect(uncovered(child(user, 'settings'), { helps: { labels: { x: 1 } }, y: 2 })).toEqual([
      '/helps/labels/x',
      '/y',
    ]);
    expect(uncovered(child(user, 'settings'), sampleSettings())).toEqual([]);
    expect(uncovered(child(user, 'history', '$matchId'), sampleSummary())).toEqual([]);
  });

  it('cada opção de regra é aceita no rascunho salvo', () => {
    const validate = child(user, 'settings', 'rules', 'yonma', '$opt')['.validate'] as string;
    const pattern = /\$opt\.matches\(\/(.+?)\/\)/.exec(validate)?.[1] ?? '';
    for (const o of RULE_OPTIONS) expect(new RegExp(pattern).test(o.id), o.id).toBe(true);
    expect(child(user, 'settings', 'rules', 'sanma', '$opt')['.validate']).toBe(validate);
  });

  it('sala: meta, assentos, visões, placar e inbox', () => {
    expect(uncovered(child(room, 'meta'), sampleMeta('host'))).toEqual([]);
    expect(uncovered(child(room, 'seats'), sampleSeats('host'))).toEqual([]);
    expect(uncovered(child(room, 'members', '$uid'), sampleMember())).toEqual([]);
    expect(uncovered(child(room, 'private', '$uid'), samplePrivate())).toEqual([]);
    expect(uncovered(child(room, 'public'), samplePublic())).toEqual([]);
    const inbox = child(room, 'inbox', '$uid', '$pushId');
    for (const action of sampleActions()) {
      expect(uncovered(inbox, { clientSeq: 1, action, ts: 1 }), action.type).toEqual([]);
    }
  });

  it('a visão de exemplo cabe com folga no limite', () => {
    const limit = /length <= (\d+)/.exec(
      child(room, 'private', '$uid', 'view')['.validate'] as string,
    );
    expect(samplePrivate().view.length * 4).toBeLessThan(Number(limit?.[1]));
  });
});

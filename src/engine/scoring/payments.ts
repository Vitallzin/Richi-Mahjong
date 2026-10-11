/**
 * Pagamentos (spec 7.10 e 7.11): ron, tsumo (com tsumo-loss / north-bisection no sanma),
 * honba, bastões de riichi, pao, noten e nagashi mangan.
 */
import type { RuleSet } from '../rules';
import type { Seat } from '../types';
import { MANGAN_BASE, roundUp100 } from './points';

type PaymentRules = Pick<
  RuleSet,
  'players' | 'mode' | 'tsumoLoss' | 'honbaRon' | 'honbaTsumoPerPayer' | 'notenTotal'
>;

export interface WinPaymentInput {
  readonly base: number;
  readonly winner: Seat;
  readonly dealer: Seat;
  readonly winType: 'ron' | 'tsumo';
  /** Quem descartou (ron) — obrigatório no ron. */
  readonly discarder?: Seat;
  /** Honba a cobrar (0 para os demais vencedores de um ron múltiplo). */
  readonly honba: number;
  /** Bastões de riichi que este vencedor recebe. */
  readonly riichiSticks: number;
  /** Pao: quem é responsável e quanto da base vem do yakuman sob responsabilidade. */
  readonly pao?: { readonly seat: Seat; readonly base: number };
  readonly rules: PaymentRules;
}

/** Variação de pontos por assento (tamanho = nº de jogadores). */
export type Deltas = number[];

const seatsOf = (players: number): Seat[] => Array.from({ length: players }, (_, i) => i as Seat);

function tsumoShares(base: number, input: WinPaymentInput, deltas: Deltas): void {
  const { winner, dealer, rules } = input;
  const dealerWins = winner === dealer;
  const payers = seatsOf(rules.players).filter((s) => s !== winner);
  // North-bisection: no sanma sem tsumo-loss, a parte do 4º jogador ausente é dividida entre os 2 pagadores.
  const bisect = rules.mode === 'sanma' && !rules.tsumoLoss;
  const absentShare = bisect ? roundUp100(roundUp100(base * (dealerWins ? 2 : 1)) / 2) : 0;
  for (const payer of payers) {
    const mult = dealerWins || payer === dealer ? 2 : 1;
    const amount = roundUp100(base * mult) + absentShare;
    deltas[payer] = (deltas[payer] as number) - amount;
    deltas[winner] = (deltas[winner] as number) + amount;
  }
}

function transfer(deltas: Deltas, from: Seat, to: Seat, amount: number): void {
  deltas[from] = (deltas[from] as number) - amount;
  deltas[to] = (deltas[to] as number) + amount;
}

/**
 * Pagamentos de uma vitória. Os bastões de riichi saem da mesa (não de outro jogador), então a soma
 * das variações é `1000 × riichiSticks`.
 */
export function winPayments(input: WinPaymentInput): Deltas {
  const { rules, winner, dealer, honba } = input;
  const deltas: Deltas = new Array<number>(rules.players).fill(0);
  const dealerWins = winner === dealer;
  const paoBase = input.pao?.base ?? 0;
  const normalBase = input.base - paoBase;

  if (input.winType === 'ron') {
    const discarder = input.discarder;
    if (discarder === undefined) throw new Error('Ron sem descartador');
    const mult = dealerWins ? 6 : 4;
    if (normalBase > 0) transfer(deltas, discarder, winner, roundUp100(normalBase * mult));
    if (input.pao && paoBase > 0) {
      // Pao no ron: responsável e descartador dividem o valor do yakuman sob responsabilidade.
      const value = roundUp100(paoBase * mult);
      transfer(deltas, discarder, winner, value / 2);
      transfer(deltas, input.pao.seat, winner, value / 2);
    }
    transfer(deltas, discarder, winner, honba * rules.honbaRon);
  } else {
    if (normalBase > 0) tsumoShares(normalBase, input, deltas);
    const payers = seatsOf(rules.players).filter((s) => s !== winner);
    if (input.pao && paoBase > 0) {
      // Pao no tsumo: o responsável paga sozinho o valor do yakuman sob responsabilidade e a honba.
      transfer(deltas, input.pao.seat, winner, roundUp100(paoBase * (dealerWins ? 6 : 4)));
      transfer(deltas, input.pao.seat, winner, honba * rules.honbaTsumoPerPayer * payers.length);
    } else {
      for (const payer of payers) transfer(deltas, payer, winner, honba * rules.honbaTsumoPerPayer);
    }
  }

  deltas[winner] = (deltas[winner] as number) + input.riichiSticks * 1000;
  return deltas;
}

/** Pagamento de noten no empate por exaustão (spec 7.11). */
export function notenPayments(
  tenpai: readonly boolean[],
  rules: Pick<RuleSet, 'notenTotal'>,
): Deltas {
  const deltas: Deltas = tenpai.map(() => 0);
  const tenpaiCount = tenpai.filter(Boolean).length;
  const notenCount = tenpai.length - tenpaiCount;
  if (tenpaiCount === 0 || notenCount === 0) return deltas;
  tenpai.forEach((isTenpai, seat) => {
    deltas[seat] = isTenpai ? rules.notenTotal / tenpaiCount : -rules.notenTotal / notenCount;
  });
  return deltas;
}

/** Nagashi mangan: pago como um tsumo de mangan, sem honba nem bastões (convenção adotada). */
export function nagashiPayments(winner: Seat, dealer: Seat, rules: PaymentRules): Deltas {
  return winPayments({
    base: MANGAN_BASE,
    winner,
    dealer,
    winType: 'tsumo',
    honba: 0,
    riichiSticks: 0,
    rules,
  });
}

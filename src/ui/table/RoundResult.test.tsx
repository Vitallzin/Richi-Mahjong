// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { HandSummary, ScoredHand, WinRecord } from '../../engine';
import { parseTiles } from '../../engine';
import { presentationPause, PACING, type SeatSetup } from '../../session';
import { RoundResult } from './RoundResult';

vi.mock('../../audio/sounds', () => ({ play: vi.fn() }));

const SEATS: SeatSetup[] = [
  { kind: 'human', name: 'Você' },
  { kind: 'bot', skill: 'normal', characterId: 'ren' },
  { kind: 'bot', skill: 'normal', characterId: 'akari' },
  { kind: 'bot', skill: 'normal', characterId: 'sora' },
];

const scored: ScoredHand = {
  form: 'regular',
  wait: 'ryanmen',
  yaku: [
    { id: 'riichi', value: 1 },
    { id: 'tanyao', value: 1 },
  ],
  yakuman: [],
  yakuHan: 2,
  dora: 3,
  aka: 0,
  ura: 0,
  kita: 0,
  han: 5,
  fu: 30,
  base: 2000,
  limit: 'mangan',
  yakumanMultiplier: 0,
  kazoe: false,
};

const hand = parseTiles('234m456p22345678s');
const win: WinRecord = {
  seat: 1,
  from: 2,
  winType: 'ron',
  scored,
  hand,
  melds: [],
  winTile: hand[hand.length - 1]!,
  pao: null,
  deltas: [0, 8000, -8000, 0],
};

const summary: HandSummary = {
  kind: 'win',
  roundWind: 27,
  handNumber: 1,
  honba: 0,
  wins: [win],
  abortiveReason: null,
  tenpai: null,
  revealed: {},
  nagashi: [],
  doraIndicators: parseTiles('1m'),
  uraIndicators: [],
  deltas: [0, 8000, -8000, 0],
  scoresBefore: [25000, 25000, 25000, 25000],
  scoresAfter: [25000, 33000, 17000, 25000],
  renchan: false,
  matchEnds: false,
};

describe('sequência de fim de mão', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('anúncio → mão com yaku e selo do limite → placar → continuar', () => {
    const onContinue = vi.fn();
    render(
      <RoundResult
        summary={summary}
        seats={SEATS}
        localSeat={0}
        canContinue
        onContinue={onContinue}
      />,
    );
    expect(screen.getByText('Ron!')).toBeInTheDocument();
    expect(screen.getByText('荣')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('heading', { name: 'Ren' })).toBeInTheDocument();
    expect(screen.getByText('Riichi')).toBeInTheDocument();
    expect(screen.getByText('Tanyao')).toBeInTheDocument();
    expect(screen.getByText('Mangan')).toBeInTheDocument();
    expect(screen.getByText('満貫')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    // placar: as quatro placas com o delta
    expect(screen.getByText('+8000')).toBeInTheDocument();
    expect(screen.getByText('-8000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('empate mostra 流局 e a lista de tenpai', () => {
    const draw: HandSummary = {
      ...summary,
      kind: 'exhaustive',
      wins: [],
      tenpai: [true, false, false, false],
      revealed: { 0: hand },
    };
    render(
      <RoundResult
        summary={draw}
        seats={SEATS}
        localSeat={0}
        canContinue
        onContinue={() => undefined}
      />,
    );
    expect(screen.getByText('流局')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Empate/ }));
    expect(screen.getByText('Tenpai')).toBeInTheDocument();
    expect(screen.getAllByText('Noten')).toHaveLength(3);
  });
});

describe('ritmo da mesa (pedido do desenvolvedor)', () => {
  it('a sessão espera os anúncios e o voo da pedra antes de alguém agir', () => {
    const tile = parseTiles('5p')[0]!;
    expect(
      presentationPause([
        { type: 'TileDiscarded', seat: 0, tile, tsumogiri: false, riichi: false },
      ]),
    ).toBe(PACING.discardFlightMs);
    expect(
      presentationPause([{ type: 'TileDiscarded', seat: 0, tile, tsumogiri: false, riichi: true }]),
    ).toBe(PACING.callAnnouncementMs);
    expect(
      presentationPause([
        { type: 'HandStarted', roundWind: 27, handNumber: 1, dealer: 0, honba: 0 },
      ]),
    ).toBe(PACING.handStartMs);
    expect(presentationPause([])).toBe(0);
  });
});

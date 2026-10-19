/** Ao fim da partida, grava o resumo no histórico do jogador logado (spec 12.4). */
import { useEffect, useRef } from 'react';
import type { PlayerView, Seat } from '../../engine';
import { summarizeMatch, type MatchSession } from '../../session';
import { recordMatch, useAccount } from '../../state/account';
import { seatName } from './labels';

const newId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 36 ** 6).toString(36)}`;

export function useRecordHistory(session: MatchSession, view: PlayerView): void {
  const recorded = useRef<object | null>(null);
  const result = view.phase === 'matchEnded' ? view.result : null;
  useEffect(() => {
    if (!result || recorded.current === result) return;
    recorded.current = result;
    const { status, profile } = useAccount.getState();
    if (status !== 'signedIn') return;
    const names = session.seats.map((_, seat) =>
      seat === session.localSeat && profile
        ? profile.displayName
        : seatName(session.seats, seat as Seat),
    );
    const summary = summarizeMatch({
      id: newId(),
      endedAt: Date.now(),
      source: session.source,
      rules: session.rules,
      training: session.settings.training,
      result,
      seats: session.seats,
      names,
      localSeat: session.localSeat,
      wins: session.getWinLog(),
    });
    recordMatch(summary).catch(() => {
      // Sem rede: o resumo se perde, a partida não (spec 12.4 é "melhor esforço").
    });
  }, [result, session]);
}

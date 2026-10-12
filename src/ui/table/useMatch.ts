/** Assina a MatchSession e expõe a visão do jogador local, os últimos eventos e o relógio. */
import { useEffect, useState } from 'react';
import type { PlayerEvent, PlayerView } from '../../engine';
import type { ClockView, MatchSession } from '../../session';

export interface MatchSnapshotView {
  readonly view: PlayerView;
  readonly events: readonly PlayerEvent[];
  /** Incrementa a cada atualização (útil para animações e sons). */
  readonly tick: number;
  /** Id da última peça descartada (destaque no rio). */
  readonly lastDiscardId: number | null;
}

export function useMatch(session: MatchSession): MatchSnapshotView {
  const [snap, setSnap] = useState<MatchSnapshotView>(() => ({
    view: session.getView(),
    events: [],
    tick: 0,
    lastDiscardId: null,
  }));
  useEffect(
    () =>
      session.subscribe((view, events) => {
        setSnap((prev) => {
          const discard = [...events].reverse().find((e) => e.type === 'TileDiscarded');
          const lastDiscardId =
            discard?.type === 'TileDiscarded' ? discard.tile.id : prev.lastDiscardId;
          return { view, events, tick: prev.tick + 1, lastDiscardId };
        });
      }),
    [session],
  );
  return snap;
}

/** Relógio lido a cada renderização; um temporizador força renderizações enquanto o jogo corre. */
export function useClock(session: MatchSession): ClockView | null {
  const [, setFrame] = useState(0);
  useEffect(() => {
    const id = globalThis.setInterval(() => setFrame((x) => x + 1), 200);
    return () => globalThis.clearInterval(id);
  }, []);
  return session.getClock();
}

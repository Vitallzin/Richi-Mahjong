/** Assina a MatchSession e expõe a visão do jogador local, os últimos eventos e o relógio. */
import { useEffect, useRef, useState } from 'react';
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

/**
 * Valor derivado do relógio, relido a cada 200 ms. Só renderiza quando o valor escolhido muda
 * (ex.: o texto mm:ss): a mesa inteira não se redesenha a cada leitura do relógio.
 */
export function useClockValue<T>(session: MatchSession, select: (clock: ClockView | null) => T): T {
  const [value, setValue] = useState(() => select(session.getClock()));
  // A função de seleção pode mudar a cada renderização; o temporizador usa sempre a mais recente.
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  });
  useEffect(() => {
    const read = () => setValue(selectRef.current(session.getClock()));
    read();
    const id = globalThis.setInterval(read, 200);
    return () => globalThis.clearInterval(id);
  }, [session]);
  return value;
}

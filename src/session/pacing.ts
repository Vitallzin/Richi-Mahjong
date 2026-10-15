/**
 * Ritmo da apresentação: a sessão espera as animações antes do próximo bot agir (pedido do
 * desenvolvedor: as animações dão o ritmo da mesa). A UI usa os mesmos valores.
 */
export const PACING = Object.freeze({
  /** Anúncio de chi/pon/kan/riichi/kita junto de quem chamou. */
  callAnnouncementMs: 1100,
  /** Voo da pedra da mão até o rio. */
  discardFlightMs: 380,
  /** Início de mão (embaralhar/distribuir). */
  handStartMs: 1200,
  /** Atraso "humano" do bot no próprio turno (ms, mín–máx), somado às animações. */
  botTurnMs: [650, 1400] as const,
  /** Atraso do bot para responder a um descarte (mín–máx). */
  botCallMs: [250, 650] as const,
});

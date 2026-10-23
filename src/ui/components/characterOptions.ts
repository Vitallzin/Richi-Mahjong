/** Opções do CharacterPicker (separadas do componente para o recarregamento rápido do Vite). */
import { CHARACTERS, type CharacterId } from '../../bots';
import { t } from '../../i18n';

export interface PickerOption<V extends string> {
  readonly value: V;
  readonly name: string;
  /** Linha menor (estilo de jogo). */
  readonly tag?: string;
  /** Personagem (selo e cores); sem ele, selo de sorteio. */
  readonly character?: CharacterId;
}

/** Opções padrão: um item "sem personagem" (sorteio) seguido dos personagens. */
export function characterOptions<V extends string>(
  none: { readonly value: V; readonly name: string; readonly tag?: string },
  prefix = '',
): PickerOption<V | CharacterId>[] {
  return [
    none,
    ...CHARACTERS.map((c) => ({
      value: c.id,
      name: `${prefix}${t(`characters.${c.id}.name`)}`,
      tag: t(`characters.${c.id}.tag`),
      character: c.id,
    })),
  ];
}

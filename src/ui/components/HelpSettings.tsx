/**
 * Liga/desliga de cada ajuda (spec 9) com exemplo visual, usado nas boas-vindas e em /ajudas.
 * As escolhas são persistidas pelo store de preferências.
 */
import { parseTiles } from '../../engine';
import type { HelpPrefs, TileLabels } from '../../help';
import { t, type MessageKey } from '../../i18n';
import { useSettings } from '../../state/settings';
import styles from './HelpSettings.module.css';
import { Tile } from './Tile';
import { TileLabelsContext } from './tileLabels';

type ToggleKey =
  | 'rules'
  | 'waits'
  | 'noYaku'
  | 'yakuPath'
  | 'furiten'
  | 'doraHint'
  | 'bonusGlow'
  | 'seenHighlight'
  | 'noCalls';

const TOGGLES: readonly { key: ToggleKey; example?: string }[] = [
  { key: 'rules' },
  { key: 'waits', example: '14m' },
  { key: 'noYaku' },
  { key: 'yakuPath' },
  { key: 'furiten' },
  { key: 'doraHint', example: '12z' },
  { key: 'bonusGlow', example: '0p0s' },
  { key: 'seenHighlight', example: '6z' },
  { key: 'noCalls' },
];

const PREVIEW = parseTiles('3m0p7s1z3z6z');

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? styles.switchOn : styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className={styles.choice} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? styles.choiceOn : styles.choiceOff}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function HelpSettings() {
  const helps = useSettings((s) => s.helps);
  const setHelp = useSettings((s) => s.setHelp);
  const setLabels = (patch: Partial<TileLabels>) =>
    setHelp({ labels: { ...helps.labels, ...patch } });

  return (
    <div className={styles.list}>
      {TOGGLES.map(({ key, example }) => (
        <div key={key} className={styles.row}>
          <div className={styles.text}>
            <span className={styles.label}>{t(`helps.${key}.label` as MessageKey)}</span>
            <span className={styles.desc}>{t(`helps.${key}.desc` as MessageKey)}</span>
            {example && (
              <span className={styles.example} aria-hidden="true">
                {parseTiles(example).map((tile) => (
                  <Tile
                    key={tile.id}
                    tile={tile}
                    width={30}
                    glow={key === 'doraHint' && tile.kind === 28}
                  />
                ))}
              </span>
            )}
          </div>
          <Switch
            checked={helps[key]}
            onChange={(v) => setHelp({ [key]: v } as Partial<HelpPrefs>)}
            label={t(`helps.${key}.label` as MessageKey)}
          />
        </div>
      ))}

      <div className={styles.row}>
        <div className={styles.text}>
          <span className={styles.label}>{t('helps.riichi.label')}</span>
          <span className={styles.desc}>{t('helps.riichi.desc')}</span>
          <Choice
            label={t('helps.riichi.label')}
            value={helps.riichi}
            options={[
              { value: 'confirm', label: t('helps.riichi.confirm') },
              { value: 'auto', label: t('helps.riichi.auto') },
            ]}
            onChange={(v) => setHelp({ riichi: v })}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.text}>
          <span className={styles.label}>{t('helps.labels.title')}</span>
          <span className={styles.desc}>{t('helps.labels.desc')}</span>
          <label className={styles.inline}>
            <Switch
              checked={helps.labels.numbers}
              onChange={(v) => setLabels({ numbers: v })}
              label={t('helps.labels.numbers')}
            />
            {t('helps.labels.numbers')}
          </label>
          <span className={styles.subLabel}>{t('helps.labels.winds')}</span>
          <Choice
            label={t('helps.labels.winds')}
            value={helps.labels.winds}
            options={(['off', 'abbr', 'name', 'both'] as const).map((v) => ({
              value: v,
              label: t(`helps.labels.${v}`),
            }))}
            onChange={(v) => setLabels({ winds: v })}
          />
          <span className={styles.subLabel}>{t('helps.labels.dragons')}</span>
          <Choice
            label={t('helps.labels.dragons')}
            value={helps.labels.dragons}
            options={(['off', 'abbr', 'name'] as const).map((v) => ({
              value: v,
              label: t(v === 'abbr' ? 'helps.labels.dragonAbbr' : `helps.labels.${v}`),
            }))}
            onChange={(v) => setLabels({ dragons: v })}
          />
          <span className={styles.subLabel}>{t('helps.labels.preview')}</span>
          <TileLabelsContext.Provider value={helps.labels}>
            <span className={styles.example}>
              {PREVIEW.map((tile) => (
                <Tile key={tile.id} tile={tile} width={52} />
              ))}
            </span>
          </TileLabelsContext.Provider>
        </div>
      </div>
      <p className={styles.desc}>{t('helps.saved')}</p>
    </div>
  );
}

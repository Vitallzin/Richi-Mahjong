/**
 * Configurar partida (spec 6.6): bloco básico + chave "Configurações avançadas". Os controles de regra
 * são gerados da lista RULE_OPTIONS; validação e resumo vêm de validateRules.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BotSkill } from '../../bots';
import { CHARACTERS } from '../../bots';
import {
  buildRuleSet,
  DEFAULT_SELECTION,
  RULE_OPTIONS,
  validateRules,
  type Issue,
  type Mode,
  type RuleOption,
  type RuleOptionId,
} from '../../engine';
import { t, tKey } from '../../i18n';
import {
  DEFAULT_TIMER,
  presetOf,
  TIMER_LIMITS,
  TIMER_PRESETS,
  validateTimer,
  type TimerPresetId,
  type TimerSettings,
} from '../../session';
import { startSoloMatch } from '../../state/match';
import { useSettings, type CharacterChoice, type RuleDraft } from '../../state/settings';
import { enterGameDisplay } from '../platform/display';
import styles from './SetupScreen.module.css';
import { BackLink } from '../components/BackLink';

const TIMER_IDS: readonly TimerPresetId[] = ['3+5', '5+10', '5+20', '60+0', '300+0', 'unlimited'];

function valueLabel(option: RuleOption, value: unknown): string {
  if (typeof value === 'boolean') return t(value ? 'rules.value.on' : 'rules.value.off');
  if (option.id === 'length') return tKey(`rules.length.${String(value)}`);
  return String(value);
}

/** Seleção efetiva: com avançadas desligadas, só o bloco básico vale (spec 6.5). */
function effectiveDraft(draft: RuleDraft, advanced: boolean): RuleDraft {
  if (advanced) return draft;
  const out: RuleDraft = {};
  for (const o of RULE_OPTIONS) if (o.group === 'basic' && o.id in draft) out[o.id] = draft[o.id];
  return out;
}

function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
  label,
  disabled = [],
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  disabled?: readonly T[];
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? styles.segActive : styles.seg}
          disabled={disabled.includes(o.value)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RuleControl({
  option,
  mode,
  value,
  issues,
  onChange,
}: {
  option: RuleOption;
  mode: Mode;
  value: unknown;
  issues: readonly Issue[];
  onChange: (v: unknown) => void;
}) {
  const locked = option.locked?.[mode];
  const label = tKey(option.label);
  const id = `rule-${option.id}`;
  let control;
  if (option.kind === 'number') {
    control = (
      <input
        id={id}
        className={styles.number}
        type="number"
        inputMode="numeric"
        min={option.range?.min}
        max={option.range?.max}
        step={option.range?.step}
        value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
        aria-invalid={issues.some((i) => i.severity === 'error')}
        onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      />
    );
  } else {
    const values = (option.values?.[mode] ?? []) as readonly (string | number | boolean)[];
    control = (
      <Segmented
        label={label}
        value={(locked ?? value) as string | number | boolean}
        options={values.map((v) => ({ value: v, label: valueLabel(option, v) }))}
        onChange={onChange}
        disabled={locked !== undefined ? values.filter((v) => v !== locked) : []}
      />
    );
  }
  return (
    <div className={styles.rule}>
      <label className={styles.ruleLabel} htmlFor={option.kind === 'number' ? id : undefined}>
        {label}
      </label>
      {control}
      <p className={styles.help}>{tKey(option.description)}</p>
      {issues.map((i) => (
        <p
          key={i.code}
          className={i.severity === 'error' ? styles.error : styles.warning}
          role={i.severity === 'error' ? 'alert' : undefined}
        >
          {tKey(i.messageKey)}
        </p>
      ))}
    </div>
  );
}

export function SetupScreen() {
  const navigate = useNavigate();
  const s = useSettings();
  const mode = s.mode;
  const advanced = s.advanced[mode];
  const draft = s.rules[mode];
  const defaults = DEFAULT_SELECTION[mode];
  const effective = effectiveDraft(draft, advanced);
  const validation = useMemo(() => validateRules(mode, effective), [mode, effective]);
  const [customTimer, setCustomTimer] = useState(presetOf(s.timer) === 'custom');
  const timerValid = validateTimer(s.timer);
  const canStart = validation.valid && timerValid;

  const valueOf = (id: RuleOptionId): unknown => (id in effective ? effective[id] : defaults[id]);
  const issuesFor = (id: string) => validation.issues.filter((i) => i.optionId === id);
  const options = RULE_OPTIONS.filter((o) => o.modes.includes(mode));

  const changed = options.filter((o) => valueOf(o.id) !== defaults[o.id]);
  const timerLabel =
    s.timer.mode === 'unlimited'
      ? t('setup.timer.unlimited')
      : `${s.timer.baseSeconds}+${s.timer.bankSeconds}`;

  const setTimerPreset = (id: TimerPresetId | 'custom') => {
    if (id === 'custom') {
      setCustomTimer(true);
      if (s.timer.mode === 'unlimited') s.set({ timer: DEFAULT_TIMER });
      return;
    }
    setCustomTimer(false);
    s.set({ timer: TIMER_PRESETS[id] });
  };
  const setCustom = (patch: Partial<{ baseSeconds: number; bankSeconds: number }>) => {
    const base =
      s.timer.mode === 'timed'
        ? s.timer
        : { mode: 'timed' as const, baseSeconds: 5, bankSeconds: 20 };
    s.set({ timer: { ...base, ...patch } as TimerSettings });
  };

  const start = () => {
    if (!canStart) return;
    const rules = buildRuleSet(mode, draft, advanced);
    startSoloMatch({
      rules,
      timer: s.timer,
      difficulty: s.difficulty,
      characters: s.characters,
      playerName: t('table.you'),
      training: advanced && s.training,
    });
    void enterGameDisplay();
    navigate('/partida');
  };

  const timerExplain =
    s.timer.mode === 'unlimited'
      ? t('setup.timer.explainUnlimited')
      : s.timer.bankSeconds > 0
        ? t('setup.timer.explain', { base: s.timer.baseSeconds, bank: s.timer.bankSeconds })
        : t('setup.timer.explainNoBank', { base: s.timer.baseSeconds });

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <BackLink label={t('setup.back')} />
        <h1 className={styles.title}>{t('setup.title')}</h1>
      </header>

      <section className={styles.card} aria-labelledby="sec-mode">
        <h2 id="sec-mode">{t('setup.mode')}</h2>
        <Segmented<Mode>
          label={t('setup.mode')}
          value={mode}
          options={[
            { value: 'yonma', label: t('setup.mode.yonma') },
            { value: 'sanma', label: t('setup.mode.sanma') },
          ]}
          disabled={['sanma']}
          onChange={(m) => s.set({ mode: m })}
        />
        <p className={styles.help}>{t('setup.mode.sanmaSoon')}</p>
        {options
          .filter((o) => o.group === 'basic')
          .map((o) => (
            <RuleControl
              key={o.id}
              option={o}
              mode={mode}
              value={valueOf(o.id)}
              issues={issuesFor(o.id)}
              onChange={(v) => s.setRule(mode, o.id, v)}
            />
          ))}
      </section>

      <section className={styles.card} aria-labelledby="sec-timer">
        <h2 id="sec-timer">{t('setup.timer')}</h2>
        <Segmented<TimerPresetId | 'custom'>
          label={t('setup.timer')}
          value={customTimer ? 'custom' : presetOf(s.timer)}
          options={[
            ...TIMER_IDS.map((id) => ({
              value: id,
              label: id === 'unlimited' ? t('setup.timer.unlimited') : id,
            })),
            { value: 'custom' as const, label: t('setup.timer.custom') },
          ]}
          onChange={setTimerPreset}
        />
        {customTimer && s.timer.mode === 'timed' && (
          <div className={styles.row}>
            <label>
              {t('setup.timer.base')}
              <input
                className={styles.number}
                type="number"
                min={TIMER_LIMITS.base.min}
                max={TIMER_LIMITS.base.max}
                value={Number.isFinite(s.timer.baseSeconds) ? s.timer.baseSeconds : ''}
                onChange={(e) => setCustom({ baseSeconds: Number(e.target.value) })}
              />
            </label>
            <label>
              {t('setup.timer.bank')}
              <input
                className={styles.number}
                type="number"
                min={TIMER_LIMITS.bank.min}
                max={TIMER_LIMITS.bank.max}
                value={Number.isFinite(s.timer.bankSeconds) ? s.timer.bankSeconds : ''}
                onChange={(e) => setCustom({ bankSeconds: Number(e.target.value) })}
              />
            </label>
          </div>
        )}
        {!timerValid && (
          <p className={styles.error} role="alert">
            {t('setup.timer.invalid')}
          </p>
        )}
        <p className={styles.help}>{timerExplain}</p>
        <p className={styles.tip}>{t('setup.timer.tip')}</p>
        <button type="button" className={styles.link} onClick={() => setTimerPreset('5+20')}>
          {t('setup.timer.restore')}
        </button>
      </section>

      <section className={styles.card} aria-labelledby="sec-opp">
        <h2 id="sec-opp">{t('setup.opponents')}</h2>
        <Segmented<BotSkill>
          label={t('setup.difficulty')}
          value={s.difficulty}
          options={[
            { value: 'easy', label: t('setup.difficulty.easy') },
            { value: 'normal', label: t('setup.difficulty.normal') },
            {
              value: 'hard',
              label: `${t('setup.difficulty.hard')} (${t('setup.difficulty.hardSoon')})`,
            },
          ]}
          disabled={['hard']}
          onChange={(d) => s.set({ difficulty: d })}
        />
        <div className={styles.characters}>
          {Array.from({ length: (mode === 'yonma' ? 4 : 3) - 1 }, (_, i) => {
            const choice = s.characters[i] ?? 'random';
            return (
              <label key={i} className={styles.character}>
                <span>{t('setup.seat', { n: i + 1 })}</span>
                <select
                  value={choice}
                  onChange={(e) => s.setCharacter(i, e.target.value as CharacterChoice)}
                >
                  <option value="random">{t('setup.character.random')}</option>
                  {CHARACTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {t(`characters.${c.id}.name`)}
                    </option>
                  ))}
                </select>
                <small className={styles.help}>
                  {choice === 'random' ? '' : t(`characters.${choice}.style`)}
                </small>
              </label>
            );
          })}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="sec-helps">
        <h2 id="sec-helps">{t('setup.helps')}</h2>
        <p className={styles.help}>{t('setup.helps.soon')}</p>
      </section>

      <section className={styles.card} aria-labelledby="sec-adv">
        <h2 id="sec-adv">{t('setup.advanced')}</h2>
        <Segmented<boolean>
          label={t('setup.advanced')}
          value={advanced}
          options={[
            { value: false, label: t('setup.advanced.off') },
            { value: true, label: t('setup.advanced.on') },
          ]}
          onChange={(v) => s.set({ advanced: { ...s.advanced, [mode]: v } })}
        />
        {advanced && (
          <>
            <div className={styles.rules}>
              {options
                .filter((o) => o.group === 'advanced')
                .map((o) => (
                  <RuleControl
                    key={o.id}
                    option={o}
                    mode={mode}
                    value={valueOf(o.id)}
                    issues={issuesFor(o.id)}
                    onChange={(v) => s.setRule(mode, o.id, v)}
                  />
                ))}
            </div>
            <div className={styles.rule}>
              <span className={styles.ruleLabel}>{t('setup.training')}</span>
              <Segmented<boolean>
                label={t('setup.training')}
                value={s.training}
                options={[
                  { value: false, label: t('rules.value.off') },
                  { value: true, label: t('rules.value.on') },
                ]}
                onChange={(v) => s.set({ training: v })}
              />
              <p className={styles.help}>{t('setup.training.desc')}</p>
            </div>
            <button type="button" className={styles.link} onClick={() => s.resetRules(mode)}>
              {t('setup.advanced.restore')}
            </button>
          </>
        )}
      </section>

      <section className={styles.card} aria-labelledby="sec-summary">
        <h2 id="sec-summary">{t('setup.summary')}</h2>
        <ul className={styles.summary}>
          <li>
            {t('setup.mode')}: <strong>{t(`setup.mode.${mode}`)}</strong>
          </li>
          <li>
            {t('setup.timer')}: <strong>{timerLabel}</strong>
          </li>
          <li>
            {t('setup.opponents')}: <strong>{t(`setup.difficulty.${s.difficulty}`)}</strong>
          </li>
          {advanced && s.training && (
            <li className={styles.changed}>
              <strong>{t('setup.training')}</strong>
            </li>
          )}
          {changed.length === 0 ? (
            <li>{t('setup.summary.default')}</li>
          ) : (
            changed.map((o) => (
              <li key={o.id} className={styles.changed}>
                {tKey(o.label)}: <strong>{valueLabel(o, valueOf(o.id))}</strong>{' '}
                <em>({t('setup.summary.changed')})</em>
              </li>
            ))
          )}
        </ul>
        {!canStart && (
          <p className={styles.error} role="alert">
            {t('setup.invalid')}
          </p>
        )}
        <button type="button" className={styles.start} disabled={!canStart} onClick={start}>
          {t('setup.start')}
        </button>
      </section>
    </main>
  );
}

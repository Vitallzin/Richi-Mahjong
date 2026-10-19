/** /tutorial/:capitulo — tutorial textual em capítulos curtos (spec 10.8), disponível a qualquer momento. */
import { Link, useParams } from 'react-router-dom';
import { CHAPTERS } from '../../content/tutorial';
import { t } from '../../i18n';
import { useSettings } from '../../state/settings';
import { BackLink } from '../components/BackLink';
import { TileLabelsContext } from '../components/tileLabels';
import { Markdown } from './Markdown';
import styles from './Tutorial.module.css';

const CHAPTER_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** "2. Como formar uma mão" → "Como formar uma mão" (o número vai no selo). */
const plainTitle = (title: string) => title.replace(/^\d+\.\s*/, '');

function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={back ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  );
}

export function TutorialScreen() {
  const { capitulo } = useParams();
  const labels = useSettings((s) => s.helps.labels);
  const index = capitulo ? CHAPTERS.findIndex((c) => c.slug === capitulo) : 0;
  const chapter = CHAPTERS[index];
  const prev = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];
  const progress = chapter ? ((index + 1) / CHAPTERS.length) * 100 : 0;

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label={t('tutorial.chapters')}>
        <BackLink />
        <h2 className={styles.navTitle}>{t('tutorial.title')}</h2>
        {chapter && (
          <div className={styles.progress}>
            <span>{t('tutorial.progress', { n: index + 1, total: CHAPTERS.length })}</span>
            <span className={styles.progressBar}>
              <span className={styles.progressFill} style={{ width: `${progress}%` }} />
            </span>
          </div>
        )}
        <ol className={styles.toc}>
          {CHAPTERS.map((c, i) => (
            <li key={c.slug}>
              <Link
                to={`/tutorial/${c.slug}`}
                aria-current={i === index ? 'page' : undefined}
                className={`${styles.tocItem} ${i === index ? styles.current : ''} ${i < index ? styles.done : ''}`}
              >
                <span className={styles.tocSeal} aria-hidden="true">
                  {CHAPTER_KANJI[i] ?? i + 1}
                </span>
                {plainTitle(c.title)}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <article key={chapter?.slug ?? 'none'} className={styles.article}>
        {chapter ? (
          <TileLabelsContext.Provider value={labels}>
            <Markdown source={chapter.source} />
          </TileLabelsContext.Provider>
        ) : (
          <p>{t('tutorial.notFound')}</p>
        )}
        <div className={styles.pager}>
          {prev ? (
            <Link
              className={`${styles.pageButton} ${styles.pagePrev}`}
              to={`/tutorial/${prev.slug}`}
            >
              <span className={styles.pageArrow}>
                <Arrow back />
              </span>
              <span className={styles.pageText}>
                <span className={styles.pageHint}>{t('tutorial.prev')}</span>
                <span className={styles.pageTitle}>{plainTitle(prev.title)}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              className={`${styles.pageButton} ${styles.pageNext}`}
              to={`/tutorial/${next.slug}`}
            >
              <span className={styles.pageText}>
                <span className={styles.pageHint}>{t('tutorial.next')}</span>
                <span className={styles.pageTitle}>{plainTitle(next.title)}</span>
              </span>
              <span className={styles.pageArrow}>
                <Arrow />
              </span>
            </Link>
          ) : (
            chapter && (
              <Link className={`${styles.pageButton} ${styles.pageNext}`} to="/jogar">
                <span className={styles.pageText}>
                  <span className={styles.pageHint}>{t('tutorial.done')}</span>
                  <span className={styles.pageTitle}>{t('tutorial.play')}</span>
                </span>
                <span className={styles.pageArrow}>
                  <Arrow />
                </span>
              </Link>
            )
          )}
        </div>
      </article>
    </main>
  );
}

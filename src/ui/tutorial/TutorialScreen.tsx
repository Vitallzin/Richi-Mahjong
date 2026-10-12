/** /tutorial/:capitulo — tutorial textual em capítulos curtos (spec 10.8), disponível a qualquer momento. */
import { Link, useParams } from 'react-router-dom';
import { CHAPTERS } from '../../content/tutorial';
import { t } from '../../i18n';
import { TileLabelsContext } from '../components/tileLabels';
import { useSettings } from '../../state/settings';
import { Markdown } from './Markdown';
import styles from './Tutorial.module.css';

export function TutorialScreen() {
  const { capitulo } = useParams();
  const labels = useSettings((s) => s.helps.labels);
  const index = capitulo ? CHAPTERS.findIndex((c) => c.slug === capitulo) : 0;
  const chapter = CHAPTERS[index];
  const prev = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label={t('tutorial.chapters')}>
        <Link className={styles.back} to="/">
          ← {t('common.back')}
        </Link>
        <h2 className={styles.navTitle}>{t('tutorial.title')}</h2>
        <ol className={styles.toc}>
          {CHAPTERS.map((c, i) => (
            <li key={c.slug}>
              <Link
                to={`/tutorial/${c.slug}`}
                aria-current={i === index ? 'page' : undefined}
                className={i === index ? styles.current : undefined}
              >
                {c.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <article className={styles.article}>
        {chapter ? (
          <TileLabelsContext.Provider value={labels}>
            <Markdown source={chapter.source} />
          </TileLabelsContext.Provider>
        ) : (
          <p>{t('tutorial.notFound')}</p>
        )}
        <div className={styles.pager}>
          {prev ? <Link to={`/tutorial/${prev.slug}`}>{t('tutorial.prev')}</Link> : <span />}
          {next && <Link to={`/tutorial/${next.slug}`}>{t('tutorial.next')}</Link>}
        </div>
      </article>
    </main>
  );
}

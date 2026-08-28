import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  currentSeason,
  entriesByStatus,
  entryTitle,
  STATUS_KEY,
  useLibrary,
  type LibraryEntry,
} from '@/store/library';
import { entryQuery, useDisplayTitle } from '@/store/titles';
import { useScreenTone } from '@/store/tone';
import { useSearchOverlay } from '@/components/searchStore';
import { Btn, IconBtn, PageTitle, EmptyState, Segmented, Ring } from '@/components/ui';
import { Card } from '@/components/Card';
import { RollSheet } from '@/components/RollSheet';
import { Icon } from '@/components/icons';
import { ST_ICON } from '@/components/ui';
import { useT } from '@/i18n';

type PanelKey = 'watching' | 'nextup' | 'planned';
const HOME_PANELS: PanelKey[] = ['watching', 'nextup', 'planned'];

/** Home zeigt Watchlist gedeckelt (in der Bibliothek erreichbar), watching/nextup ungedeckelt. */
const PANEL_PREVIEW: Record<PanelKey, number> = { watching: Infinity, nextup: Infinity, planned: 20 };

/* --------------------------------------------------------- Frontplatte --- */

function Hero({
  list,
  heroIdx,
  onShift,
  onRoll,
}: {
  list: LibraryEntry[];
  heroIdx: number;
  onShift: (d: number) => void;
  onRoll: () => void;
}) {
  const t = useT();
  const setProgress = useLibrary((s) => s.setProgress);
  const hero = list[heroIdx];
  const season = currentSeason(hero);
  const cov = season?.coverUrl ?? hero.seasons[0]?.coverUrl ?? null;
  const pct = season?.episodes ? Math.min(1, hero.progress / season.episodes) : 0;
  const title = useDisplayTitle(entryQuery(hero), entryTitle(hero));
  const seasonNo = hero.seasonIndex + 1;

  return (
    <section className="hero" data-st="watching">
      <div className="hero__bg">{cov && <img src={cov} alt="" />}</div>
      <div className="hero__in">
        <Link to={`/anime/${season?.id ?? hero.rootId}`} className="hero__cover" aria-label={title}>
          {cov && <img src={cov} alt="" />}
          <span className="hero__ring">
            <Ring pct={pct} size={46} w={4} label={`${Math.round(pct * 100)}%`} />
          </span>
        </Link>
        <div className="hero__body">
          <div className="hero__head">
            <span className="kicker">{t('panelWatching')}</span>
            {list.length > 1 && (
              <div className="hero__switch">
                <IconBtn name="left" label={t('back')} sm className="iconbtn--bare" onClick={() => onShift(-1)} />
                <span className="hero__idx tnum">
                  {heroIdx + 1}/{list.length}
                </span>
                <IconBtn name="right" label={t('openEntry')} sm className="iconbtn--bare" onClick={() => onShift(1)} />
              </div>
            )}
          </div>
          <h2 className="hero__title" style={{ marginTop: 6 }}>
            {title}
          </h2>
          <p className="hero__line">
            {t('seasonN', { n: seasonNo })} ·{' '}
            {t('episodeXofY', { p: hero.progress, t: season?.episodes ?? '?' })}
          </p>
          <div className="hero__acts">
            <Btn
              variant="primary"
              ico="play"
              onClick={() => setProgress(hero.rootId, hero.progress + 1)}
            >
              {t('continueWithEp', { n: hero.progress + 1 })}
            </Btn>
            <IconBtn name="dice" label={t('randomPickBtn')} onClick={onRoll} />
          </div>
        </div>
        <div className="hero__side">
          <span className="muted" style={{ display: 'block', marginBottom: 8 }}>
            {t('progressLabel')}
          </span>
          <div className="stepper">
            <button
              type="button"
              className="stepper__btn"
              aria-label="−1"
              disabled={hero.progress <= 0}
              onClick={() => setProgress(hero.rootId, hero.progress - 1)}
            >
              <Icon name="minus" size={18} />
            </button>
            <span className="stepper__val">{hero.progress}</span>
            <button
              type="button"
              className="stepper__btn"
              aria-label="+1"
              onClick={() => setProgress(hero.rootId, hero.progress + 1)}
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Seite --- */

export function HomePage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const username = useLibrary((s) => s.username);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();

  const [panel, setPanel] = useState<PanelKey>('watching');
  const [heroIdx, setHeroIdx] = useState(0);
  const [rolling, setRolling] = useState(false);

  useScreenTone(panel);

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const watching = byStatus.watching;
  const isEmpty = hydrated && Object.keys(entries).length === 0;

  const clampedHero = watching.length ? ((heroIdx % watching.length) + watching.length) % watching.length : 0;
  const shiftHero = (d: number) => setHeroIdx((i) => i + d);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return t('homeGreetingLate');
    if (h < 11) return t('homeGreetingMorning');
    if (h < 18) return t('homeGreetingDay');
    return t('homeGreetingEvening');
  })();

  const list = byStatus[panel];
  const rollPool = [...byStatus.planned, ...byStatus.nextup];

  const panelEmptyHint: Record<PanelKey, string> = {
    watching: t('panelEmptyWatching'),
    nextup: t('panelEmptyNextup'),
    planned: t('panelEmptyPlanned'),
  };

  return (
    <div>
      <PageTitle
        title={username ? `${greeting}, ${username}` : greeting}
        sub={
          watching.length > 0
            ? t('homeSubWatching', {
                n: watching.length,
                plural: watching.length === 1 ? t('homeSubWatchingOne') : t('homeSubWatchingMany'),
              })
            : t('homeSubIdle')
        }
      />

      {isEmpty ? (
        <EmptyState
          status="watching"
          title={t('emptyHomeTitle')}
          hint={t('emptyHomeHint')}
          action={
            <Btn variant="primary" ico="search" onClick={openSearch}>
              {t('emptyHomeCta')}
            </Btn>
          }
        />
      ) : (
        <>
          {watching.length > 0 && (
            <Hero list={watching} heroIdx={clampedHero} onShift={shiftHero} onRoll={() => setRolling(true)} />
          )}

          <div style={{ marginTop: 22 }}>
            <Segmented
              items={HOME_PANELS.map((s) => ({
                key: s,
                label: t(STATUS_KEY[s]),
                count: byStatus[s].length,
                ico: ST_ICON[s],
              }))}
              active={panel}
              onPick={setPanel}
            />
            <div className="panel-body" style={{ marginTop: 16 }} data-st={panel}>
              {list.length === 0 ? (
                <EmptyState
                  status={panel}
                  title={t(STATUS_KEY[panel])}
                  hint={panelEmptyHint[panel]}
                  action={
                    <Btn variant="primary" ico="search" onClick={openSearch}>
                      {t('emptyHomeCta')}
                    </Btn>
                  }
                />
              ) : (
                <>
                  {panel === 'planned' && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <Btn variant="primary" ico="dice" onClick={() => setRolling(true)}>
                        {t('randomPickBtn')}
                      </Btn>
                    </div>
                  )}
                  <div className={`grid${panel === 'planned' ? ' grid--roomy' : ''}`}>
                    {list.slice(0, PANEL_PREVIEW[panel]).map((e) => (
                      <Card key={e.rootId} entry={e} />
                    ))}
                  </div>
                  {list.length > PANEL_PREVIEW[panel] && (
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                      <Link to="/bibliothek" className="btn btn--quiet btn--sm">
                        <span>{t('showAllInLibrary', { n: list.length })}</span>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {rolling && <RollSheet pool={rollPool} onClose={() => setRolling(false)} />}
    </div>
  );
}

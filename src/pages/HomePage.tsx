import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchManyByIds } from '@/api/anilist';
import { EntryCard } from '@/components/EntryCard';
import { Icon } from '@/components/Icon';
import { Button, EmptyState, IconButton, Ring, SectionHead, Segmented, Stepper } from '@/components/kit';
import { useSearchOverlay } from '@/components/searchStore';
import { STATUS_THEME } from '@/domain/status';
import { seasonNo, seasonPct } from '@/domain/progress';
import { useLocale, useT } from '@/i18n';
import {
  currentSeason,
  entriesByStatus,
  entryCover,
  entryTitle,
  useLibrary,
  type LibraryEntry,
} from '@/store/library';

/**
 * STARTBILDSCHIRM.
 *
 * Drei Teile, in dieser Reihenfolge:
 *  1. Die laufende Serie als GERÄT-FRONTPLATTE — groß, mit Ring, Weiter-Knopf
 *     und (ab Laptop) eigener Episodensteuerung rechts.
 *  2. Drei Panels hinter einer Auswahlleiste, deren Daumen die Farbe der
 *     gewählten Kategorie trägt.
 *  3. „Als Nächstes im Simulcast" — was aus der eigenen Bibliothek diese
 *     Woche ausgestrahlt wird.
 */

/** Die drei Kategorien, die Home zeigt. Bibliothek zeigt bewusst die anderen. */
const HOME_PANELS = ['watching', 'nextup', 'planned'] as const;
type PanelKey = (typeof HOME_PANELS)[number];

/**
 * Home zeigt bewusst nur einen Ausschnitt der Watchlist. Ohne Deckel wäre
 * eine lange Liste hier eine endlose Wand; „Weiter schauen"/„Noch zu
 * schauen" sind naturgemäß kurz und brauchen keinen.
 */
const PANEL_PREVIEW: Record<PanelKey, number> = {
  watching: Infinity,
  nextup: Infinity,
  planned: 20,
};

/** Die Frontplatte: die eine Serie, die gerade läuft. */
function Hero({
  entry: e,
  index,
  total,
  onShift,
  onRoll,
}: {
  entry: LibraryEntry;
  index: number;
  total: number;
  onShift: (delta: number) => void;
  onRoll: () => void;
}) {
  const t = useT();
  const setProgress = useLibrary((s) => s.setProgress);
  const s = currentSeason(e);
  const pct = seasonPct(e);
  const banner = entryCover(e);

  return (
    <section className="hero" data-st="watching">
      <div className="hero__bg" aria-hidden>
        {banner && <img src={banner} alt="" decoding="async" />}
      </div>

      <div className="hero__in">
        <Link to={`/anime/${e.rootId}`} className="hero__cover" aria-label={entryTitle(e)}>
          {banner && <img src={banner} alt="" decoding="async" />}
          {/* Der Ring sitzt auf der Hülle statt in der Knopfreihe: auf dem
              Handy sprengte er sonst die Zeile und schob den Würfel um. */}
          <span className="hero__ring">
            <Ring pct={pct} size={40} width={3.5} label={String(Math.round(pct * 100))} />
          </span>
        </Link>

        <div className="hero__body">
          <div className="hero__head">
            <span className="kicker">
              <span className="dot" aria-hidden />
              {t(STATUS_THEME.watching.labelKey)}
            </span>
            {/* Umschalter nur, wenn es wirklich etwas umzuschalten gibt —
                sonst zeigt ein einzelner Eintrag zwei tote Pfeile. */}
            {total > 1 && (
              <div className="hero__switch">
                <IconButton
                  name="left"
                  label={t('heroPrev')}
                  size="sm"
                  bare
                  onClick={() => onShift(-1)}
                />
                <span className="hero__idx tnum">
                  {index + 1}/{total}
                </span>
                <IconButton
                  name="right"
                  label={t('heroNext')}
                  size="sm"
                  bare
                  onClick={() => onShift(1)}
                />
              </div>
            )}
          </div>

          <h2 className="hero__title">{entryTitle(e)}</h2>
          <p className="hero__line">
            {t('seasonN', { n: seasonNo(e) })} · {t('epShort')} {e.progress}/{s?.episodes ?? '?'}
          </p>

          <div className="hero__acts">
            <Button
              variant="primary"
              icon="play"
              onClick={() => setProgress(e.rootId, e.progress + 1)}
            >
              {t('continueWithEp', { n: e.progress + 1 })}
            </Button>
            <IconButton name="dice" label={t('randomPickBtn')} onClick={onRoll} />
          </div>
        </div>

        {/* Ab Laptop steht rechts die Episodensteuerung — sonst bliebe die
            rechte Hälfte der Frontplatte leer. */}
        <div className="hero__side">
          <span className="muted">{t('heroProgress')}</span>
          <Stepper
            value={e.progress}
            max={s?.episodes ?? null}
            onChange={(n) => setProgress(e.rootId, n)}
            label={t('epShort')}
          />
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const username = useLibrary((s) => s.username);
  const openSearch = useSearchOverlay((s) => s.open);
  const t = useT();
  const locale = useLocale();

  const [panel, setPanel] = useState<PanelKey>('watching');
  const [heroIdx, setHeroIdx] = useState(0);

  const byStatus = useMemo(() => entriesByStatus(entries), [entries]);
  const watching = byStatus.watching;

  /**
   * Der Zeiger der Frontplatte hält sich an die Länge der aktuellen Liste.
   * Ohne das Umlaufen bliebe man am Ende hängen; ohne die Klemmung stünde
   * der Zeiger nach dem Entfernen eines Eintrags im Leeren.
   */
  const sicherIdx = watching.length > 0 ? Math.min(heroIdx, watching.length - 1) : 0;
  const hero = watching[sicherIdx];
  const shiftHero = (delta: number) => {
    if (watching.length === 0) return;
    setHeroIdx(((sicherIdx + delta) % watching.length + watching.length) % watching.length);
  };

  // Alles, was in der eigenen Bibliothek gerade ausgestrahlt wird — EIN
  // gebündelter Request, nicht einer pro Anime.
  const releasingIds = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.status === 'watching' || e.status === 'planned' || e.status === 'nextup')
        .map((e) => currentSeason(e))
        .filter((s) => s?.airStatus === 'RELEASING')
        .map((s) => s!.id),
    [entries],
  );

  const airing = useQuery({
    queryKey: ['airing', releasingIds.slice().sort().join(',')],
    enabled: hydrated && releasingIds.length > 0,
    queryFn: async ({ signal }) => {
      const cards = await fetchManyByIds(releasingIds, signal);
      return cards
        .filter((c) => c.nextAiringEpisode)
        .sort((a, b) => a.nextAiringEpisode!.airingAt - b.nextAiringEpisode!.airingAt);
    },
    staleTime: 30 * 60 * 1000,
  });

  const fmtAiring = (ts: number): string => {
    const d = new Date(ts * 1000);
    const heute = new Date();
    const tage = Math.floor(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
        new Date(heute.getFullYear(), heute.getMonth(), heute.getDate()).getTime()) /
        86_400_000,
    );
    const zeit = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (tage === 0) return `${t('today')}, ${zeit}`;
    if (tage === 1) return `${t('tomorrow')}, ${zeit}`;
    if (tage < 7) return `${d.toLocaleDateString(locale, { weekday: 'short' })}, ${zeit}`;
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return t('homeGreetingLate');
    if (h < 11) return t('homeGreetingMorning');
    if (h < 18) return t('homeGreetingDay');
    return t('homeGreetingEvening');
  })();

  // ---- Zufallsroller: rollt sichtbar durch die Watchlist und wird langsamer.
  const [roll, setRoll] = useState<{ highlightId: number | null; rolling: boolean }>({
    highlightId: null,
    rolling: false,
  });
  const rollTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (rollTimer.current) window.clearTimeout(rollTimer.current);
    },
    [],
  );

  function rollRandom() {
    const list = byStatus.planned;
    if (list.length === 0 || roll.rolling) return;
    if (rollTimer.current) window.clearTimeout(rollTimer.current);

    setPanel('planned');
    const ziel = Math.floor(Math.random() * list.length);
    const runden = list.length > 1 ? 3 : 1;
    const schritte = runden * list.length + ziel + 1;
    let schritt = 0;

    const tick = () => {
      const idx = schritt % list.length;
      const letzter = schritt === schritte - 1;
      setRoll({ highlightId: list[idx].rootId, rolling: !letzter });
      schritt += 1;
      if (!letzter) {
        const anteil = schritt / schritte;
        rollTimer.current = window.setTimeout(tick, 45 + anteil * anteil * 240);
      }
    };
    tick();
  }

  const listen: Record<PanelKey, LibraryEntry[]> = {
    watching,
    nextup: byStatus.nextup,
    planned: byStatus.planned,
  };
  const aktiv = listen[panel];
  const sichtbar = aktiv.slice(0, PANEL_PREVIEW[panel]);
  const istLeer = hydrated && Object.keys(entries).length === 0;

  if (istLeer) {
    return (
      <>
        <header className="pagehead">
          <h1 className="h-large">{username ? `${greeting}, ${username}` : greeting}</h1>
          <p className="sub">{t('homeSubIdle')}</p>
        </header>
        <EmptyState
          status="watching"
          title={t('emptyHomeTitle')}
          hint={t('emptyHomeHint')}
          action={
            <Button variant="primary" icon="search" onClick={openSearch}>
              {t('emptyHomeCta')}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <header className="pagehead">
        <h1 className="h-large">{username ? `${greeting}, ${username}` : greeting}</h1>
        <p className="sub">
          {watching.length > 0
            ? t('homeSubWatching', {
                n: watching.length,
                plural:
                  watching.length === 1 ? t('homeSubWatchingOne') : t('homeSubWatchingMany'),
              })
            : t('homeSubIdle')}
        </p>
      </header>

      {hero && (
        <Hero
          entry={hero}
          index={sicherIdx}
          total={watching.length}
          onShift={shiftHero}
          onRoll={rollRandom}
        />
      )}

      <div className="panelwrap">
        <Segmented
          label={t('navHome')}
          value={panel}
          onChange={setPanel}
          options={HOME_PANELS.map((key) => ({
            key,
            label: t(STATUS_THEME[key].labelKey),
            count: listen[key].length,
            icon: STATUS_THEME[key].icon,
          }))}
        />

        {/* Der Würfel gehört zur Watchlist — dort entscheidet er ja. In der
            Frontplatte steht er zusätzlich, aber wer noch nichts angefangen
            hat, hat keine Frontplatte und käme sonst gar nicht an ihn ran. */}
        {panel === 'planned' && byStatus.planned.length > 0 && (
          <div className="panel-act">
            <Button icon="dice" size="sm" onClick={rollRandom} disabled={roll.rolling}>
              {t('randomPickBtn')}
            </Button>
          </div>
        )}

        <div className="panel-body" data-st={panel}>
          {sichtbar.length === 0 ? (
            <EmptyState
              status={panel}
              title={t(`panelEmpty${panel === 'watching' ? 'Watching' : panel === 'nextup' ? 'Nextup' : 'Planned'}` as const)}
              hint={t('emptyHomeHint')}
              action={
                <Button variant="primary" icon="search" onClick={openSearch}>
                  {t('emptyHomeCta')}
                </Button>
              }
            />
          ) : (
            <div className={`grid${panel === 'planned' ? ' grid--roomy' : ''}`}>
              {sichtbar.map((e) => (
                <EntryCard
                  key={e.rootId}
                  entry={e}
                  justAdded={roll.highlightId === e.rootId}
                  airingAt={
                    airing.data?.find((c) => c.id === currentSeason(e)?.id)?.nextAiringEpisode
                      ?.airingAt ?? null
                  }
                />
              ))}
            </div>
          )}

          {/* Home zeigt bewusst nur einen Ausschnitt. Ohne diesen Hinweis
              sah der Ausschnitt aus wie der ganze Bestand. */}
          {aktiv.length > PANEL_PREVIEW[panel] && (
            <p className="panel-more">
              <Link to="/bibliothek" className="btn btn--quiet btn--sm">
                {t('showAllInLibrary', { n: aktiv.length })}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* „Als Nächstes im Simulcast" — was aus der eigenen Bibliothek diese
          Woche läuft. Bewusst behalten (Entscheidung 26.08.2026), in der
          Wartefarbe Graublau mit tickendem Zeiger. */}
      {(airing.data?.length ?? 0) > 0 && (
        <section className="simulcast" data-st="continuation">
          <SectionHead title={t('simulcastTitle')} />
          <ul className="group">
            {airing.data!.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link to={`/anime/${c.id}`} className="setrow">
                  <span className="setrow__ico" aria-hidden>
                    <Icon name="clock" size={17} filled />
                  </span>
                  <span className="setrow__body">
                    <span className="setrow__t">{c.title.english ?? c.title.romaji}</span>
                    <span className="setrow__s tnum">
                      {t('epShort')} {c.nextAiringEpisode!.episode} ·{' '}
                      {fmtAiring(c.nextAiringEpisode!.airingAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

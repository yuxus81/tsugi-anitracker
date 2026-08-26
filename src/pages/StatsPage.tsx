import { useMemo } from 'react';
import { Bar, EmptyState, SectionHead } from '@/components/kit';
import { STATUS_THEME } from '@/domain/status';
import { useLocale, useT } from '@/i18n';
import {
  meanDuration,
  STATUS_ORDER,
  useLibrary,
  totalEpisodes,
  watchedEpisodes,
  type WatchStatus,
} from '@/store/library';

/**
 * STATISTIK — das Archiv in Zahlen.
 *
 * Alles wird aus dem AKTUELLEN Zustand gerechnet, nie aus etwas
 * Vorgebackenem: sonst zeigte die Seite nach dem Hinzufügen eines Titels
 * Fantasiewerte. Kein einziger Netzwerkaufruf.
 *
 * Farbe steht hier nie allein. Jede Kategorie trägt zwar ihre Farbrolle,
 * aber daneben immer Name UND Zahl — ein Balkendiagramm, das nur über Farbe
 * spricht, ist für einen Teil der Leser gar kein Diagramm.
 */

interface BarDatum {
  key: string;
  label: string;
  value: number;
  tone?: WatchStatus;
}

/** Eine Reihe Balken mit gemeinsamem Maßstab. */
function BarRows({ rows, testId }: { rows: BarDatum[]; testId: string }) {
  // Der längste Balken füllt die Zeile. Ohne die Untergrenze 1 teilte eine
  // durchweg leere Reihe durch null.
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="panel" data-testid={testId}>
      {rows.map((r) => (
        <div className="barrow" key={r.key} data-st={r.tone}>
          <span className="barrow__k" data-testid="bar-key">
            {r.label}
          </span>
          <Bar pct={r.value / max} label={r.label} />
          <span className="barrow__v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsPage() {
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const t = useT();
  const locale = useLocale();

  const zahlen = useMemo(() => {
    const alle = Object.values(entries);

    let minuten = 0;
    let folgen = 0;
    let wertungSumme = 0;
    let wertungAnzahl = 0;
    const proStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<
      WatchStatus,
      number
    >;
    const proGenre = new Map<string, number>();
    const proJahr = new Map<number, number>();
    const stufen = Array<number>(10).fill(0);
    let bekannteFolgen = 0;

    for (const e of alle) {
      const ep = watchedEpisodes(e);
      folgen += ep;
      minuten += ep * meanDuration(e);
      bekannteFolgen += totalEpisodes(e);
      proStatus[e.status] += 1;
      for (const g of e.genres) proGenre.set(g, (proGenre.get(g) ?? 0) + 1);
      const jahr = e.seasons[0]?.seasonYear;
      if (jahr) proJahr.set(jahr, (proJahr.get(jahr) ?? 0) + 1);
      if (e.rating != null) {
        stufen[e.rating - 1] += 1;
        wertungSumme += e.rating;
        wertungAnzahl += 1;
      }
    }

    return {
      gesamt: alle.length,
      folgen,
      stunden: Math.round(minuten / 60),
      tage: minuten / 1440,
      // `null`, nicht 0: „noch nie bewertet" ist keine Wertung von 0.
      schnitt: wertungAnzahl > 0 ? wertungSumme / wertungAnzahl : null,
      // Ebenfalls `null` statt 0: kennt AniList keine Folgenzahl (laufende
      // Staffeln haben oft keine), ist der Anteil UNBEKANNT — eine 0 % wäre
      // eine erfundene Zahl mit einem Etikett davor.
      anteil: bekannteFolgen > 0 ? Math.round((folgen / bekannteFolgen) * 100) : null,
      proStatus,
      genres: [...proGenre.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({ key: label, label, value })),
      // Nach Jahr AUFSTEIGEND: eine Zeitachse, die nach Menge sortiert ist,
      // ist keine Zeitachse mehr.
      jahre: [...proJahr.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .sort((a, b) => a[0] - b[0])
        .map(([jahr, value]) => ({ key: String(jahr), label: String(jahr), value })),
      stufen,
    };
  }, [entries]);

  if (hydrated && zahlen.gesamt === 0) {
    return (
      <>
        <header className="pagehead">
          <h1 className="h-large">{t('statsTitle')}</h1>
        </header>
        <EmptyState status="watching" title={t('statsEmptyTitle')} hint={t('statsEmptyHint')} />
      </>
    );
  }

  const sehzeit =
    zahlen.tage >= 1
      ? t('statsDays', { n: zahlen.tage.toLocaleString(locale, { maximumFractionDigits: 1 }) })
      : t('statsHours', { n: zahlen.stunden });

  const hatWertungen = zahlen.stufen.some((n) => n > 0);
  const maxStufe = Math.max(1, ...zahlen.stufen);

  const kacheln: Array<{
    id: string;
    wert: string;
    name: string;
    tone: WatchStatus;
    detail?: string;
  }> = [
    {
      id: 'stat-watchtime',
      wert: sehzeit,
      name: t('statsWatchtime'),
      tone: 'watching',
      // Wie weit man durch den eigenen Bestand ist. Stand vorher als großer
      // Leuchtring da; die Zahl ist dieselbe, sie braucht nur keinen Ring.
      detail: zahlen.anteil !== null ? t('statsCompletion', { n: zahlen.anteil }) : undefined,
    },
    {
      id: 'stat-episodes',
      wert: zahlen.folgen.toLocaleString(locale),
      name: t('statsEpisodes'),
      tone: 'nextup',
    },
    {
      id: 'stat-total',
      wert: zahlen.gesamt.toLocaleString(locale),
      name: t('statsTitles'),
      tone: 'planned',
    },
    {
      id: 'stat-rating',
      wert: zahlen.schnitt !== null ? zahlen.schnitt.toFixed(1) : '—',
      name: t('statsAvgRating'),
      tone: 'completed',
    },
  ];

  return (
    <>
      <header className="pagehead">
        <h1 className="h-large">{t('statsTitle')}</h1>
        <p className="sub">{t('statsSub')}</p>
      </header>

      <div className="tiles">
        {kacheln.map((k) => (
          <div className="tile stat-tile" key={k.id} data-st={k.tone} data-testid={k.id}>
            <span className="stat-tile__v">{k.wert}</span>
            <span className="stat-tile__k">{k.name}</span>
            {k.detail && <span className="stat-tile__d">{k.detail}</span>}
          </div>
        ))}
      </div>

      <SectionHead title={t('statsByStatus')} />
      <BarRows
        testId="status-spread"
        rows={STATUS_ORDER.map((s) => ({
          key: s,
          label: t(STATUS_THEME[s].labelKey),
          value: zahlen.proStatus[s],
          tone: s,
        }))}
      />

      {zahlen.genres.length > 0 && (
        <>
          <SectionHead title={t('statsGenres')} />
          <div data-st="nextup">
            <BarRows testId="genre-spread" rows={zahlen.genres} />
          </div>
        </>
      )}

      {/* Ein einzelnes Jahr ist keine Verteilung — der Abschnitt lohnt erst
          ab zweien. */}
      {zahlen.jahre.length > 1 && (
        <>
          <SectionHead title={t('statsByYear')} />
          <div data-st="planned">
            <BarRows testId="year-spread" rows={zahlen.jahre} />
          </div>
        </>
      )}

      {hatWertungen && (
        <>
          <SectionHead title={t('statsRatingDist')} />
          <div className="panel" data-st="completed" data-testid="rating-spread">
            <div className="spread">
              {zahlen.stufen.map((anzahl, i) => (
                <div className="spread__col" key={i} data-testid="spread-col">
                  <span className="spread__n">{anzahl > 0 ? anzahl : ''}</span>
                  <span
                    className="spread__bar"
                    style={{
                      height: `${(anzahl / maxStufe) * 100}%`,
                      // Eine Stufe ohne Treffer bleibt als Strich sichtbar —
                      // sonst sähe die Skala aus, als fehlten Werte.
                      minHeight: anzahl > 0 ? '6px' : '2px',
                      opacity: anzahl > 0 ? 1 : 0.25,
                    }}
                  />
                  <span className="spread__n">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

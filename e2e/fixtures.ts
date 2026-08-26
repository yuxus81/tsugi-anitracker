import { test as base, type Page } from '@playwright/test';

/**
 * Ein angemeldeter Nutzer mit gefüllter Bibliothek — ohne echtes Konto und
 * ohne echtes Netz.
 *
 * Gefälscht wird ausschließlich an den AUSSENGRENZEN: die Supabase-Sitzung
 * im Speicher des Browsers und die HTTP-Antworten von Supabase, AniList und
 * TMDB. Alles dazwischen — Store, Ableitungsregeln, Oberfläche — ist der
 * echte Produktionscode. Ein Test, der stattdessen den Store direkt füllt,
 * würde am eigentlichen Weg vorbeimessen.
 */

const SUPABASE_HOST = 'test.supabase.co';
const USER_ID = '00000000-0000-4000-8000-000000000001';

/** Der Speicherschlüssel, den supabase-js aus der Projekt-URL ableitet. */
const AUTH_KEY = `sb-${SUPABASE_HOST.split('.')[0]}-auth-token`;

function fakeSession() {
  const jetzt = Math.floor(Date.now() / 1000);
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: jetzt + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.test',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      identities: [],
    },
  };
}

/** Ein Franchise-Eintrag, so wie ihn der Store in Supabase ablegt. */
export function entryRow(over: Partial<Record<string, unknown>> = {}) {
  const rootId = (over.root_id as number) ?? 1;
  return {
    user_id: USER_ID,
    root_id: rootId,
    status: 'watching',
    seasons: [
      {
        id: rootId,
        title: `Titel ${rootId}`,
        coverUrl: null,
        format: 'TV',
        episodes: 12,
        season: 'SPRING',
        seasonYear: 2024,
        startDate: { year: 2024, month: 4, day: 1 },
        airStatus: 'FINISHED',
        averageScore: 80,
        duration: 24,
      },
    ],
    season_index: 0,
    progress: 4,
    rating: null,
    notes: '',
    genres: ['Action'],
    added_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    last_scan_at: 0,
    release_note: null,
    ...over,
  };
}

/** Ein Katalog-Eintrag, so wie AniList ihn über `CARD_FIELDS` liefert. */
function mediaCard(id: number) {
  return {
    id,
    title: { romaji: `Romaji ${id}`, english: `Titel ${id}` },
    coverImage: { extraLarge: null, large: null, color: '#8a2be2' },
    format: 'TV',
    status: 'FINISHED',
    episodes: 12,
    duration: 24,
    averageScore: 70 + (id % 25),
    season: 'SPRING',
    seasonYear: 2024,
    genres: ['Action', 'Drama'],
    isAdult: false,
    nextAiringEpisode: null,
    startDate: { year: 2024, month: 4, day: 1 },
  };
}

function seite(ids: number[]) {
  return { pageInfo: { hasNextPage: false }, media: ids.map(mediaCard) };
}

/**
 * Die Franchise-Kette der Attrappe: 1 → 2 → 3, dann ist Schluss.
 *
 * Das ENDE ist der wichtige Teil. Eine erste Fassung gab auf jede Abfrage
 * denselben Titel zurück, egal welche Id gefragt war — der Startup-Scan lief
 * dann endlos im Kreis und feuerte Anfrage um Anfrage, bis der Test in einen
 * Zeitablauf lief. Eine Attrappe, die nicht antwortet, was gefragt wurde,
 * ist keine Attrappe, sondern eine Falle.
 */
const NACHFOLGER: Record<number, number | undefined> = { 1: 2, 2: 3 };

function relations(id: number) {
  const naechste = NACHFOLGER[id];
  return {
    edges: naechste
      ? [{ relationType: 'SEQUEL', node: { ...mediaCard(naechste), type: 'ANIME' } }]
      : [],
  };
}

/** Die volle Detail-Antwort — mit Kette, damit der Zeitstrahl etwas hat. */
function mediaDetail(id: number) {
  return {
    ...mediaCard(id),
    bannerImage: null,
    description: 'Eine Beschreibung <i>mit</i> Markup.<br>Zweite Zeile.',
    studios: { nodes: [{ name: 'Studio Test', isAnimationStudio: true }] },
    endDate: null,
    trailer: null,
    relations: relations(id),
    recommendations: {
      nodes: [{ mediaRecommendation: mediaCard(41) }, { mediaRecommendation: mediaCard(42) }],
    },
  };
}

export interface SeedOptions {
  /** Einträge, die die Bibliothek nach dem Sync enthält. */
  entries?: ReturnType<typeof entryRow>[];
}

/** Die eine Einstellungszeile, die es je Nutzer gibt. */
const EINSTELLUNGEN = {
  user_id: USER_ID,
  completed_order: [] as number[],
  username: 'Yunus',
  username_changed_at: null,
};

/**
 * PostgREST liefert ein einzelnes Objekt statt einer Liste, wenn der Aufrufer
 * das über den Accept-Kopf verlangt — genau das tut `.single()`/`.maybeSingle()`.
 */
function einzelnGewuenscht(route: { request(): { headers(): Record<string, string> } }): boolean {
  return (route.request().headers()['accept'] ?? '').includes('pgrst.object');
}

/**
 * Genug Einträge, dass der Inhaltsbereich auf JEDER geprüften Größe wirklich
 * überläuft. Mit einer Handvoll Karten passte die Seite auf ein 390×780-Handy
 * komplett hinein — dann bleibt `scrollTop` bei 0, und jeder Scroll-Test wäre
 * grün geworden, ohne je etwas bewegt zu haben.
 */
function standardEintraege() {
  const rows: ReturnType<typeof entryRow>[] = [];
  let id = 1;
  const viele = (status: string, anzahl: number, extra: Record<string, unknown> = {}) => {
    for (let i = 0; i < anzahl; i++) rows.push(entryRow({ root_id: id++, status, ...extra }));
  };

  // „Weiter schauen" ist der Panel, den Home beim Öffnen zeigt — der muss
  // lang genug sein, sonst hat die Seite gar keinen Scrollweg und die
  // Rahmen-Tests messen ins Leere.
  viele('watching', 14, { progress: 4 });
  viele('nextup', 6, { progress: 0 });
  // Eine lange Watchlist deckt nebenbei den „Alle in der Bibliothek"-Hinweis ab.
  viele('planned', 24, { progress: 0 });
  viele('continuation', 5, { progress: 0, release_note: '2027' });
  viele('completed', 9, { progress: 12, rating: 9 });

  return rows;
}

export async function seed(page: Page, options: SeedOptions = {}) {
  const entries = options.entries ?? standardEintraege();

  // Sitzung VOR dem ersten Skript in den Speicher legen — `auth.init()`
  // liest sie beim Start, und danach wäre es zu spät.
  await page.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key as string, JSON.stringify(session));
    },
    [AUTH_KEY, fakeSession()] as const,
  );

  // Supabase: Bibliothek, Einstellungen, Token-Erneuerung, Realtime.
  await page.route(`**://${SUPABASE_HOST}/**`, async (route) => {
    const url = route.request().url();

    if (url.includes('/auth/v1/token')) {
      return route.fulfill({ json: fakeSession() });
    }
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({ json: fakeSession().user });
    }
    if (url.includes('tsugi_entries')) {
      // Schreibende Zugriffe bestätigen wir stumm — der Test prüft die
      // Oberfläche, nicht die Datenbank.
      return route.fulfill({ json: route.request().method() === 'GET' ? entries : [] });
    }
    if (url.includes('tsugi_settings')) {
      // `.maybeSingle()` verlangt über den Accept-Kopf EIN Objekt, keine
      // Liste. Gäbe die Attrappe hier stur `[]` zurück, verschluckte sich
      // supabase-js daran — und `syncFromRemote` bräche mitsamt der
      // Bibliothek ab, obwohl die Einträge längst geladen waren.
      return route.fulfill({ json: einzelnGewuenscht(route) ? EINSTELLUNGEN : [EINSTELLUNGEN] });
    }
    return route.fulfill({ json: [] });
  });

  // AniList: wohlgeformte Antworten je nach gestellter Frage.
  //
  // Vorher stand hier stur `{ data: {} }`. Das war KEINE „leere, aber
  // wohlgeformte" Antwort, sondern eine kaputte: `data.trending` gab es dann
  // gar nicht, und Entdecken stürzte beim ersten Zugriff ab. Aufgefallen ist
  // es erst, als ein Bild von der Detailseite gebraucht wurde — bis dahin
  // hatte kein Test diese Seiten je geöffnet.
  await page.route('**://graphql.anilist.co/**', async (route) => {
    const roh = route.request().postDataJSON() as
      | { query?: string; variables?: Record<string, unknown> }
      | null;
    const query = roh?.query ?? '';
    const vars = roh?.variables ?? {};

    // Detailseite: EIN Titel mit allem dran.
    if (query.includes('recommendations')) {
      return route.fulfill({ json: { data: { Media: mediaDetail(Number(vars.id) || 1) } } });
    }

    // Der Franchise-Läufer fragt mehrere Ids gleichzeitig, je unter einem
    // eigenen Alias. Jeder Alias bekommt SEINE Id zurück — sonst dreht sich
    // die Kette im Kreis.
    if (query.includes('m0: Media')) {
      const data: Record<string, unknown> = {};
      for (const [alias, id] of Object.entries(vars)) {
        data[alias] = { ...mediaCard(Number(id)), relations: relations(Number(id)) };
      }
      return route.fulfill({ json: { data } });
    }

    if (query.includes('trending:')) {
      return route.fulfill({
        json: {
          data: {
            trending: seite([2, 3, 4, 5, 6, 7]),
            season: seite([8, 9, 10]),
            upcoming: seite([11, 12]),
            top: seite([13, 14, 15]),
            movies: seite([16, 17]),
          },
        },
      });
    }
    if (query.includes('popular:')) {
      return route.fulfill({
        json: { data: { popular: seite([21, 22]), best: seite([23]), fresh: seite([24]) } },
      });
    }
    // Suche und Sammelabfrage nach Ids.
    return route.fulfill({ json: { data: { Page: seite([31, 32, 33]) } } });
  });
  await page.route('**://api.themoviedb.org/**', (route) =>
    route.fulfill({ json: { results: [] } }),
  );
}

export const test = base.extend<{ seeded: void }>({
  seeded: [
    async ({ page }, use) => {
      await seed(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

/**
 * Den Inhaltsbereich scrollen — und BEWEISEN, dass er sich bewegt hat.
 *
 * Ohne diese Gegenprobe ist jeder Rahmen-Test wertlos: passt der Inhalt auf
 * den Schirm, bleibt `scrollTop` bei 0, die Leisten stehen trivialerweise
 * still und der Test meldet fröhlich „alles gut". Genau so ist dieser
 * Helfer entstanden.
 */
export async function scrollePane(page: Page, nach = 400): Promise<number> {
  const pane = page.locator('.pane');

  const platz = await pane.evaluate((el) => el.scrollHeight - el.clientHeight);
  if (platz < nach) {
    throw new Error(
      `Der Inhaltsbereich hat nur ${platz} px Scrollweg, verlangt sind ${nach} px. ` +
        'Der Test würde nichts messen — mehr Testdaten säen oder Zielwert senken.',
    );
  }

  await pane.evaluate((el, ziel) => {
    el.scrollTop = ziel;
  }, nach);
  await page.waitForTimeout(150);

  const stand = await pane.evaluate((el) => el.scrollTop);
  if (stand <= 0) throw new Error('Der Inhaltsbereich hat sich nicht bewegt.');
  return stand;
}

/**
 * Warten, bis die Bibliothek wirklich da ist.
 *
 * Der Rahmen steht sofort, die Einträge kommen aber erst nach dem Abgleich
 * mit Supabase. Wer nur auf `.app` wartet, misst eine noch leere — und damit
 * kurze — Seite. Feste Wartezeiten helfen da nicht, sie verschieben das
 * Rennen nur.
 */
export async function warteAufBibliothek(page: Page) {
  await page.locator('.card').first().waitFor({ state: 'visible', timeout: 10_000 });
}

import { useMemo } from 'react';
import { create } from 'zustand';

/**
 * Sprachumschaltung Deutsch/Englisch. Die Auswahl lebt in localStorage, damit
 * sie Reloads überlebt. Hinweis: AniList liefert keine deutschen Serientitel —
 * Titel erscheinen in beiden Sprachen als internationaler (englischer) Titel
 * bzw. Romaji, so wie sie auch hierzulande lizenziert sind.
 */

export type Lang = 'de' | 'en';

const LS_KEY = 'tsugi.lang';

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

interface SettingsState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  lang: loadLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(LS_KEY, lang);
    } catch {
      /* Session-only fallback */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

type Entry = { de: string; en: string };

const DICT = {
  // Navigation & Shell
  navHome: { de: 'Home', en: 'Home' },
  navDiscover: { de: 'Entdecken', en: 'Discover' },
  navLibrary: { de: 'Bibliothek', en: 'Library' },
  navStats: { de: 'Statistik', en: 'Stats' },
  navMore: { de: 'Mehr', en: 'More' },
  search: { de: 'Suchen', en: 'Search' },
  sidebarTagline: {
    de: 'Dein Archiv, auf allen Geräten synchron.',
    en: 'Your archive, in sync on every device.',
  },

  // Auth
  authTagline: {
    de: 'Dein Archiv, überall dabei — auf allen Geräten synchron.',
    en: 'Your archive, everywhere — in sync on every device.',
  },
  authEmail: { de: 'E-Mail', en: 'Email' },
  authPassword: { de: 'Passwort', en: 'Password' },
  authRemember: { de: 'Angemeldet bleiben', en: 'Remember me' },
  authForgot: { de: 'Passwort vergessen?', en: 'Forgot password?' },
  authLogIn: { de: 'Anmelden', en: 'Log in' },
  authSignUp: { de: 'Konto erstellen', en: 'Create account' },
  authSendReset: { de: 'Link senden', en: 'Send link' },
  authBackToLogin: { de: 'Zurück zum Login', en: 'Back to login' },
  authHaveAccount: { de: 'Schon ein Konto?', en: 'Already have an account?' },
  authNoAccount: { de: 'Noch kein Konto?', en: "Don't have an account?" },
  authResetSent: {
    de: 'Link zum Zurücksetzen an {email} geschickt — schau in dein Postfach.',
    en: 'Reset link sent to {email} — check your inbox.',
  },
  authNewPasswordHint: { de: 'Wähle ein neues Passwort für dein Konto.', en: 'Choose a new password for your account.' },
  authNewPassword: { de: 'Neues Passwort', en: 'New password' },
  authSetPassword: { de: 'Passwort setzen', en: 'Set password' },
  authPasswordUpdated: {
    de: 'Passwort aktualisiert. Du bist jetzt angemeldet.',
    en: 'Password updated. You are now signed in.',
  },
  authLoggedInAs: { de: 'Angemeldet als {email}', en: 'Signed in as {email}' },
  authLogOut: { de: 'Abmelden', en: 'Log out' },

  // Status
  stWatching: { de: 'Schaue ich', en: 'Watching' },
  stPlanned: { de: 'Watchlist', en: 'Watchlist' },
  stNextup: { de: 'Noch zu schauen', en: 'Ready to watch' },
  stContinuation: { de: 'Fortsetzung folgt', en: 'Sequel coming' },
  stCompleted: { de: 'Geschaut', en: 'Watched' },
  stPaused: { de: 'Pausiert', en: 'Paused' },
  pauseBtn: { de: 'Pausieren', en: 'Pause' },
  geschautFilterAll: { de: 'Abgeschlossen', en: 'Completed' },
  geschautFilterContinuation: { de: 'Fortsetzung', en: 'Sequel' },

  // Home
  homeGreetingLate: { de: 'Späte Session?', en: 'Late-night session?' },
  homeGreetingMorning: { de: 'Guten Morgen', en: 'Good morning' },
  homeGreetingDay: { de: 'Hey', en: 'Hey' },
  homeGreetingEvening: { de: 'Guten Abend', en: 'Good evening' },
  homeSubWatching: {
    de: '{n} {plural} gerade in deinem Archiv.',
    en: '{n} {plural} in your archive right now.',
  },
  homeSubWatchingOne: { de: 'Serie läuft', en: 'series running' },
  homeSubWatchingMany: { de: 'Serien laufen', en: 'series running' },
  homeSubIdle: { de: 'Dein Archiv, dein Tempo.', en: 'Your archive, your pace.' },
  panelWatching: { de: 'Weiter schauen', en: 'Continue watching' },
  panelNextup: { de: 'Noch zu schauen', en: 'Ready to watch' },
  panelPlanned: { de: 'Watchlist', en: 'Watchlist' },
  panelEmptyWatching: {
    de: 'Gerade läuft nichts — starte was von „Noch zu schauen“ oder deiner Watchlist.',
    en: 'Nothing running right now — start something from “Ready to watch” or your watchlist.',
  },
  panelEmptyNextup: {
    de: 'Keine offenen Staffeln. Sobald ein Franchise weitergeht, taucht es hier auf.',
    en: 'No pending seasons. As soon as a franchise continues, it shows up here.',
  },
  panelEmptyPlanned: {
    de: 'Deine Watchlist ist leer — merk dir was unter Entdecken vor.',
    en: 'Your watchlist is empty — bookmark something from Discover.',
  },
  continueWithEp: { de: 'Weiter mit Episode {n}', en: 'Continue with episode {n}' },
  seasonN: { de: 'Staffel {n}', en: 'Season {n}' },
  episodesSeen: { de: '{n} Episoden gesehen', en: '{n} episodes watched' },
  newSeasonReady: { de: 'Neue Staffel verfügbar', en: 'New season available' },
  startNow: { de: 'Jetzt starten', en: 'Start now' },
  simulcastTitle: { de: 'Als Nächstes im Simulcast', en: 'Next up in simulcast' },
  today: { de: 'heute', en: 'today' },
  tomorrow: { de: 'morgen', en: 'tomorrow' },
  emptyHomeTitle: { de: 'Noch ein leeres Archiv', en: 'An empty archive, for now' },
  emptyHomeHint: {
    de: 'Such deinen ersten Anime und füg ihn hinzu — ab dann startet jede Sitzung hier.',
    en: 'Search for your first anime and add it — every session starts here from then on.',
  },
  emptyHomeCta: { de: 'Ersten Anime suchen', en: 'Search your first anime' },
  epShort: { de: 'Ep.', en: 'Ep.' },
  newBadge: { de: 'NEU', en: 'NEW' },

  // Discover
  discoverTitle: { de: 'Entdecken', en: 'Discover' },
  discoverSub: {
    de: 'Was die Welt gerade schaut — und was du als Nächstes schauen könntest.',
    en: 'What the world is watching — and what you could watch next.',
  },
  filterAll: { de: 'Alles', en: 'All' },
  rowTrending: { de: 'Im Trend', en: 'Trending now' },
  rowSeason: { de: 'Diese Season', en: 'This season' },
  rowUpcoming: { de: 'Nächste Season', en: 'Next season' },
  rowTop: { de: 'Bestbewertet aller Zeiten', en: 'Top rated of all time' },
  rowMovies: { de: 'Filme', en: 'Movies' },
  rowPopularIn: { de: 'Beliebt in {g}', en: 'Popular in {g}' },
  rowBestRated: { de: 'Am besten bewertet', en: 'Best rated' },
  rowFresh: { de: 'Neu erschienen', en: 'Fresh releases' },
  spotlightKicker: { de: 'Gerade das Gesprächsthema', en: 'What everyone’s talking about' },

  // Suche
  searchPlaceholder: { de: 'Anime oder Film suchen …', en: 'Search anime or movies …' },
  searchMinChars: { de: 'Tippe mindestens zwei Zeichen.', en: 'Type at least two characters.' },
  searchError: {
    de: 'Suche gerade nicht möglich — gleich nochmal versuchen.',
    en: 'Search unavailable right now — try again in a moment.',
  },
  searchEmpty: { de: 'Nichts gefunden für „{q}“.', en: 'Nothing found for “{q}”.' },
  searchClose: { de: 'Suche schließen', en: 'Close search' },
  inArchive: { de: 'im Archiv', en: 'in archive' },

  // Detailseite
  back: { de: 'Zurück', en: 'Back' },
  add: { de: 'Hinzufügen', en: 'Add' },
  trailer: { de: 'Trailer', en: 'Trailer' },
  aboutTitle: { de: 'Worum es geht', en: 'Synopsis' },
  franchiseTimeline: { de: 'Franchise-Zeitstrahl', en: 'Franchise timeline' },
  youAreHere: { de: 'Du bist hier', en: 'You are here' },
  extrasTitle: { de: 'Specials & Nebengeschichten', en: 'Specials & side stories' },
  recsTitle: { de: 'Wenn dir das gefällt', en: 'More like this' },
  yourRating: { de: 'Deine Wertung', en: 'Your rating' },
  communityScore: { de: 'Community-Wertung', en: 'Community score' },
  studio: { de: 'Studio', en: 'Studio' },
  epLength: { de: 'Episodenlänge', en: 'Episode length' },
  period: { de: 'Zeitraum', en: 'Years' },
  genres: { de: 'Genres', en: 'Genres' },
  nextEpisode: { de: 'Nächste Episode', en: 'Next episode' },
  thisSeasonBox: { de: 'Diese Staffel', en: 'This season' },
  franchiseBox: { de: 'Gesamtes Franchise', en: 'Whole franchise' },
  fbScore: { de: 'Ø Community-Wertung', en: 'Avg. community score' },
  fbEpisodes: { de: 'Gesamtfolgen', en: 'Total episodes' },
  fbSeasons: { de: 'Staffeln', en: 'Seasons' },
  fbMovies: { de: 'Filme', en: 'Movies' },
  fbSpecials: { de: 'Specials & OVAs', en: 'Specials & OVAs' },
  fbRuntime: { de: 'Gesamtlaufzeit', en: 'Total runtime' },
  addHowFar: { de: 'Bis wohin hast du geschaut?', en: 'How far have you watched?' },
  addNotStarted: { de: 'Noch nicht angefangen', en: 'Not started yet' },
  addUpTo: { de: 'Bis hier geschaut', en: 'Watched up to here' },
  addConfirm: { de: 'Zur Bibliothek hinzufügen', en: 'Add to library' },
  addWatchlistHint: { de: 'Einfach vormerken, später schauen', en: 'Just save it, watch later' },
  addTrackHint: { de: 'Sag uns, bis wohin du schon bist', en: 'Tell us how far you got' },
  addBack: { de: 'Zurück', en: 'Back' },
  cancel: { de: 'Abbrechen', en: 'Cancel' },
  addedToast: { de: 'Zu „{s}“ hinzugefügt', en: 'Added to “{s}”' },
  removedToast: { de: 'Aus der Bibliothek entfernt', en: 'Removed from library' },
  remove: { de: 'Entfernen', en: 'Remove' },
  statusFinished: { de: 'Abgeschlossen', en: 'Finished' },
  statusReleasing: { de: 'Läuft gerade', en: 'Airing' },
  statusNotYet: { de: 'Angekündigt', en: 'Announced' },
  statusCancelled: { de: 'Abgebrochen', en: 'Cancelled' },
  statusHiatus: { de: 'Pausiert', en: 'On hiatus' },
  partOfFranchise: { de: 'Teil deines Franchise-Eintrags', en: 'Part of your franchise entry' },
  detailError: {
    de: 'Das hat gerade nicht geklappt. AniList ist vermutlich kurz nicht erreichbar.',
    en: 'That didn’t work. AniList is probably briefly unavailable.',
  },
  retry: { de: 'Nochmal versuchen', en: 'Try again' },
  entriesCount: { de: '{n} Einträge', en: '{n} entries' },
  openEntry: { de: 'Eintrag öffnen', en: 'Open entry' },

  // Bibliothek
  libraryTitle: { de: 'Bibliothek', en: 'Library' },
  librarySub: { de: '{n} Franchises in deinem Archiv.', en: '{n} franchises in your archive.' },
  libraryEmptyTitle: { de: 'Hier entsteht dein Archiv', en: 'Your archive starts here' },
  libraryEmptyHint: {
    de: 'Alles, was du trackst, landet hier — pro Franchise ein Eintrag, mit Staffeln, Fortschritt und Wertung.',
    en: 'Everything you track lands here — one entry per franchise, with seasons, progress and rating.',
  },
  libraryEmptyCta: { de: 'Anime suchen', en: 'Search anime' },
  libraryNothingIn: { de: 'Nichts unter „{s}“', en: 'Nothing under “{s}”' },
  libraryNothingHint: {
    de: 'Ändere den Status eines Titels oder füg etwas Neues hinzu.',
    en: 'Change a title’s status or add something new.',
  },
  seasonProgress: { de: 'Staffel {s} · Ep. {p}/{t}', en: 'Season {s} · Ep. {p}/{t}' },
  seasonsDone: { de: '{n} Staffeln', en: '{n} seasons' },
  seasonOne: { de: '1 Staffel', en: '1 season' },
  waitingForSequel: { de: 'Datum unbekannt', en: 'Release date unknown' },
  announcedFor: { de: 'Angekündigt · {when}', en: 'Announced · {when}' },
  dragToReorder: { de: 'Ziehen zum Umsortieren', en: 'Drag to reorder' },
  continuationComing: { de: 'Fortsetzung · {when}', en: 'Continuation · {when}' },
  continuationComingSoon: { de: 'Fortsetzung angekündigt', en: 'Continuation announced' },
  randomPickBtn: { de: 'Für mich entscheiden', en: 'Pick for me' },
  randomPickCta: { de: 'Jetzt ansehen', en: 'View now' },
  yourRatingShort: { de: 'deine Wertung {n}/10', en: 'your rating {n}/10' },
  watchedUpToTitle: { de: 'Bis „{t}“ geschaut', en: 'Watched up to “{t}”' },
  pausedAtEp: { de: 'Pausiert bei Episode {n}/{t}', en: 'Paused at episode {n}/{t}' },
  resumeBtn: { de: 'Fortsetzen', en: 'Resume' },
  markCompleteBtn: { de: 'Abschließen', en: 'Mark complete' },
  watchNowBtn: { de: 'Schauen', en: 'Watch' },
  readySeasonOpen: { de: 'Du hast noch eine Staffel offen', en: 'You have a season left to watch' },
  readyFilmOpen: { de: 'Du hast noch einen Film offen', en: 'You have a movie left to watch' },

  // Statistik
  statsTitle: { de: 'Statistik', en: 'Stats' },
  statsSub: {
    de: 'Dein Archiv in Zahlen — komplett offline berechnet.',
    en: 'Your archive in numbers — computed fully offline.',
  },
  statsEmptyTitle: { de: 'Noch nichts zu zählen', en: 'Nothing to count yet' },
  statsEmptyHint: {
    de: 'Sobald du Anime trackst, entsteht hier dein Profil: Sehzeit, Genres, Wertungen.',
    en: 'Once you track anime, your profile appears here: watch time, genres, ratings.',
  },
  statsTitles: { de: 'Franchises im Archiv', en: 'Franchises in archive' },
  statsEpisodes: { de: 'Episoden gesehen', en: 'Episodes watched' },
  statsWatchtime: { de: 'Sehzeit', en: 'Watch time' },
  statsDays: { de: '{n} Tage', en: '{n} days' },
  statsHours: { de: '{n} Std.', en: '{n} hrs' },
  statsHoursApprox: { de: '≈ {n} Stunden', en: '≈ {n} hours' },
  statsAvgRating: { de: 'Ø deiner Wertungen', en: 'Avg. of your ratings' },
  statsByStatus: { de: 'Nach Status', en: 'By status' },
  statsGenres: { de: 'Deine Genres', en: 'Your genres' },
  statsRatingDist: { de: 'Wertungsverteilung', en: 'Rating distribution' },
  statsByYear: { de: 'Nach Erscheinungsjahr', en: 'By release year' },

  // Einstellungen
  settingsTitle: { de: 'Einstellungen', en: 'Settings' },
  settingsSub: {
    de: 'Dein Archiv ist an dein Konto gebunden und mit all deinen Geräten synchron.',
    en: 'Your archive is tied to your account and stays in sync across all your devices.',
  },
  accountTitle: { de: 'Konto', en: 'Account' },
  languageTitle: { de: 'Sprache', en: 'Language' },
  languageGerman: { de: 'Deutsch', en: 'German' },
  languageEnglish: { de: 'Englisch', en: 'English' },
  languageNote: {
    de: 'Anime-Titel kommen von AniList und erscheinen als internationaler Titel — deutsche Lizenztitel stellt die Datenbank nicht bereit.',
    en: 'Anime titles come from AniList and appear as the international title — the database does not provide localized license titles.',
  },
  backupTitle: { de: 'Backup', en: 'Backup' },
  backupText: {
    de: 'Exportiere dein Archiv ({n} {plural}) als JSON-Datei — z. B. um es auf ein anderes Gerät zu übertragen. Der Import ersetzt das aktuelle Archiv vollständig.',
    en: 'Export your archive ({n} {plural}) as a JSON file — e.g. to move it to another device. Importing fully replaces the current archive.',
  },
  entryOne: { de: 'Eintrag', en: 'entry' },
  entryMany: { de: 'Einträge', en: 'entries' },
  exportBtn: { de: 'Exportieren', en: 'Export' },
  importBtn: { de: 'Importieren', en: 'Import' },
  exportedToast: { de: 'Backup exportiert', en: 'Backup exported' },
  importedToast: { de: '{n} Einträge importiert', en: '{n} entries imported' },
  importError: {
    de: 'Datei konnte nicht gelesen werden — ist das ein Tsugi-Backup?',
    en: 'Could not read that file — is it a Tsugi backup?',
  },
  dangerTitle: { de: 'Gefahrenzone', en: 'Danger zone' },
  dangerText: {
    de: 'Löscht das komplette Archiv aus diesem Browser. Vorher exportieren lohnt sich.',
    en: 'Deletes the entire archive from this browser. Exporting first is a good idea.',
  },
  wipeBtn: { de: 'Archiv leeren', en: 'Wipe archive' },
  wipeConfirm: {
    de: 'Wirklich alle {n} Einträge unwiderruflich löschen?',
    en: 'Really delete all {n} entries permanently?',
  },
  wipeYes: { de: 'Ja, alles löschen', en: 'Yes, delete everything' },
  wipedToast: { de: 'Archiv geleert', en: 'Archive wiped' },
  aboutTitleSettings: { de: 'Über die App', en: 'About' },
  aboutText: {
    de: 'つぎ („als Nächstes“) — AniTracker Version 2, entworfen und gebaut von Claude auf Basis von V1. Daten: AniList. Kein Account, kein Tracking, dein Archiv gehört dir.',
    en: 'つぎ (“next”) — AniTracker version 2, designed and built by Claude on the foundation of V1. Data: AniList. No account, no tracking, your archive is yours.',
  },

  // Scan / Toasts
  scanNewSeason: { de: 'Neue Staffel verfügbar: {t}', en: 'New season available: {t}' },
  scanAnnounced: { de: 'Fortsetzung angekündigt: {t}', en: 'Sequel announced: {t}' },
  scanUpdates: { de: '{n} Update(s) gefunden', en: 'Found {n} update(s)' },
  seasonCompleteNext: {
    de: 'Staffel geschafft — weiter mit {t}',
    en: 'Season done — next up: {t}',
  },
  franchiseComplete: { de: 'Franchise abgeschlossen 🎉', en: 'Franchise completed 🎉' },

  // Formate
  fmtTV: { de: 'Serie', en: 'TV' },
  fmtTVShort: { de: 'Kurzserie', en: 'TV short' },
  fmtMovie: { de: 'Film', en: 'Movie' },
  fmtSpecial: { de: 'Special', en: 'Special' },
  fmtOVA: { de: 'OVA', en: 'OVA' },
  fmtONA: { de: 'ONA', en: 'ONA' },
  fmtMusic: { de: 'Musik', en: 'Music' },
  seasonWinter: { de: 'Winter', en: 'Winter' },
  seasonSpring: { de: 'Frühling', en: 'Spring' },
  seasonSummer: { de: 'Sommer', en: 'Summer' },
  seasonFall: { de: 'Herbst', en: 'Fall' },
  episodesN: { de: '{n} Episoden', en: '{n} episodes' },
  ongoing: { de: 'Laufend', en: 'Ongoing' },
} satisfies Record<string, Entry>;

export type DictKey = keyof typeof DICT;

function fill(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

export function translate(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  return fill(DICT[key][lang], vars);
}

/** Übersetzungs-Hook: `const t = useT(); t('navHome')`. */
export function useT() {
  const lang = useSettings((s) => s.lang);
  return useMemo(
    () => (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
}

export function useLocale(): string {
  const lang = useSettings((s) => s.lang);
  return lang === 'de' ? 'de-DE' : 'en-US';
}

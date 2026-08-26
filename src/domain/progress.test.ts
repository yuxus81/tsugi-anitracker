import { describe, expect, test } from 'vitest';
import { countdownParts, seasonNo, seasonPct, seasonProgressLabel } from '@/domain/progress';
import { announcedSeason, entry, season } from '@/test/factories';

/**
 * Abgeleitete Anzeigewerte: Ring, Balken und die Zeile unter jeder Karte.
 * Das sind die Zahlen, die dem Nutzer ins Gesicht springen — hier sind
 * Rundungs- und Nullfehler am sichtbarsten.
 */

describe('seasonPct — wie voll der Ring steht', () => {
  test('halb geschaut ist ein halber Ring', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], progress: 6 });

    expect(seasonPct(e)).toBeCloseTo(0.5);
  });

  test('nichts geschaut ist ein leerer Ring', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], progress: 0 });

    expect(seasonPct(e)).toBe(0);
  });

  test('alles geschaut ist ein voller Ring', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], progress: 12 });

    expect(seasonPct(e)).toBe(1);
  });

  test('bei unbekannter Folgenzahl bleibt der Ring leer statt NaN zu zeichnen', () => {
    // Ein NaN im stroke-dashoffset lässt den Ring komplett verschwinden.
    const e = entry({ seasons: [season({ episodes: null })], progress: 4 });

    expect(seasonPct(e)).toBe(0);
  });

  test('läuft nicht über 100 %, wenn der Fortschritt größer als die Staffel ist', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], progress: 20 });

    expect(seasonPct(e)).toBe(1);
  });

  test('bleibt bei einer Staffel mit 0 Folgen bei 0, statt durch null zu teilen', () => {
    const e = entry({ seasons: [season({ episodes: 0 })], progress: 0 });

    expect(seasonPct(e)).toBe(0);
  });

  test('gibt 0 für einen Eintrag ganz ohne Staffeln', () => {
    expect(seasonPct(entry({ seasons: [] }))).toBe(0);
  });
});

describe('seasonNo — die Staffelnummer, die der Nutzer liest', () => {
  test('zählt ab 1, nicht ab 0', () => {
    const e = entry({ seasons: [season(), season()], seasonIndex: 0 });

    expect(seasonNo(e)).toBe(1);
  });

  test('folgt dem Zeiger', () => {
    const e = entry({ seasons: [season(), season(), season()], seasonIndex: 2 });

    expect(seasonNo(e)).toBe(3);
  });
});

describe('seasonProgressLabel — die Zeile unter der Karte', () => {
  test('nennt Staffel und Stand', () => {
    const e = entry({ seasons: [season({ episodes: 12 })], seasonIndex: 0, progress: 4 });

    expect(seasonProgressLabel(e)).toBe('1 · 4/12');
  });

  test('schreibt ein Fragezeichen statt „null", wenn die Folgenzahl fehlt', () => {
    const e = entry({ seasons: [season({ episodes: null })], progress: 4 });

    expect(seasonProgressLabel(e)).toBe('1 · 4/?');
  });
});

describe('countdownParts — die Wartemarke bei „Fortsetzung folgt"', () => {
  const jetzt = Date.UTC(2026, 7, 26, 12, 0, 0);

  test('rechnet Tage aus', () => {
    const in3Tagen = jetzt / 1000 + 3 * 24 * 3600 + 60;

    expect(countdownParts(in3Tagen, jetzt)).toEqual({ days: 3, hours: 0, minutes: 1 });
  });

  test('rechnet Stunden aus, wenn es weniger als ein Tag ist', () => {
    const in5Stunden = jetzt / 1000 + 5 * 3600;

    expect(countdownParts(in5Stunden, jetzt)).toEqual({ days: 0, hours: 5, minutes: 0 });
  });

  test('rechnet Minuten aus, wenn es gleich losgeht', () => {
    const in20Minuten = jetzt / 1000 + 20 * 60;

    expect(countdownParts(in20Minuten, jetzt)).toEqual({ days: 0, hours: 0, minutes: 20 });
  });

  test('zeigt bei einem vergangenen Termin Null statt negativer Zeit', () => {
    const gestern = jetzt / 1000 - 24 * 3600;

    expect(countdownParts(gestern, jetzt)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  test('gibt null, wenn gar kein Termin bekannt ist', () => {
    expect(countdownParts(null, jetzt)).toBeNull();
  });
});

describe('Zusammenspiel mit angekündigten Staffeln', () => {
  test('eine angekündigte Staffel hat keinen Fortschritt', () => {
    const e = entry({
      seasons: [season({ episodes: 12 }), announcedSeason()],
      seasonIndex: 1,
      progress: 0,
      status: 'continuation',
    });

    expect(seasonPct(e)).toBe(0);
  });
});

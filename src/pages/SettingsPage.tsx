import { useRef, useState } from 'react';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { useToasts } from '@/store/toast';
import { PageTitle, SectionHead } from '@/components/ui';
import { IconDownload, IconTrash, IconUpload } from '@/components/icons';

interface BackupFile {
  app: 'tsugi';
  version: 1;
  exportedAt: string;
  entries: LibraryEntry[];
}

export function SettingsPage() {
  const entries = useLibrary((s) => s.entries);
  const importAll = useLibrary((s) => s.importAll);
  const push = useToasts((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const count = Object.keys(entries).length;

  const doExport = () => {
    const payload: BackupFile = {
      app: 'tsugi',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: Object.values(entries),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tsugi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push('Backup exportiert');
  };

  const doImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (parsed.app !== 'tsugi' || !Array.isArray(parsed.entries)) {
        throw new Error('Kein Tsugi-Backup');
      }
      const valid = parsed.entries.filter(
        (e) => typeof e.mediaId === 'number' && typeof e.title === 'string' && e.status,
      );
      await importAll(valid);
      push(`${valid.length} Einträge importiert`);
    } catch {
      push('Datei konnte nicht gelesen werden — ist das ein Tsugi-Backup?', 'error');
    }
  };

  const doWipe = async () => {
    await importAll([]);
    setConfirmWipe(false);
    push('Archiv geleert');
  };

  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Einstellungen"
        sub="Tsugi ist local-first: Dein Archiv liegt ausschließlich in diesem Browser."
      />

      <section className="mb-9">
        <SectionHead title="Backup" />
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="max-w-[60ch] text-sm leading-6 text-ink-dim">
            Exportiere dein Archiv ({count} {count === 1 ? 'Eintrag' : 'Einträge'}) als
            JSON-Datei — z.&nbsp;B. um es auf ein anderes Gerät zu übertragen oder zu sichern.
            Der Import ersetzt das aktuelle Archiv vollständig.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={doExport}
              disabled={count === 0}
              className="inline-flex items-center gap-2 rounded-ctl bg-jade-deep px-4 py-2.5 text-sm font-semibold text-ink transition-[filter] duration-150 hover:brightness-110 disabled:opacity-40"
            >
              <IconDownload className="h-4 w-4" />
              Exportieren
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-ctl border border-line bg-raised px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-jade"
            >
              <IconUpload className="h-4 w-4" />
              Importieren
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </section>

      <section className="mb-9">
        <SectionHead title="Gefahrenzone" />
        <div className="rounded-card border border-rose/25 bg-surface p-5">
          {confirmWipe ? (
            <>
              <p className="text-sm font-medium text-ink">
                Wirklich alle {count} Einträge unwiderruflich löschen?
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void doWipe()}
                  className="rounded-ctl bg-rose px-4 py-2.5 text-sm font-semibold text-bg transition-[filter] duration-150 hover:brightness-110"
                >
                  Ja, alles löschen
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="rounded-ctl border border-line bg-raised px-4 py-2.5 text-sm font-medium text-ink"
                >
                  Abbrechen
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="max-w-[60ch] text-sm leading-6 text-ink-dim">
                Löscht das komplette Archiv aus diesem Browser. Vorher exportieren lohnt sich.
              </p>
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                disabled={count === 0}
                className="mt-4 inline-flex items-center gap-2 rounded-ctl border border-rose/40 px-4 py-2.5 text-sm font-medium text-rose transition-colors duration-150 hover:bg-rose/10 disabled:opacity-40"
              >
                <IconTrash className="h-4 w-4" />
                Archiv leeren
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <SectionHead title="Über Tsugi" />
        <div className="rounded-card border border-line bg-surface p-5 text-sm leading-6 text-ink-dim">
          <p>
            <span className="font-display text-base text-ink">Tsugi</span> (つぎ, „als
            Nächstes“) ist AniTracker Version 2 — entworfen und gebaut von Claude auf Basis
            der Funktionen von V1. Daten: AniList. Kein Account, kein Tracking, dein Archiv
            gehört dir.
          </p>
        </div>
      </section>
    </div>
  );
}

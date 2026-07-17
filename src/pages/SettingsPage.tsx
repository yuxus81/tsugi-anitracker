import { useRef, useState } from 'react';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { signOut, useAuth } from '@/store/auth';
import { useToasts } from '@/store/toast';
import { PageTitle, SectionHead } from '@/components/ui';
import { useSettings, useT, type Lang } from '@/i18n';
import { IconCheck, IconDownload, IconTrash, IconUpload } from '@/components/icons';

interface BackupFile {
  app: 'tsugi';
  version: 2;
  exportedAt: string;
  entries: LibraryEntry[];
}

export function SettingsPage() {
  const entries = useLibrary((s) => s.entries);
  const importAll = useLibrary((s) => s.importAll);
  const user = useAuth((s) => s.user);
  const push = useToasts((s) => s.push);
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const count = Object.keys(entries).length;

  const doExport = () => {
    const payload: BackupFile = {
      app: 'tsugi',
      version: 2,
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
    push(t('exportedToast'));
  };

  const doImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (parsed.app !== 'tsugi' || !Array.isArray(parsed.entries)) {
        throw new Error('Kein Tsugi-Backup');
      }
      const valid = parsed.entries.filter(
        (e) => typeof e.rootId === 'number' && Array.isArray(e.seasons) && e.status,
      );
      await importAll(valid);
      push(t('importedToast', { n: valid.length }));
    } catch {
      push(t('importError'), 'error');
    }
  };

  const doWipe = async () => {
    await importAll([]);
    setConfirmWipe(false);
    push(t('wipedToast'));
  };

  const LANGS: Array<{ key: Lang; label: string }> = [
    { key: 'de', label: t('languageGerman') },
    { key: 'en', label: t('languageEnglish') },
  ];

  return (
    <div className="max-w-2xl">
      <PageTitle title={t('settingsTitle')} sub={t('settingsSub')} />

      <section className="mb-9">
        <SectionHead title={t('accountTitle')} />
        <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-5">
          <p className="min-w-0 truncate text-sm text-ink-dim">
            {user?.email ? t('authLoggedInAs', { email: user.email }) : ''}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex shrink-0 items-center gap-2 rounded-ctl border border-line bg-raised px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-rose/50 hover:text-rose"
          >
            {t('authLogOut')}
          </button>
        </div>
      </section>

      <section className="mb-9">
        <SectionHead title={t('languageTitle')} />
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('languageTitle')}>
            {LANGS.map(({ key, label }) => {
              const active = key === lang;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLang(key)}
                  className={`inline-flex items-center gap-2 rounded-ctl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-raised text-ink-dim hover:text-ink'
                  }`}
                >
                  {active && <IconCheck className="h-4 w-4" />}
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 max-w-[60ch] text-xs leading-5 text-ink-faint">{t('languageNote')}</p>
        </div>
      </section>

      <section className="mb-9">
        <SectionHead title={t('backupTitle')} />
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="max-w-[60ch] text-sm leading-6 text-ink-dim">
            {t('backupText', { n: count, plural: count === 1 ? t('entryOne') : t('entryMany') })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={doExport}
              disabled={count === 0}
              className="inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg transition-[filter] duration-150 hover:brightness-110 disabled:opacity-40"
            >
              <IconDownload className="h-4 w-4" />
              {t('exportBtn')}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-ctl border border-line bg-raised px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent"
            >
              <IconUpload className="h-4 w-4" />
              {t('importBtn')}
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
        <SectionHead title={t('dangerTitle')} />
        <div className="rounded-card border border-rose/25 bg-surface p-5">
          {confirmWipe ? (
            <>
              <p className="text-sm font-medium text-ink">{t('wipeConfirm', { n: count })}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void doWipe()}
                  className="rounded-ctl bg-rose px-4 py-2.5 text-sm font-semibold text-bg transition-[filter] duration-150 hover:brightness-110"
                >
                  {t('wipeYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="rounded-ctl border border-line bg-raised px-4 py-2.5 text-sm font-medium text-ink"
                >
                  {t('cancel')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="max-w-[60ch] text-sm leading-6 text-ink-dim">{t('dangerText')}</p>
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                disabled={count === 0}
                className="mt-4 inline-flex items-center gap-2 rounded-ctl border border-rose/40 px-4 py-2.5 text-sm font-medium text-rose transition-colors duration-150 hover:bg-rose/10 disabled:opacity-40"
              >
                <IconTrash className="h-4 w-4" />
                {t('wipeBtn')}
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <SectionHead title={t('aboutTitleSettings')} />
        <div className="rounded-card border border-line bg-surface p-5 text-sm leading-6 text-ink-dim">
          <p>
            <span className="font-display text-base text-ink">Tsugi-Anitracker</span> —{' '}
            {t('aboutText')}
          </p>
        </div>
      </section>
    </div>
  );
}

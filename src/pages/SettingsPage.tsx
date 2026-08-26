import { useEffect, useRef, useState } from 'react';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { signOut, useAuth } from '@/store/auth';
import { useToasts } from '@/store/toast';
import { PageTitle } from '@/components/ui';
import { useSettings, useT, type Lang } from '@/i18n';
import { IconCheck, IconDownload, IconTrash, IconUpload } from '@/components/icons';

const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BackupFile {
  app: 'tsugi';
  version: 2;
  exportedAt: string;
  entries: LibraryEntry[];
}

export function SettingsPage() {
  const entries = useLibrary((s) => s.entries);
  const importAll = useLibrary((s) => s.importAll);
  const username = useLibrary((s) => s.username);
  const usernameChangedAt = useLibrary((s) => s.usernameChangedAt);
  const setUsername = useLibrary((s) => s.setUsername);
  const user = useAuth((s) => s.user);
  const push = useToasts((s) => s.push);
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [nameDraft, setNameDraft] = useState(username ?? '');

  useEffect(() => setNameDraft(username ?? ''), [username]);

  const count = Object.keys(entries).length;

  const msSinceNameChange = usernameChangedAt ? Date.now() - usernameChangedAt : Infinity;
  const nameLocked = msSinceNameChange < USERNAME_COOLDOWN_MS;
  const nameLockedDays = nameLocked
    ? Math.max(1, Math.ceil((USERNAME_COOLDOWN_MS - msSinceNameChange) / 86_400_000))
    : 0;

  const saveUsername = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || nameLocked) return;
    setUsername(trimmed);
    push(t('profileSavedToast'));
  };

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
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t('settingsTitle')} sub={t('settingsSub')} />

      {/* Profil */}
      <p className="mb-2 ml-4 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {t('profileTitle')}
      </p>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {nameLocked ? (
          <p className="px-4 py-4 text-sm leading-6 text-ink-dim">
            {t('profileLockedHint', { name: username ?? '', days: nameLockedDays })}
          </p>
        ) : (
          <div className="px-4 py-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-ink-faint">{t('profileLabel')}</span>
              <input
                value={nameDraft}
                maxLength={24}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder={t('profilePlaceholder')}
                className="w-full rounded-ctl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-accent"
              />
            </label>
            <button
              type="button"
              onClick={saveUsername}
              disabled={!nameDraft.trim() || nameDraft.trim() === username}
              className="press mt-3 inline-flex items-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110 disabled:opacity-40"
            >
              <IconCheck className="h-4 w-4" />
              {t('profileSaveBtn')}
            </button>
            {username && <p className="mt-3 text-xs text-ink-faint">{t('profileChangeNote')}</p>}
          </div>
        )}
      </div>

      {/* Konto */}
      <p className="mb-2 ml-4 mt-7 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {t('accountTitle')}
      </p>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="px-4 py-3.5">
          <p className="min-w-0 truncate text-[15px] text-ink">{user?.email ?? ''}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{t('settingsSub')}</p>
        </div>
        <div className="ml-4 h-px bg-line" />
        <button
          type="button"
          onClick={() => void signOut()}
          className="press flex w-full items-center px-4 py-3.5 text-left text-[15px] font-semibold text-rose"
        >
          {t('authLogOut')}
        </button>
      </div>

      {/* Sprache — Segmented Control */}
      <p className="mb-2 ml-4 mt-7 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {t('languageTitle')}
      </p>
      <div
        className="flex gap-1 rounded-ctl border border-white/[0.06] bg-white/[0.05] p-1"
        role="radiogroup"
        aria-label={t('languageTitle')}
      >
        {LANGS.map(({ key, label }) => {
          const active = key === lang;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLang(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[9px] py-2 text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'border border-accent/30 bg-accent/15 text-accent shadow-[0_2px_10px_-2px_rgba(0,245,212,0.4)]'
                  : 'border border-transparent text-ink-dim'
              }`}
            >
              {active && <IconCheck className="h-3.5 w-3.5" />}
              {label}
            </button>
          );
        })}
      </div>
      <p className="ml-4 mt-2 max-w-[60ch] text-xs leading-5 text-ink-faint">{t('languageNote')}</p>

      {/* Backup */}
      <p className="mb-2 ml-4 mt-7 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {t('backupTitle')}
      </p>
      <div className="overflow-hidden rounded-card border border-line bg-surface p-4">
        <p className="text-sm leading-6 text-ink-dim">
          {t('backupText', { n: count, plural: count === 1 ? t('entryOne') : t('entryMany') })}
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={doExport}
            disabled={count === 0}
            className="press inline-flex flex-1 items-center justify-center gap-2 rounded-ctl bg-accent px-4 py-2.5 text-sm font-bold text-bg shadow-glow-accent transition-[filter] duration-150 hover:brightness-110 disabled:opacity-40"
          >
            <IconDownload className="h-4 w-4" />
            {t('exportBtn')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press inline-flex flex-1 items-center justify-center gap-2 rounded-ctl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-ink"
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

      {/* Gefahrenzone */}
      <p className="mb-2 ml-4 mt-7 text-[12px] font-semibold uppercase tracking-wide text-rose/80">
        {t('dangerTitle')}
      </p>
      <div className="overflow-hidden rounded-card border border-rose/25 bg-rose/[0.06] p-4">
        {confirmWipe ? (
          <>
            <p className="text-sm font-medium text-ink">{t('wipeConfirm', { n: count })}</p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => void doWipe()}
                className="press flex-1 rounded-ctl bg-rose px-4 py-2.5 text-sm font-semibold text-bg transition-[filter] duration-150 hover:brightness-110"
              >
                {t('wipeYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="press flex-1 rounded-ctl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-ink"
              >
                {t('cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-ink-dim">{t('dangerText')}</p>
            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              disabled={count === 0}
              className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-ctl border border-rose/40 py-2.5 text-sm font-semibold text-rose transition-colors duration-150 hover:bg-rose/10 disabled:opacity-40"
            >
              <IconTrash className="h-4 w-4" />
              {t('wipeBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

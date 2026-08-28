import { useEffect, useRef, useState } from 'react';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { signOut, useAuth } from '@/store/auth';
import { useToasts } from '@/store/toast';
import { useScreenTone } from '@/store/tone';
import { PageTitle, Btn, Segmented, ConfirmDialog } from '@/components/ui';
import { Icon } from '@/components/icons';
import { useSettings, useT, type Lang } from '@/i18n';

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
  useScreenTone('watching');

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
      if (parsed.app !== 'tsugi' || !Array.isArray(parsed.entries)) throw new Error('Kein Tsugi-Backup');
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
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageTitle title={t('settingsTitle')} sub={t('settingsSubShort')} />

      {/* Profil / Konto */}
      <div className="panel" data-st="watching" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 54,
            height: 54,
            borderRadius: 18,
            background: 'var(--tone-bg)',
            color: 'var(--tone-t)',
            flex: 'none',
          }}
        >
          <Icon name="person" size={26} filled />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em' }}>
            {username ?? user?.email?.split('@')[0]}
          </span>
          <span className="muted" style={{ display: 'block', marginTop: 2 }}>
            {user?.email}
          </span>
        </span>
        <span className="iconbtn iconbtn--sm iconbtn--bare" aria-hidden>
          <Icon name="right" size={17} />
        </span>
      </div>

      <p className="grouptitle">{t('profileLabel')}</p>
      <div className="panel">
        {nameLocked ? (
          <p className="sub">{t('profileLockedHint', { name: username ?? '', days: nameLockedDays })}</p>
        ) : (
          <>
            <input
              value={nameDraft}
              maxLength={24}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t('profilePlaceholder')}
              className="field-input"
              style={{
                width: '100%',
                borderRadius: 'var(--r-1)',
                background: 'var(--bg)',
                boxShadow: 'inset 0 0 0 1px var(--line-2)',
                border: 0,
                color: 'var(--ink)',
                padding: '11px 13px',
                fontSize: 15,
                outline: 'none',
              }}
            />
            <div style={{ marginTop: 12 }}>
              <Btn
                variant="primary"
                ico="check"
                onClick={saveUsername}
                disabled={!nameDraft.trim() || nameDraft.trim() === username}
              >
                {t('profileSaveBtn')}
              </Btn>
            </div>
            {username && (
              <p className="muted" style={{ marginTop: 10 }}>
                {t('profileChangeNote')}
              </p>
            )}
          </>
        )}
      </div>

      {/* Sprache */}
      <p className="grouptitle">{t('languageTitle')}</p>
      <div style={{ maxWidth: 360 }}>
        <Segmented
          items={LANGS.map((l) => ({ key: l.key, label: l.label }))}
          active={lang}
          onPick={(k) => {
            setLang(k);
            push(k === 'de' ? 'Sprache: Deutsch' : 'Language: English');
          }}
        />
      </div>

      {/* Sicherung */}
      <p className="grouptitle">{t('backupTitle')}</p>
      <div className="group">
        <button type="button" className="setrow" data-st="completed" onClick={doExport} disabled={count === 0}>
          <span className="setrow__ico">
            <Icon name="download" size={17} />
          </span>
          <span className="setrow__body">
            <span className="setrow__t" style={{ display: 'block' }}>
              {t('exportBtn')}
            </span>
            <span className="setrow__s" style={{ display: 'block' }}>
              {t('exportRowSub', { n: count })}
            </span>
          </span>
          <Icon name="right" size={16} />
        </button>
        <button type="button" className="setrow" data-st="completed" onClick={() => fileRef.current?.click()}>
          <span className="setrow__ico">
            <Icon name="upload" size={17} />
          </span>
          <span className="setrow__body">
            <span className="setrow__t" style={{ display: 'block' }}>
              {t('importBtn')}
            </span>
            <span className="setrow__s" style={{ display: 'block' }}>
              {t('importRowSub')}
            </span>
          </span>
          <Icon name="right" size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* Gefahrenzone */}
      <p className="grouptitle">{t('dangerTitle')}</p>
      <div className="group" data-st="planned">
        <button
          type="button"
          className="setrow"
          data-st="planned"
          onClick={() => setConfirmWipe(true)}
          disabled={count === 0}
        >
          <span className="setrow__ico">
            <Icon name="trash" size={17} />
          </span>
          <span className="setrow__body">
            <span className="setrow__t" style={{ display: 'block', color: 'var(--pk-t)' }}>
              {t('wipeBtn')}
            </span>
            <span className="setrow__s" style={{ display: 'block' }}>
              {t('dangerText')}
            </span>
          </span>
          <Icon name="right" size={16} />
        </button>
        <button type="button" className="setrow" data-st="planned" onClick={() => void signOut()}>
          <span className="setrow__ico">
            <Icon name="exit" size={17} />
          </span>
          <span className="setrow__body">
            <span className="setrow__t" style={{ display: 'block' }}>
              {t('authLogOut')}
            </span>
            <span className="setrow__s" style={{ display: 'block' }}>
              {user?.email}
            </span>
          </span>
          <Icon name="right" size={16} />
        </button>
      </div>

      <p className="muted" style={{ marginTop: 22, textAlign: 'center' }}>
        Tsugi-Anitracker · V2
      </p>

      {confirmWipe && (
        <ConfirmDialog
          title={t('dangerTitle')}
          message={t('wipeConfirm', { n: count })}
          confirmLabel={t('wipeYes')}
          cancelLabel={t('cancel')}
          onConfirm={() => void doWipe()}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
  );
}

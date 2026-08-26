import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Button, Segmented } from '@/components/kit';
import { ConfirmDialog } from '@/components/overlays';
import { signOut, useAuth } from '@/store/auth';
import { useLibrary, type LibraryEntry } from '@/store/library';
import { useToasts } from '@/store/toast';
import { useSettings, useT, type Lang } from '@/i18n';

/**
 * EINSTELLUNGEN — Konto, Sprache, Sicherung, Gefahrenzone.
 *
 * Die einzige Seite, auf der man Daten unwiderruflich verlieren kann.
 * Deshalb steht die Gefahrenzone ganz unten und allein, und alles darin
 * fragt zurück. Das ist die Anordnung nativer Apps, kein Zufall: was
 * gefährlich ist, soll man suchen müssen.
 */

const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BackupFile {
  app: 'tsugi';
  version: 2;
  exportedAt: string;
  entries: LibraryEntry[];
}

/** Eine Zeile in einer Gruppe: Zeichen, Text, Hinweis, Pfeil. */
function SetRow({
  icon,
  title,
  hint,
  tone,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  hint: string;
  tone: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="setrow"
      data-st={tone}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="setrow__ico" aria-hidden>
        <Icon name={icon} size={17} filled />
      </span>
      <span className="setrow__body">
        <span className={`setrow__t${danger ? ' is-danger' : ''}`}>{title}</span>
        <span className="setrow__s">{hint}</span>
      </span>
      <Icon name="right" size={16} />
    </button>
  );
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
  const [wipeOffen, setWipeOffen] = useState(false);
  const [nameEntwurf, setNameEntwurf] = useState(username ?? '');

  useEffect(() => setNameEntwurf(username ?? ''), [username]);

  const anzahl = Object.keys(entries).length;

  const seitAenderung = usernameChangedAt ? Date.now() - usernameChangedAt : Infinity;
  const nameGesperrt = seitAenderung < USERNAME_COOLDOWN_MS;
  const restTage = nameGesperrt
    ? Math.max(1, Math.ceil((USERNAME_COOLDOWN_MS - seitAenderung) / 86_400_000))
    : 0;

  const nameSpeichern = () => {
    const sauber = nameEntwurf.trim();
    if (!sauber || nameGesperrt) return;
    setUsername(sauber);
    push(t('profileSavedToast'));
  };

  const exportieren = () => {
    const inhalt: BackupFile = {
      app: 'tsugi',
      version: 2,
      exportedAt: new Date().toISOString(),
      entries: Object.values(entries),
    };
    const blob = new Blob([JSON.stringify(inhalt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tsugi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push(t('exportedToast'));
  };

  const einspielen = async (file: File) => {
    try {
      const gelesen = JSON.parse(await file.text()) as BackupFile;
      if (gelesen.app !== 'tsugi' || !Array.isArray(gelesen.entries)) {
        throw new Error('Kein Tsugi-Backup');
      }
      // Nur nehmen, was die Form hat, die der Store erwartet — eine
      // beschädigte Datei darf die Bibliothek nicht vergiften.
      const gueltig = gelesen.entries.filter(
        (e) => typeof e.rootId === 'number' && Array.isArray(e.seasons) && e.status,
      );
      await importAll(gueltig);
      push(t('importedToast', { n: gueltig.length }));
    } catch {
      push(t('importError'), 'error');
    }
  };

  const leeren = async () => {
    await importAll([]);
    setWipeOffen(false);
    push(t('wipedToast'));
  };

  const SPRACHEN: Array<{ key: Lang; label: string }> = [
    { key: 'de', label: t('languageGerman') },
    { key: 'en', label: t('languageEnglish') },
  ];

  return (
    <>
      <header className="pagehead">
        <h1 className="h-large">{t('settingsTitle')}</h1>
        <p className="sub">{t('settingsSub')}</p>
      </header>

      {/* ---- Konto ---------------------------------------------------- */}
      <div className="panel account" data-st="watching">
        <span className="account__ico" aria-hidden>
          <Icon name="person" size={26} filled />
        </span>
        <span className="account__body">
          <span className="account__name">{username ?? t('profilePlaceholder')}</span>
          <span className="muted">{user?.email ?? ''}</span>
        </span>
      </div>

      {/* ---- Profilname ----------------------------------------------- */}
      <p className="grouptitle">{t('profileTitle')}</p>
      <div className="panel">
        {nameGesperrt ? (
          <p className="sub">{t('profileLockedHint', { name: username ?? '', days: restTage })}</p>
        ) : (
          <>
            <label className="field">
              <span className="field__label">{t('profileLabel')}</span>
              <input
                className="field__input"
                value={nameEntwurf}
                maxLength={24}
                placeholder={t('profilePlaceholder')}
                onChange={(e) => setNameEntwurf(e.target.value)}
              />
            </label>
            <div className="field__act">
              <Button
                variant="primary"
                icon="check"
                disabled={!nameEntwurf.trim() || nameEntwurf.trim() === username}
                onClick={nameSpeichern}
              >
                {t('profileSaveBtn')}
              </Button>
            </div>
            {username && <p className="muted field__note">{t('profileChangeNote')}</p>}
          </>
        )}
      </div>

      {/* ---- Sprache --------------------------------------------------- */}
      <p className="grouptitle">{t('languageTitle')}</p>
      {/* Zwei Segmente über die volle Breite sehen auf dem Laptop aus wie ein
          Bedienfehler — hier bleibt der Schalter so breit wie nötig. */}
      <div className="langbar">
        <Segmented
          label={t('languageTitle')}
          value={lang}
          onChange={setLang}
          tone="watching"
          options={SPRACHEN.map(({ key, label }) => ({
            key,
            label,
            icon: 'globe' as const,
          }))}
        />
      </div>
      <p className="muted field__note">{t('languageNote')}</p>

      {/* ---- Sicherung ------------------------------------------------- */}
      <p className="grouptitle">{t('backupTitle')}</p>
      <p className="muted field__note groupnote">
        {t('backupText', { n: anzahl, plural: anzahl === 1 ? t('entryOne') : t('entryMany') })}
      </p>
      <div className="group">
        <SetRow
          icon="download"
          tone="completed"
          title={t('exportBtn')}
          hint={t('exportHint', {
            n: anzahl,
            plural: anzahl === 1 ? t('entryOne') : t('entryMany'),
          })}
          disabled={anzahl === 0}
          onClick={exportieren}
        />
        <SetRow
          icon="upload"
          tone="completed"
          title={t('importBtn')}
          hint={t('importHint')}
          onClick={() => fileRef.current?.click()}
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="visually-hidden"
        // Unsichtbar heißt nicht namenlos: Vorleseprogramme finden das Feld
        // trotzdem, und axe meldet ein Formularfeld ohne Beschriftung als
        // schweren Fehler. Bedient wird es über die Zeile darüber.
        aria-label={t('importBtn')}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void einspielen(f);
          // Zurücksetzen, sonst löst dieselbe Datei ein zweites Mal nichts aus.
          e.target.value = '';
        }}
      />

      {/* ---- Gefahrenzone ---------------------------------------------- */}
      <p className="grouptitle grouptitle--danger">{t('dangerTitle')}</p>
      <p className="muted field__note groupnote">{t('dangerText')}</p>
      <div className="group">
        <SetRow
          icon="trash"
          tone="planned"
          danger
          title={t('wipeBtn')}
          hint={t('wipeHint')}
          disabled={anzahl === 0}
          onClick={() => setWipeOffen(true)}
        />
        <SetRow
          icon="exit"
          tone="planned"
          title={t('authLogOut')}
          hint={user?.email ?? ''}
          onClick={() => void signOut()}
        />
      </div>

      {wipeOffen && (
        <ConfirmDialog
          title={t('wipeBtn')}
          message={t('wipeConfirm', { n: anzahl })}
          confirmLabel={t('wipeYes')}
          onConfirm={() => void leeren()}
          onCancel={() => setWipeOffen(false)}
        />
      )}

      <p className="muted appfoot">Tsugi-Anitracker</p>
    </>
  );
}

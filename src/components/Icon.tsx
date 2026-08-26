import { ICON_NAMES, iconPath, type IconName } from '@/components/iconPaths';

export { ICON_NAMES };
export type { IconName };

interface IconProps {
  name: IconName;
  /** Massive Fassung statt Kontur — der Aktiv-Zustand dieser Version. */
  filled?: boolean;
  size?: number;
  className?: string;
}

/**
 * Ein Zeichen aus dem V5-Satz.
 *
 * Die Pfade kommen als fertiges SVG-Markup aus `iconPaths.ts` und werden
 * über `dangerouslySetInnerHTML` gesetzt. Das ist hier unbedenklich: die
 * Zeichenketten sind fest im Quelltext hinterlegt und stammen nie aus
 * Nutzereingaben oder aus dem Netz.
 */
export function Icon({ name, filled = false, size = 22, className = '' }: IconProps) {
  const { d, solid } = iconPath(name, filled);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`ico ${className}`.trim()}
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={solid ? undefined : 2}
      strokeLinecap={solid ? undefined : 'round'}
      strokeLinejoin={solid ? undefined : 'round'}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

/**
 * Kontur und Füllung übereinander gelegt.
 *
 * Beide Fassungen stehen gleichzeitig im Baum und werden per CSS
 * gegeneinander geblendet — die Füllung schwingt beim Einrasten kurz über.
 * Würde man stattdessen das eine SVG durch das andere ersetzen, gäbe es
 * nichts zu animieren und der Wechsel wäre wieder nur ein Farbsprung.
 */
export function IconPair({
  name,
  active = false,
  size = 24,
}: {
  name: IconName;
  active?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`ico-pair${active ? ' is-on' : ''}`}
      style={{ '--ico-size': `${size}px` } as React.CSSProperties}
    >
      <Icon name={name} size={size} className="ico-o" />
      <Icon name={name} size={size} filled className="ico-f" />
    </span>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentSeason, type LibraryEntry } from '@/store/library';
import { useT } from '@/i18n';
import { Sheet, Btn } from './ui';
import { Card } from './Card';

/**
 * „Für mich entscheiden" — würfelt aus Watchlist + „Noch zu schauen", rollt
 * sichtbar durch die Karten und rastet auf einem Zufallseintrag ein.
 * 1:1 aus design-lab/v5-nativ/app.js `rollRandom()`.
 */
export function RollSheet({ pool, onClose }: { pool: LibraryEntry[]; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * Math.max(1, pool.length)));
  const [landed, setLanded] = useState(false);
  const ticksRef = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 1
      : 14,
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const step = () => {
      setIdx((i) => (i + 1) % pool.length);
      ticksRef.current -= 1;
      if (ticksRef.current > 0) {
        timer.current = window.setTimeout(step, 60 + (14 - ticksRef.current) * 16);
      } else {
        setLanded(true);
      }
    };
    timer.current = window.setTimeout(step, 60);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const again = () => {
    ticksRef.current = 10;
    setLanded(false);
    const step = () => {
      setIdx((i) => (i + 1) % pool.length);
      ticksRef.current -= 1;
      if (ticksRef.current > 0) {
        timer.current = window.setTimeout(step, 60 + (14 - ticksRef.current) * 16);
      } else {
        setLanded(true);
      }
    };
    timer.current = window.setTimeout(step, 60);
  };

  const picked = pool[idx % pool.length];

  return (
    <Sheet title={t('randomPickBtn')} onClose={onClose}>
      <div style={{ minHeight: 210, display: 'grid', placeItems: 'center' }}>
        {picked && (
          <div style={{ width: 150 }} className={landed ? 'pop-in' : undefined}>
            <Card entry={picked} />
          </div>
        )}
      </div>
      {landed && picked && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn variant="quiet" ico="dice" filled={false} wide onClick={again}>
            {t('rollAgain')}
          </Btn>
          <Btn
            variant="primary"
            ico="play"
            wide
            onClick={() => {
              onClose();
              navigate(`/anime/${currentSeason(picked)?.id ?? picked.rootId}`);
            }}
          >
            {t('randomPickCta')}
          </Btn>
        </div>
      )}
    </Sheet>
  );
}

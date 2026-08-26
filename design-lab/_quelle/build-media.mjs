import fs from 'node:fs/promises';
import path from 'node:path';
const LAB = new URL('..', import.meta.url).pathname;
const a = JSON.parse(await fs.readFile(path.join(LAB, '_quelle', '_raw.json'), 'utf8'));
const b = JSON.parse(await fs.readFile(path.join(LAB, '_quelle', '_raw2.json'), 'utf8'));
const all = [...a, ...b.found, ...b.releasing, ...b.upcoming, ...b.trending, ...b.top, ...b.movies];

const covers = new Set(await fs.readdir(path.join(LAB, 'assets', 'covers')));
const banners = new Set(await fs.readdir(path.join(LAB, 'assets', 'banners')));

const map = new Map();
for (const m of all) {
  if (map.has(m.id)) continue;
  const clean = (m.description || '')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/\(Source:[^)]*\)/gi, '').replace(/\s+/g, ' ').trim().slice(0, 460);
  map.set(m.id, {
    id: m.id,
    title: m.title.english || m.title.romaji,
    romaji: m.title.romaji,
    cover: covers.has(`${m.id}.jpg`) ? `../assets/covers/${m.id}.jpg` : null,
    banner: banners.has(`${m.id}.jpg`) ? `../assets/banners/${m.id}.jpg` : null,
    color: m.coverImage.color || '#3a3a44',
    format: m.format,
    airStatus: m.status,
    episodes: m.episodes,
    duration: m.duration,
    score: m.averageScore,
    season: m.season,
    seasonYear: m.seasonYear,
    genres: m.genres || [],
    startDate: m.startDate,
    nextAiring: m.nextAiringEpisode || null,
    studio: m.studios?.nodes?.find(s => s.isAnimationStudio)?.name || m.studios?.nodes?.[0]?.name || null,
    synopsis: clean,
  });
}
const arr = [...map.values()].sort((x, y) => x.id - y.id);
const out = `/* AUTO-GENERIERT aus AniList (${new Date().toISOString().slice(0,10)}) — nicht von Hand pflegen.
   Bilder liegen lokal unter assets/covers bzw. assets/banners; keine externen Requests. */
export const MEDIA = ${JSON.stringify(Object.fromEntries(arr.map(m => [m.id, m])), null, 1)};
export const M = (id) => MEDIA[id];
`;
await fs.writeFile(path.join(LAB, 'shared', 'media.js'), out);
console.log('media.js:', arr.length, 'records,', (out.length / 1024).toFixed(0), 'KB');
console.log('no-cover:', arr.filter(m => !m.cover).map(m => m.id).join(',') || 'none');

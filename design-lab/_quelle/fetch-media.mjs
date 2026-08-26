import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = new URL('..', import.meta.url).pathname;

const IDS = [
  154587, 162804,            // Frieren S1, (Frieren sequel placeholder)
  113415, 145064,            // Jujutsu Kaisen S1, S2
  16498, 25777, 99147, 110277, // AoT S1-S4
  127230,                    // Chainsaw Man
  140960, 158927,            // Spy x Family S1, S2
  101922, 142329, 145139,    // Demon Slayer S1, S2(Mugen train arc), Entertainment district
  21087, 97668,              // One Punch Man S1, S2
  101348, 116147,            // Vinland Saga S1, S2
  21507, 90070,              // Mob Psycho S1, S2
  137761,                    // Cyberpunk Edgerunners
  130003,                    // Bocchi the Rock
  150672, 166531,            // Oshi no Ko S1, S2
  171018,                    // Dandadan
  151807, 176496,            // Solo Leveling S1, S2
  161645,                    // Apothecary Diaries
  9253,                      // Steins;Gate
  5114,                      // FMA Brotherhood
  21519,                     // Kimi no Na wa
  20954,                     // Koe no Katachi
  21827,                     // Violet Evergarden
  34599,                     // Made in Abyss
  101921,                    // Kaguya-sama
  21355,                     // Re:Zero
  11061,                     // HxH
  163132,                    // Wind Breaker
  178025,                    // Blue Box? (fallback)
];

const QUERY = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      title { romaji english }
      coverImage { extraLarge large color }
      bannerImage
      format status episodes duration averageScore
      season seasonYear genres isAdult
      startDate { year month day }
      nextAiringEpisode { episode airingAt }
      studios(isMain: true) { nodes { name isAnimationStudio } }
      description(asHtml: false)
    }
  }
}`;

const res = await fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ query: QUERY, variables: { ids: IDS } }),
});
const json = await res.json();
if (json.errors) { console.error(JSON.stringify(json.errors, null, 2)); process.exit(1); }
const media = json.data.Page.media;
console.log('got', media.length, 'media');

await fs.writeFile(path.join(OUT, 'shared', '_raw.json'), JSON.stringify(media, null, 2));

async function dl(url, file) {
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) { console.warn('FAIL', url, r.status); return null; }
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(file, buf);
  return path.basename(file);
}

for (const m of media) {
  const cu = m.coverImage.extraLarge || m.coverImage.large;
  await dl(cu, path.join(OUT, 'assets', 'covers', `${m.id}.jpg`));
  if (m.bannerImage) await dl(m.bannerImage, path.join(OUT, 'assets', 'banners', `${m.id}.jpg`));
}
console.log('downloads done');

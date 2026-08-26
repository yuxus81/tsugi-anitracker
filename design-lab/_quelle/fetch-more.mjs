import fs from 'node:fs/promises';
import path from 'node:path';
const OUT = new URL('..', import.meta.url).pathname;
const F = `id title{romaji english} coverImage{extraLarge large color} bannerImage format status episodes duration averageScore season seasonYear genres isAdult startDate{year month day} nextAiringEpisode{episode airingAt} studios(isMain:true){nodes{name isAnimationStudio}} description(asHtml:false)`;

async function gql(query, variables) {
  const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) { console.error(JSON.stringify(j.errors)); process.exit(1); }
  return j.data;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const searches = ['Attack on Titan Season 2','Mob Psycho 100 II','Made in Abyss','Cyberpunk Edgerunners','Vinland Saga Season 2','Blue Lock','Wind Breaker','Sakamoto Days','Frieren Season 2','Chainsaw Man Reze'];
const found = [];
for (const s of searches) {
  const d = await gql(`query($s:String){Media(search:$s,type:ANIME){${F}}}`, { s });
  if (d.Media) { found.push(d.Media); console.log('search', s, '->', d.Media.id, d.Media.title.english || d.Media.title.romaji, d.Media.status); }
  await sleep(700);
}

const releasing = await gql(`query{Page(perPage:14){media(status:RELEASING,type:ANIME,sort:POPULARITY_DESC,isAdult:false){${F}}}}`);
await sleep(700);
const upcoming = await gql(`query{Page(perPage:14){media(status:NOT_YET_RELEASED,type:ANIME,sort:POPULARITY_DESC,isAdult:false){${F}}}}`);
await sleep(700);
const trending = await gql(`query{Page(perPage:14){media(sort:TRENDING_DESC,type:ANIME,isAdult:false){${F}}}}`);
await sleep(700);
const top = await gql(`query{Page(perPage:14){media(sort:SCORE_DESC,type:ANIME,isAdult:false){${F}}}}`);
await sleep(700);
const movies = await gql(`query{Page(perPage:14){media(sort:POPULARITY_DESC,type:ANIME,format:MOVIE,isAdult:false){${F}}}}`);

const extra = { found, releasing: releasing.Page.media, upcoming: upcoming.Page.media, trending: trending.Page.media, top: top.Page.media, movies: movies.Page.media };
await fs.writeFile(path.join(OUT, 'shared', '_raw2.json'), JSON.stringify(extra, null, 2));

const all = [...found, ...extra.releasing, ...extra.upcoming, ...extra.trending, ...extra.top, ...extra.movies];
const seen = new Set();
for (const m of all) {
  if (seen.has(m.id)) continue; seen.add(m.id);
  const cu = m.coverImage.extraLarge || m.coverImage.large;
  const cf = path.join(OUT, 'assets', 'covers', `${m.id}.jpg`);
  try { await fs.access(cf); } catch { const r = await fetch(cu); if (r.ok) await fs.writeFile(cf, Buffer.from(await r.arrayBuffer())); }
  if (m.bannerImage) {
    const bf = path.join(OUT, 'assets', 'banners', `${m.id}.jpg`);
    try { await fs.access(bf); } catch { const r = await fetch(m.bannerImage); if (r.ok) await fs.writeFile(bf, Buffer.from(await r.arrayBuffer())); }
  }
}
console.log('total unique extra media:', seen.size);

import fs from 'node:fs/promises';
import path from 'node:path';
const OUT = new URL('../assets/fonts', import.meta.url).pathname;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const FAMS = [
  { slug: 'bricolage', spec: 'Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800' },
  { slug: 'archivo',   spec: 'Archivo:wght@400;500;600;700' },
  { slug: 'chivo',     spec: 'Chivo:wght@700;800;900' },
  { slug: 'plexsans',  spec: 'IBM+Plex+Sans:wght@400;500;600;700' },
  { slug: 'plexmono',  spec: 'IBM+Plex+Mono:wght@400;500;600;700' },
  { slug: 'instserif', spec: 'Instrument+Serif:ital@0;1' },
  { slug: 'instsans',  spec: 'Instrument+Sans:wght@400;500;600;700' },
  { slug: 'spacegro',  spec: 'Space+Grotesk:wght@400;500;600;700' },
  { slug: 'outfit',    spec: 'Outfit:wght@300;400;500;600;700' },
  { slug: 'jbmono',    spec: 'JetBrains+Mono:wght@400;500;700' },
];

const LATIN = /U\+0000-00FF|U\+0100-02(AF|BA)|U\+0301|U\+0100-024F/;

for (const { slug, spec } of FAMS) {
  const url = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const css = await r.text();
  const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b.split('}\n')[0] + '}');
  let outCss = '';
  let n = 0;
  for (const b of blocks) {
    const ur = /unicode-range:\s*([^;]+);/.exec(b)?.[1] ?? '';
    if (!LATIN.test(ur)) continue; // latin + latin-ext only
    const src = /src:\s*url\((https:[^)]+)\)/.exec(b);
    if (!src) continue;
    const fam = /font-family:\s*'([^']+)'/.exec(b)[1];
    const wt = /font-weight:\s*([^;]+);/.exec(b)?.[1].trim() ?? '400';
    const st = /font-style:\s*([^;]+);/.exec(b)?.[1].trim() ?? 'normal';
    const file = `${slug}-${wt.replace(/\s+/g, '_')}-${st}-${n++}.woff2`;
    const fr = await fetch(src[1], { headers: { 'User-Agent': UA } });
    await fs.writeFile(path.join(OUT, file), Buffer.from(await fr.arrayBuffer()));
    outCss += `@font-face{font-family:'${fam}';font-style:${st};font-weight:${wt};font-display:swap;src:url('./${file}') format('woff2');unicode-range:${ur};}\n`;
  }
  await fs.writeFile(path.join(OUT, `${slug}.css`), outCss);
  console.log(slug, '->', n, 'faces');
}

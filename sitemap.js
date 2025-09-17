// tools/sitemap.js
// Build sitemap.xml from series.json + episode-data/*.json
// Run locally: node tools/sitemap.js

const fs = require('fs');
const path = require('path');

const SITE = 'https://www.smtvurdu.site'; // change if staging or custom domain
const ROOT = process.cwd();
const SERIES_FILE = path.join(ROOT, 'series.json');
const EP_DIR = path.join(ROOT, 'episode-data');
const OUT = path.join(ROOT, 'sitemap.xml');

const iso = d => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

function url(loc, { lastmod, changefreq, priority } = {}) {
  const lines = ['  <url>', `    <loc>${loc}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  lines.push('  </url>');
  return lines.join('
');
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

(function build() {
  const urls = [];

  // 1) Base pages (keep lastmod fresh)
  const now = iso(new Date());
  urls.push(url(`${SITE}/index.html`, { lastmod: now, changefreq: 'daily', priority: '1.0' }));
  urls.push(url(`${SITE}/series.html`, { lastmod: now, changefreq: 'daily', priority: '0.9' }));
  // If there are dedicated static season pages, list them here similarly.

  // 2) Series landing URLs with ?series=
  const seriesList = readJson(SERIES_FILE) || [];
  for (const s of seriesList) {
    if (!s || !s.slug) continue;
    const loc = `${SITE}/series.html?series=${encodeURIComponent(s.slug)}`;
    urls.push(url(loc, { lastmod: now, changefreq: 'daily', priority: '0.8' }));
  }

  // 3) Episodes from episode-data/*.json
  if (!fs.existsSync(EP_DIR)) fs.mkdirSync(EP_DIR, { recursive: true });
  const files = fs.readdirSync(EP_DIR).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const m = f.match(/^(.*?)(?:-s(d+))?.json$/);
    if (!m) continue;
    const slug = m[1];
    const season = m[2] || null;

    const full = path.join(EP_DIR, f);
    const arr = readJson(full);
    if (!Array.isArray(arr)) continue;

    const stat = fs.statSync(full);
    const fileLastmod = iso(stat.mtime);

    for (const ep of arr) {
      if (ep == null || typeof ep.ep === 'undefined') continue;
      const qs = new URLSearchParams({
        series: slug,
        ...(season ? { season } : {}),
        ep: String(ep.ep)
      }).toString();
      const loc = `${SITE}/episode.html?${qs}`;
      const lastmod = ep.updatedAt || ep.lastmod || fileLastmod;
      urls.push(url(loc, { lastmod, changefreq: 'weekly', priority: '0.6' }));
    }
  }

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('
')}
</urlset>
`;
  fs.writeFileSync(OUT, xml, 'utf8');
  console.log(`sitemap.xml written with ${urls.length} URLs`);
})();

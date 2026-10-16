/* Comprobación posterior al build: enlaces internos, páginas requeridas, cuadros visibles, ausencia de datos privados y secretos. */
const fs = require('node:fs');
const path = require('node:path');
const D = JSON.parse(fs.readFileSync('data/zcp-audit.json', 'utf8'));
const errors = [];
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.name.startsWith('.') || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk('.');
const html = files.filter(f => f.endsWith('.html'));
const exists = route => { const clean = decodeURI(route.split('#')[0].split('?')[0]); if (clean === '/' ) return true; const p = clean.slice(1).replace(/\/$/, ''); return fs.existsSync(p) && fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html')) || fs.existsSync(p + '.html'); };
let links = 0;
for (const f of html) {
  const s = fs.readFileSync(f, 'utf8');
  for (const [, href] of s.matchAll(/(?:href|src)="(\/[^"]*)"/g)) { links++; if (!href.startsWith('//') && !exists(href)) errors.push(`broken link ${href} in ${f}`); }
  if (/main\.js\?v=r39zcp/.test(s)) errors.push('stale main.js version in ' + f);
}
const required = ['index.html', 'historico/index.html', 'metodologia/index.html', 'rendimiento/index.html', 'resultados/index.html', ...D.prerace.map(p => `reuniones/${p.slug}/index.html`), ...D.meetings.map(m => `resultados/${m.slug}/index.html`)];
for (const r of required) if (!fs.existsSync(r)) errors.push('missing page ' + r);
// pronósticos previos: estado, sello, cuadros y caballos
for (const p of D.prerace) {
  const s = fs.readFileSync(`reuniones/${p.slug}/index.html`, 'utf8');
  for (const must of ['PRONÓSTICO PREVIO', 'AWAITING_OFFICIAL_EVIDENCE', 'PUBLICADO ANTES DE LA JORNADA', 'VER EVIDENCIA', 'data-static="zcp"']) if (!s.includes(must)) errors.push(`${p.slug} lacks ${must}`);
  for (const t of p.tickets) { const tot = String(t.current.combinations).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); const cost = 'Bs ' + String(t.current.cost_bs).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); if (!s.includes(`${tot} <span>combinaciones</span>`) || !s.includes(cost)) errors.push(`${p.slug} ${t.type} totals not rendered`); t.current.legs.forEach((l, i) => { if (!s.includes(`<span>V${i + 1}</span>${l.join(' - ')}</li>`)) errors.push(`${p.slug} ${t.type} V${i + 1} leg not rendered`); }); }
  for (const r of p.races) for (const h of r.horses) if (!s.includes(h.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;'))) errors.push(`${p.slug} missing horse ${h.name}`);
  if (/Ganador oficial|GANÓ|✓/.test(s.replace(/<header[\s\S]*?<\/header>/, ''))) errors.push(`${p.slug} shows a result before racing`);
}
// datos privados, borradores y secretos
const PRIVATE = [/COUNTERFACTUAL/i, /frozen\/b1/i, /REVISION_1/i, /B_SHA256/, /B privado/i, /797ffffcc943/, /0fe39dc10290/];
const SECRET = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, /\bsk-[A-Za-z0-9]{20,}\b/, /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, /api[_-]?key\s*[:=]\s*["'][^"']{12,}/i, /DATABENTO|INFISICAL_TOKEN/];
for (const f of files.filter(f => /\.(html|js|cjs|json|css|xml|txt|md)$/.test(f) && !f.includes('package-lock') && f !== 'scripts/check-zcp-site.cjs')) {
  const s = fs.readFileSync(f, 'utf8');
  if (!f.startsWith('scripts/') && !f.startsWith('tests/')) for (const re of PRIVATE) if (re.test(s)) errors.push(`private marker ${re} in ${f}`);
  for (const re of SECRET) if (re.test(s)) errors.push(`possible secret ${re} in ${f}`);
}
for (const f of files) if (/(^|\/)\.env|\.pem$|\.key$|_B_COUNTERFACTUAL|SRC-(VAL|RIN)-.*\.txt$/.test(f)) errors.push('private file in site: ' + f);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ZCP site check OK · ${html.length} HTML · ${links} internal links · 0 private markers`);

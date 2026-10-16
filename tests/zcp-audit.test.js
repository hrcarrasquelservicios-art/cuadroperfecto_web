/* Historial auditable: datos, cuadros del pronóstico A, ausencia de la versión privada y corrección del importador. */
const assert = require('node:assert');
const fs = require('node:fs');
const {validateAudit} = require('../scripts/zcp-audit-validate.cjs');
const D = JSON.parse(fs.readFileSync('data/zcp-audit.json', 'utf8'));
const clone = () => JSON.parse(JSON.stringify(D));

assert.ok(validateAudit(D));

// los cuadros del pronóstico A no pueden cambiar
let bad = clone(); bad.prerace[0].tickets[2].current.legs[4].push(7);
assert.throws(() => validateAudit(bad), /ticket math|withdrawn|ticket horse/);
bad = clone(); bad.prerace[1].tickets[1].current.cost_bs = 6700;
assert.throws(() => validateAudit(bad), /ticket math/);
bad = clone(); bad.prerace[0].DATASET_SHA256 = '0'.repeat(64);
assert.throws(() => validateAudit(bad), /A hashes/);
// la versión experimental privada nunca entra al dataset público
bad = clone(); bad.prerace[0].note = 'PRIVATE_COUNTERFACTUAL_B';
assert.throws(() => validateAudit(bad), /private counterfactual/);
// el denominador del top-3 es explícito
bad = clone(); bad.race_metrics.pop();
assert.throws(() => validateAudit(bad), /metric totals/);
// 04/10: la canónica es Telegram 2669
bad = clone(); bad.meetings.find(m => m.id === 'RIN-R39-2026-10-04').pre_race.published_at = '2026-10-02T18:14:29Z';
assert.throws(() => validateAudit(bad), /2669/);

// Totales exigidos por el dueño
const t = id => Object.fromEntries(D.prerace.find(p => p.id === id).tickets.map(x => [x.type, [x.current.combinations, x.current.cost_bs]]));
assert.deepStrictEqual(t('VAL-R26-2026-10-17'), {ECONOMICA: [16, 560], EQUILIBRADA: [216, 7560], BLINDADA: [576, 20160]});
assert.deepStrictEqual(t('RIN-R41-2026-10-18'), {ECONOMICA: [12, 420], EQUILIBRADA: [192, 6720], BLINDADA: [960, 33600]});
// Roma #3: retiro mostrado sin fusionar identidades
const roma = D.prerace.find(p => p.id === 'RIN-R41-2026-10-18').withdrawals.find(w => w.race === 4);
assert.strictEqual(roma.identity, 'UNRESOLVED'); assert.strictEqual(roma.name, null);

// Importador (C-2026-003): ninguna carrera con selecciones puede quedar sin primera selección visible
const main = fs.readFileSync('js/main.js', 'utf8');
assert.ok(main.includes("r.horses.find(h=>h.role==='FAVORITO_ZCP') || r.horses.find(h=>h.role==='SORPRESA')"));
const pick = r => r.horses.find(h => h.role === 'FAVORITO_ZCP') || r.horses.find(h => h.role === 'SORPRESA');
const all = [...JSON.parse(fs.readFileSync('data/meetings.json', 'utf8')).meetings, ...JSON.parse(fs.readFileSync('data/legacy-meetings.json', 'utf8')).meetings];
for (const slug of ['historial-rinconada-06sep', 'la-rinconada-reunion-37-20-septiembre-2026']) {
  const m = all.find(x => x.slug === slug); assert.ok(m, slug);
  const bombRaces = m.races.filter(r => r.horses.length && !r.horses.some(h => h.role === 'FAVORITO_ZCP'));
  assert.ok(bombRaces.length > 0, 'fixture must contain bomba-led races: ' + slug);
  for (const r of m.races.filter(x => x.horses.length)) assert.ok(pick(r), `${slug} ${r.public_label} would show «Favorito pendiente»`);
  for (const r of bombRaces) assert.strictEqual(pick(r).role, 'SORPRESA');
}
console.log('zcp-audit tests passed');

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
assert.deepStrictEqual(t('VAL-R27-2026-10-31'), {ECONOMICA: [729, 36450], EQUILIBRADA: [1728, 86400], BLINDADA: [3840, 192000]});
// C-2026-006: el costo publicado (Bs 35) se conserva y la corrección queda registrada
assert.deepStrictEqual(D.prerace.find(p => p.id === 'VAL-R27-2026-10-31').tickets.map(x => [x.published.cost_bs, x.published_unit_bs, x.cost_correction]), [[25515, 35, 'C-2026-006'], [60480, 35, 'C-2026-006'], [134400, 35, 'C-2026-006']]);
assert.ok(D.corrections.some(c => c.id === 'C-2026-006'));
assert.deepStrictEqual(t('RIN-R43-2026-11-01'), {ECONOMICA: [729, 36450], EQUILIBRADA: [1296, 64800], BLINDADA: [2880, 144000]});
const r43 = D.prerace.find(p => p.id === 'RIN-R43-2026-11-01');
for (const tk of r43.tickets) tk.current.legs.forEach((leg, i) => { const ranked = r43.races.find(r => r.valid_leg === i + 1).horses.filter(h => h.rank).sort((a, b) => a.rank - b.rank).map(h => h.number); assert.deepStrictEqual(leg, ranked.slice(0, leg.length), `R43 ${tk.type} V${i + 1}`); });
assert.deepStrictEqual(r43.withdrawals.map(w => [w.race, w.number]), [[3, 6], [11, 7], [13, 9]]);
for (const w of r43.withdrawals) { const leg = r43.races.find(r => r.race === w.race).valid_leg; if (leg) assert.ok(!r43.tickets.some(tk => tk.current.legs[leg - 1].includes(w.number)), `retirado C${w.race} #${w.number} en un cuadro`); }
// Valencia R27: cada cuadro toma las primeras N selecciones de cada válida (sin caballos fuera de la lista publicada)
const r27 = D.prerace.find(p => p.id === 'VAL-R27-2026-10-31');
for (const tk of r27.tickets) tk.current.legs.forEach((leg, i) => { const ranked = r27.races.find(r => r.valid_leg === i + 1).horses.filter(h => h.rank).sort((a, b) => a.rank - b.rank).map(h => h.number); assert.deepStrictEqual(leg, ranked.slice(0, leg.length), `${tk.type} V${i + 1}`); });
assert.strictEqual(r27.status, 'AWAITING_OFFICIAL_EVIDENCE');
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

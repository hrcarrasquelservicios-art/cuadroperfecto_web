/* Validación del historial auditable. Cualquier fallo detiene el build: no se publica nada inconsistente. */
const UNIT = 35;
// Totales del pronóstico oficial A tras los retiros confirmados (orden del dueño 16/10/2026).
const EXPECTED_PRERACE = {
  'VAL-R26-2026-10-17': {DATASET_SHA256: '894051ec0e4a52936ec6308d7379b95e46f45865b8dbb29ef9b216d688243633', SOURCE_SHA256: 'da0be129d715c9e91d46b4f49bfc49c138ffdfc8559145e85d89fa31c7dacecc',
    ECONOMICA: [16, 560, '8-7 / 7 / 7-6 / 7 / 6-4 / 3-6'], EQUILIBRADA: [216, 7560, '8-7 / 7-8 / 7-6-2 / 7-4 / 6-4-5 / 3-6-7'], BLINDADA: [576, 20160, '8-7-3 / 7-8 / 7-6-2-4 / 7-4 / 6-4-5 / 3-6-7-5']},
  'RIN-R41-2026-10-18': {DATASET_SHA256: '002f69e6c8cff3aaf20708040ad91eed5af1a096bff604178483773bb5b84e0c', SOURCE_SHA256: '2566b5c8250a15fa985734c2e1b3bd1f5e958f324787569e9cf4ce09863d1aa9',
    ECONOMICA: [12, 420, '1-6 / 10-1 / 3 / 7 / 2 / 9-6-12'], EQUILIBRADA: [192, 6720, '1-6 / 10-1-5 / 3-4 / 7-1 / 2-4 / 9-6-12-13'], BLINDADA: [960, 33600, '1-6-9-4 / 10-1-5-6 / 3-4 / 7-1 / 2-4-8 / 9-6-12-13-4']}
};
const B_MARKERS = [/COUNTERFACTUAL/i, /frozen\/b1/i, /REVISION_1/i, /B_SHA256/, /B privado/i, /PRIVATE_/];
const STATUSES = ['VERIFIED', 'PARTIAL', 'AWAITING_OFFICIAL_EVIDENCE', 'NEEDS_EVIDENCE'];
const product = legs => legs.reduce((n, l) => n * l.length, 1);
const ratio = (w, n) => ({w, n});
function fail(msg) { throw new Error('ZCP audit validation: ' + msg); }

function validateAudit(D) {
  const blob = JSON.stringify(D);
  for (const re of B_MARKERS) if (re.test(blob)) fail('private counterfactual marker present: ' + re);
  for (const m of [...D.meetings, ...D.needs_evidence, ...D.prerace]) if (!STATUSES.includes(m.status)) fail('bad status ' + m.status);
  // pre-race A
  if (D.prerace.length !== 2) fail('expected 2 pre-race meetings');
  for (const p of D.prerace) {
    const E = EXPECTED_PRERACE[p.id]; if (!E) fail('unexpected pre-race ' + p.id);
    if (p.status !== 'AWAITING_OFFICIAL_EVIDENCE') fail('pre-race status must be AWAITING_OFFICIAL_EVIDENCE');
    if (p.DATASET_SHA256 !== E.DATASET_SHA256 || p.SOURCE_SHA256 !== E.SOURCE_SHA256) fail('A hashes differ from frozen evidence ' + p.id);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(p.SOURCE_PUBLISHED_AT) || Date.parse(p.SOURCE_PUBLISHED_AT) >= Date.parse(p.first_post_utc)) fail('publication must precede first race ' + p.id);
    for (const t of p.tickets) {
      const [c, cost, line] = E[t.type];
      if (t.current.legs.length !== 6 || t.current.legs.some(l => !l.length || new Set(l).size !== l.length)) fail('malformed ticket ' + p.id + ' ' + t.type);
      if (product(t.current.legs) !== c || t.current.combinations !== c || t.current.cost_bs !== cost || c * UNIT !== cost || t.current.line !== line) fail(`ticket math ${p.id} ${t.type}`);
      if (product(t.published.legs) !== t.published.combinations || t.published.combinations * UNIT !== t.published.cost_bs) fail('published ticket math ' + t.type);
      if (t.withdrawal_adjusted !== (t.published.combinations !== t.current.combinations)) fail('adjustment flag ' + t.type);
      // every ticket number must be a horse of that race in A and not withdrawn
      t.current.legs.forEach((leg, i) => { const race = p.races.find(r => r.valid_leg === i + 1); for (const n of leg) { const h = race && race.horses.find(x => x.number === n); if (!h) fail(`ticket horse #${n} V${i + 1} missing in A ${p.id}`); if (h.withdrawn) fail(`withdrawn horse #${n} in ticket ${p.id}`); } });
    }
    if (p.races.some(r => !r.horses.length || r.horses.some(h => !h.name || !Number.isInteger(h.number)))) fail('missing horse data ' + p.id);
    if (p.races.filter(r => r.valid_leg).length !== 6) fail('6 valid legs required ' + p.id);
  }
  // historical
  for (const m of D.meetings) {
    const sel = m.races.filter(r => r.selections.length);
    const c = k => sel.filter(r => r[k]).length;
    if (m.races_evaluated !== sel.length) fail('races_evaluated ' + m.id);
    if (sel.length) for (const k of ['first', 'top3', 'expanded']) if (m[k === 'first' ? 'first_pick' : k].w !== c(k) || m[k === 'first' ? 'first_pick' : k].n !== sel.length) fail(`${k} ${m.id}`);
    for (const t of m.tickets) {
      if (product(t.legs) !== t.combinations) fail('ticket combinations ' + m.id + ' ' + t.name);
      if (t.cost_bs !== null && t.cost_bs !== t.combinations * UNIT) fail('ticket cost ' + m.id);
      const valid = m.races.filter(r => r.valid);
      const hits = valid.filter((r, i) => r.winner !== null && t.legs[i].includes(r.winner)).length;
      if (hits !== t.hits) fail('ticket hits ' + m.id + ' ' + t.name);
    }
    if (m.status === 'VERIFIED' && !(m.pre_race.published_at && m.pre_race.text_sha256)) fail('VERIFIED needs timestamp + hash ' + m.id);
  }
  const R = D.race_metrics, T = D.metric_universe.totals;
  const s = k => R.reduce((n, r) => n + Number(r[k]), 0);
  if (R.length !== T.races || s('top3') !== T.top3 || s('first') !== T.first || s('expanded') !== T.expanded || s('bomba_w') !== T.bomba_w || s('bomba_n') !== T.bomba_n) fail('metric totals');
  if (T.top3 !== 34 || T.races !== 58) fail('top-3 universe must be 34/58');
  if (new Set(R.map(r => r.version)).size > 1 && D.metric_universe.label !== 'MULTI-VERSION HISTORICAL') fail('multi-version label');
  const ids = new Set(D.corrections.map(c => c.id));
  for (const id of ['C-2026-001', 'C-2026-002', 'C-2026-003', 'C-2026-004', 'C-2026-005']) if (!ids.has(id)) fail('missing correction ' + id);
  const r39 = D.meetings.find(m => m.id === 'RIN-R39-2026-10-04');
  if (!/2669/.test(r39.pre_race.evidence) || r39.pre_race.published_at !== '2026-10-02T18:25:09Z') fail('04/10 canonical must be Telegram 2669');
  const r37 = D.meetings.find(m => m.id === 'RIN-R37-2026-09-20').tickets.find(t => t.name === 'Recomendada');
  if (r37.combinations !== 288 || r37.published_combinations !== 192 || !r37.combinations_correction) fail('20/09 288 correction');
  return true;
}
module.exports = {validateAudit, EXPECTED_PRERACE, B_MARKERS, ratio};

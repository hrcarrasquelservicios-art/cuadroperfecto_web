const assert = require('node:assert/strict');
const fs = require('node:fs');
const current = JSON.parse(fs.readFileSync('data/meetings.json', 'utf8'));
const historical = JSON.parse(fs.readFileSync('data/legacy-meetings.json', 'utf8'));
const {hashAnalysis, validateFrozenSnapshot} = require('../scripts/snapshot-integrity.cjs');
const {selectCurrentMeeting} = require('../js/meeting-selection.js');
const snapshots = JSON.parse(fs.readFileSync('data/analysis-snapshots.json', 'utf8')).snapshots;
const combinations = legs => Object.values(legs).reduce((total, picks) => total * picks.length, 1);
const gateReady = gate => Object.values(gate).every(value => value === true);
const operationalStatus = meeting => gateReady(meeting.gate) ? 'LISTO PARA SELLAR' : meeting.status === 'LISTO PARA SELLAR' ? 'GATE PENDIENTE' : meeting.status;

assert.equal(historical.meetings.length, JSON.parse(fs.readFileSync('data/jornadas.json', 'utf8')).length);
for (const required of ['valencia-05-09-2026', 'rinconada-06-09-2026', 'rinconada-13-09-2026']) assert.ok(historical.meetings.some(m => m.id === required));
for (const meeting of historical.meetings) assert.ok(snapshots.some(snapshot => snapshot.id === meeting.analysis_snapshot_id));
for (const meeting of historical.meetings) assert.ok(meeting.meeting_number === null || Number.isInteger(meeting.meeting_number));
for (const snapshot of snapshots) {
  const hash = hashAnalysis(snapshot.analysis);
  assert.equal(snapshot.sha256, hash, `snapshot integrity: ${snapshot.id}`);
  const changed = structuredClone(snapshot.analysis); changed.races[0].analysis = 'mutación posterior';
  assert.notEqual(hashAnalysis(changed), snapshot.sha256);
}
const fixture = snapshots[0];
const sourceMutation = structuredClone(fixture); sourceMutation.analysis.races[0].analysis = 'fuente modificada'; sourceMutation.sha256 = hashAnalysis(sourceMutation.analysis);
assert.throws(() => validateFrozenSnapshot(sourceMutation, fixture), /source changed/);
const consistentMutation = structuredClone(fixture); consistentMutation.analysis.races[0].analysis = 'snapshot autoconsistente'; consistentMutation.sha256 = hashAnalysis(consistentMutation.analysis);
assert.throws(() => validateFrozenSnapshot(fixture, consistentMutation), /source changed/);
const staleHashMutation = structuredClone(fixture); staleHashMutation.analysis.races[0].analysis = 'snapshot corrupto';
assert.throws(() => validateFrozenSnapshot(fixture, staleHashMutation), /corruption detected/);
const r37 = current.meetings.find(m => m.id === 'rinconada-2026-09-20-r37');
assert.equal(r37.races.filter(r => r.kind === 'NO_VALIDA').length, 8);
assert.equal(r37.races.filter(r => r.kind === '5Y6').length, 6);
assert.equal(operationalStatus({...r37, status:'LISTO PARA SELLAR'}), 'GATE PENDIENTE');
const realTicketMeeting = historical.meetings.find(m => m.id === 'rinconada-06-09-2026');
assert.equal(combinations(realTicketMeeting.tickets[0].legs), realTicketMeeting.tickets[0].combinations);
assert.equal(combinations(realTicketMeeting.tickets[0].legs), 972);
const activeWrongOrder = [{date:'2026-10-09',status:'PRELIMINAR',slug:'future-b'},{date:'2026-10-07',status:'PRELIMINAR',slug:'today'},{date:'2026-10-06',status:'PRELIMINAR',slug:'past'},{date:'2026-10-08',status:'PRELIMINAR',slug:'future-a'}];
assert.equal(selectCurrentMeeting(activeWrongOrder, new Date('2026-10-07T12:00:00Z')).slug, 'today');
assert.equal(selectCurrentMeeting(activeWrongOrder.filter(m=>m.slug!=='today'), new Date('2026-10-07T12:00:00Z')).slug, 'future-a');
const manifest = JSON.parse(fs.readFileSync('assets/publications/manifest.json', 'utf8'));
for (const asset of manifest.assets) { assert.match(asset.path, /^\/assets\/publications\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+-v\d+\.webp$/); assert.equal(asset.mime, 'image/webp'); assert.match(asset.cache_strategy, /host-default/); assert.ok(fs.existsSync(`.${asset.path}`)); }
assert.equal(new Set(manifest.assets.map(a => a.path)).size, manifest.assets.length);
const html = ['index.html','404.html','historial.html','reuniones/index.html','reuniones/la-rinconada-reunion-37-20-septiembre-2026/index.html'].map(file => fs.readFileSync(file, 'utf8'));
for (const page of html) assert.match(page, /Content-Security-Policy/);
assert.match(html[0], /og:image/); assert.match(html[0], /twitter:image/); assert.match(html[4], /og:image/); assert.match(html[4], /twitter:image/); assert.match(html[2], /\/reuniones/);
console.log('migration, snapshots, tickets, gate, CSP, SEO and asset pipeline tests passed');

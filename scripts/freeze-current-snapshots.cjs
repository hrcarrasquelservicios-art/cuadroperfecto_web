const fs = require('node:fs');
const {hashAnalysis, validateFrozenSnapshot} = require('./snapshot-integrity.cjs');
const meetings = JSON.parse(fs.readFileSync('data/meetings.json', 'utf8')).meetings;
const file = 'data/analysis-snapshots.json'; const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const meeting of meetings) {
  const analysis = {races:meeting.races,intelligence:meeting.intelligence,tickets:meeting.tickets,gate:meeting.gate};
  const candidate = {id:meeting.analysis_snapshot_id,meeting_id:meeting.id,kind:'PRE_CARRERA',frozen_at:'2026-09-17T00:00:00Z',source:'authorized-2026-09-content',analysis,sha256:hashAnalysis(analysis)};
  const frozen = ledger.snapshots.find(snapshot => snapshot.id === candidate.id);
  if (frozen) validateFrozenSnapshot(candidate, frozen); else ledger.snapshots.push(candidate);
}
fs.writeFileSync(file, JSON.stringify(ledger,null,2)+'\n');

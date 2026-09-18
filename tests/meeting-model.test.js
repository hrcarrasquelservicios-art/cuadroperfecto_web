const assert = require('node:assert/strict');
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('data/meetings.json', 'utf8'));
const combinations = legs => Object.values(legs).reduce((total, picks) => total * picks.length, 1);

assert.equal(data.schema_version, '1.0');
assert.ok(data.meetings.length > 0);
for (const meeting of data.meetings) {
  assert.match(meeting.slug, /^[a-z0-9-]+$/);
  assert.equal(meeting.races.filter(r => r.kind === 'NO_VALIDA').length, 8);
  assert.equal(meeting.races.filter(r => r.kind === '5Y6').length, 6);
  assert.equal(meeting.tickets.length, 3);
  for (const ticket of meeting.tickets) {
    assert.deepEqual(Object.keys(ticket.legs), ['1V', '2V', '3V', '4V', '5V', '6V']);
    assert.ok(Number.isInteger(combinations(ticket.legs)));
  }
}
assert.equal(combinations({'1V':[1,2],'2V':[4],'3V':[3,5,8],'4V':[9],'5V':[1],'6V':[2,6]}), 12);
console.log('meeting model and ticket-combination tests passed');

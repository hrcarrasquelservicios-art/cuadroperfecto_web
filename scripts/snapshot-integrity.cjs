const crypto = require('node:crypto');

const hashAnalysis = analysis => crypto.createHash('sha256').update(JSON.stringify(analysis)).digest('hex');
function validateFrozenSnapshot(candidate, frozen) {
  if (hashAnalysis(frozen.analysis) !== frozen.sha256) throw new Error(`snapshot corruption detected: ${frozen.id}`);
  if (frozen.sha256 !== candidate.sha256) throw new Error(`immutable snapshot source changed: ${candidate.id}; create a new snapshot id instead`);
  return frozen;
}
module.exports = {hashAnalysis, validateFrozenSnapshot};

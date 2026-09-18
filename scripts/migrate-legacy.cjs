/* Generates canonical historical records and immutable pre-race snapshots. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const legacy = JSON.parse(fs.readFileSync('data/jornadas.json', 'utf8'));
const months = {enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11};
const isoDate = value => { const [,d,m,y] = value.match(/(\d+) de (\w+) (\d+)/i); return `${y}-${String(months[m.toLowerCase()]+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; };
const roles = raw => ({favorite: /TOP PICK|Exacto/.test(raw), enemy: /Alternativa/.test(raw), surprise: /BOMBA GANADORA/.test(raw)});
const legs = j => Object.fromEntries((j.jugada_combos || []).map((x,i) => [`${i+1}V`,x.split('-').map(Number)]));
const product = ticket => Object.values(ticket).reduce((n, leg) => n * leg.length, 1);
const canonical = j => {
  const ticketLegs = legs(j); const winners = (j.ganadores || []).map(x => ({race_label:x.carrera, official_result_raw:x.ganador, ...roles(x.ganador)}));
  const races = [...(j.lineas_fijas || []).map(r => ({public_label:r.numero,inh_code:null,kind:'NO_VALIDA',distance:r.distancia ?? null,time:r.hora ?? null,horses:(r.top3 || []).map(h => ({number:h.dorsal,name:h.nombre,jockey:null,trainer:null,weight:null,recent_form:null,role:h.icono === '💣' ? 'SORPRESA' : h.pos === 1 ? 'FAVORITO_ZCP' : 'ENEMIGO'})),analysis:r.clave ?? null})), ...(j.validas || []).map(r => ({public_label:r.v,inh_code:r.carrera ?? null,kind:'5Y6',distance:r.distancia ?? null,time:r.hora ?? null,horses:[r.top,r.alt].filter(Boolean).map((h,i) => ({number:h.dorsal,name:h.nombre,jockey:null,trainer:null,weight:null,recent_form:null,role:h.bomba ? 'SORPRESA' : i === 0 ? 'FAVORITO_ZCP':'ENEMIGO'})),analysis:r.warning ?? null}))];
  const result = winners.length ? {races_analyzed:j.stats?.carreras ?? null,favorite_winners:winners.filter(x=>x.favorite).length,enemy_winners:winners.filter(x=>x.enemy).length,surprise_winners:winners.filter(x=>x.surprise).length,accuracy_percent:j.efectividad ?? null,race_results:winners,ticket_performance:{presentado:null,recomendado:null,premium:null}} : null;
  const ticket = Object.keys(ticketLegs).length === 6 ? {tier:'RECOMENDADO',legs:ticketLegs,combinations:product(ticketLegs),source:'legacy.jugada_combos'} : null;
  const analysis = {races,intelligence:{bases:[],bombas:(j.bombas || []).map(x=>({number:x.dorsal,name:x.nombre,race:x.carrera})),carrera_trampa:null,alertas:[],cambios_ultima_hora:[],retirados:j.retirados || []},tickets:ticket?[ticket]:[],gate:{retirados:null,cambios_monta:null,pesos_descargos:null,implementos:null,condicion_pista:j.condiciones ?? null,cambios_ultima_hora:null,valor_unidad:null}};
  const snapshot = {id:`snapshot-${j.id}`,meeting_id:j.id,kind:'PRE_CARRERA',frozen_at:null,source:'migrated-legacy',analysis};
  snapshot.sha256 = crypto.createHash('sha256').update(JSON.stringify(analysis)).digest('hex');
  return {id:j.id,slug:`historial-${j.slug || j.id}`,track:j.hipodromo,meeting_number:j.reunion ?? null,date:isoDate(j.fecha),status:winners.length?'FINALIZADA':j.id.includes('13-09')?'PRELIMINAR':'ANÁLISIS CERRADO',unit_value:null,analysis_snapshot_id:snapshot.id,gate:analysis.gate,intelligence:analysis.intelligence,races,tickets:ticket?[ticket]:[],results:result,_snapshot:snapshot};
};
const records = legacy.map(canonical);
const snapshotFile = 'data/analysis-snapshots.json';
const existing = fs.existsSync(snapshotFile) ? JSON.parse(fs.readFileSync(snapshotFile, 'utf8')).snapshots : [];
const snapshots = records.map(record => {
  const candidate = record._snapshot;
  const frozen = existing.find(snapshot => snapshot.id === candidate.id);
  if (frozen && frozen.sha256 !== candidate.sha256) throw new Error(`immutable snapshot changed: ${candidate.id}; create a new snapshot id instead`);
  return frozen || candidate;
});
records.forEach(x => delete x._snapshot);
fs.writeFileSync('data/legacy-meetings.json', JSON.stringify({schema_version:'1.0',meetings:records}, null, 2)+'\n');
fs.writeFileSync(snapshotFile, JSON.stringify({schema_version:'1.0',snapshots}, null, 2)+'\n');

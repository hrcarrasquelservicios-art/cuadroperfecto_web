/* Local ingestion only. Never publishes or deploys. */
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const model=require('../js/jornada-model.js');
const {hashAnalysis}=require('./snapshot-integrity.cjs');
function applyEvent(input,meetings,snapshots,events,now=new Date()) {
 const e=structuredClone(input), meeting=meetings.find(m=>m.id===e.meeting_id);
 if(!meeting)throw new Error('Unknown meeting');
 if(!['pre_race','result','broadcast'].includes(e.type))throw new Error('Unsupported event');
 if(!model.safeURL(e.source_url)||!e.reviewed_by||!Number.isFinite(Date.parse(e.reviewed_at)))throw new Error('Reviewed source required');
 if(!model.officialSource(e.source_url))throw new Error('Official INH source required');
 if(!Number.isFinite(Date.parse(e.occurred_at))||Date.parse(e.occurred_at)>now.getTime())throw new Error('Invalid event time');
 if(e.type==='broadcast') {
  if(!model.safeURL(e.url))throw new Error('Invalid broadcast URL');
  e.message=`${meeting.track} · ${meeting.date}: transmisión de la jornada. ${e.url}`;
 } else {
  const race=meeting.races.find(r=>model.raceKey(r)===e.race_id);if(!race)throw new Error('Unknown race');
  const snapshot=snapshots.find(s=>s.id===meeting.analysis_snapshot_id);
  if(!snapshot||snapshot.sha256!==hashAnalysis(snapshot.analysis))throw new Error('Snapshot integrity failure');
  const favorite=model.frozenRace(meeting,race,snapshots)?.horses.find(h=>h.role==='FAVORITO_ZCP');
  if(e.type==='result') {
   if(e.status!=='official'||!Array.isArray(e.winner_numbers)||!e.winner_numbers.length||!e.winner_numbers.every(n=>Number.isInteger(n)&&n>0)||new Set(e.winner_numbers).size!==e.winner_numbers.length)throw new Error('Official winner numbers required');
   if(e.race_started_at!==null&&(!Number.isFinite(Date.parse(e.race_started_at))||Date.parse(e.race_started_at)>Date.parse(e.occurred_at)))throw new Error('Race start time required');
   const prev=events.filter(x=>x.type==='result'&&x.meeting_id===e.meeting_id&&x.race_id===e.race_id).at(-1);
   if(prev&&JSON.stringify(prev.winner_numbers)!==JSON.stringify(e.winner_numbers)&&e.corrects!==prev.id)throw new Error('Correction must reference previous result');
   const timed=snapshot.frozen_at&&Date.parse(snapshot.frozen_at)<Date.parse(e.race_started_at);
   const verdict=timed&&favorite?(e.winner_numbers.includes(Number(favorite.number))?'Acertó nuestro favorito.':'No acertó nuestro favorito.'):'Sin evidencia temporal suficiente para acreditar el pronóstico.';
   e.message=`${e.corrects?'CORRECCIÓN · ':''}${meeting.track} · ${race.public_label}: ganador ${e.winner_numbers.map(n=>'#'+n).join(' / ')}. ${verdict}`;
  } else {
   if(!favorite||!snapshot.frozen_at||Date.parse(snapshot.frozen_at)>Date.parse(e.occurred_at))throw new Error('Frozen pre-race favorite required');
   if(events.some(x=>x.type==='result'&&x.meeting_id===e.meeting_id&&x.race_id===e.race_id))throw new Error('Race already resulted');
   if(e.confirmed_up_next!==true)throw new Error('Confirmed upcoming race required');
   e.message=`${meeting.track} · Va a correr ${race.public_label}. Nuestro favorito: #${favorite.number} ${favorite.name}.`;
  }
 }
 e.id=createHash('sha256').update(JSON.stringify([e.meeting_id,e.race_id||null,e.type,e.winner_numbers||null,e.url||null,e.corrects||null])).digest('hex');
 if(events.some(x=>x.id===e.id))return {events,duplicate:true,event:e};
 return {events:[...events,e],duplicate:false,event:e};
}
function run(){
 const file=process.argv[2];if(!file)throw new Error('Usage: npm run agent:ingest -- reviewed-event.json (local only)');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const meetings=[...read('data/meetings.json').meetings,...read('data/legacy-meetings.json').meetings];
 const previous=read('data/jornada-events.json');const result=applyEvent(read(file),meetings,read('data/analysis-snapshots.json').snapshots,previous.events);
 if(result.duplicate){console.log('Event already recorded; no duplicate');return;}
 const channels=read('data/channels.json');
 if(result.event.type==='broadcast')channels.broadcasts=[...channels.broadcasts.filter(x=>x.meeting_id!==result.event.meeting_id),{meeting_id:result.event.meeting_id,url:result.event.url,source_url:result.event.source_url,verified_at:result.event.reviewed_at,status:result.event.status||'scheduled',valid_until:result.event.valid_until||null}];
 fs.writeFileSync('data/jornada-events.json',JSON.stringify({...previous,events:result.events},null,2)+'\n');
 fs.writeFileSync('data/channels.json',JSON.stringify(channels,null,2)+'\n');
 fs.mkdirSync('work/outbox',{recursive:true});
 fs.writeFileSync(`work/outbox/${result.event.id}.json`,JSON.stringify({status:'pending_delivery',event_id:result.event.id,targets:{telegram:channels.telegram,facebook:channels.facebook},text:result.event.message+'\nFuente: '+result.event.source_url+'\n'+channels.website+'\nEl análisis no garantiza resultados. Juega responsablemente.'},null,2));
 console.log('Recorded locally; channel drafts prepared. Nothing published.');
}
if(require.main===module){try{run();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={applyEvent};

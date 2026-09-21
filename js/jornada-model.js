/* Shared by the website and the local jornada worker. No inferred official results. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined') module.exports = api;
  root.ZCP = api;
}(globalThis, function() {
  const raceKey = r => r.id || r.public_label;
  const legNumber = label => Number(String(label).match(/(?:V\s*(\d+)|(\d+)\s*V)/i)?.slice(1).find(Boolean)) || null;
  function combinations(legs) {
    const entries = Object.values(legs || {});
    return entries.length === 6 && entries.every(p => Array.isArray(p) && p.length && new Set(p.map(String)).size === p.length)
      ? entries.reduce((n,p) => n*p.length,1) : null;
  }
  function orderedRaces(meeting) {
    return (meeting.races || []).slice().sort((a,b) => {
      const number = r => Number(String(r.public_label).match(/\d+/)?.[0] || 999) + (r.kind === '5Y6' ? 100 : 0);
      return (a.sequence ?? number(a)) - (b.sequence ?? number(b));
    });
  }
  function safeURL(value) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : null; } catch { return null; } }
  function officialSource(value) {try {const u=new URL(value);return u.protocol==='https:' && (u.hostname==='inh.gob.ve'||u.hostname.endsWith('.inh.gob.ve')||(u.hostname==='t.me' && /^\/(?:s\/)?INHOficial\/\d+$/.test(u.pathname)));}catch{return false;}}
  function confirmedResult(meeting, race, events) {
    return events.filter(e => e.type === 'result' && e.meeting_id === meeting.id && e.race_id === raceKey(race) && e.status === 'official' && officialSource(e.source_url) && Array.isArray(e.winner_numbers) && e.winner_numbers.length > 0).at(-1) || null;
  }
  function frozenRace(meeting, race, snapshots) {
    const snapshot = snapshots.find(s => s.id === meeting.analysis_snapshot_id);
    return snapshot?.analysis.races.find(r => raceKey(r) === raceKey(race));
  }
  function outcome(meeting, race, events, snapshots) {
    const result = confirmedResult(meeting,race,events);
    const saved = frozenRace(meeting,race,snapshots);
    const snapshot = snapshots.find(s=>s.id===meeting.analysis_snapshot_id);
    const evidence = snapshot?.frozen_at && result?.race_started_at && Date.parse(snapshot.frozen_at) < Date.parse(result.race_started_at);
    const favorite = saved?.horses.find(h=>h.role === 'FAVORITO_ZCP');
    return {result, favorite, hit: result && favorite && evidence ? result.winner_numbers.map(String).includes(String(favorite.number)) : null};
  }
  function ticketOutcome(meeting, ticket, events, snapshots) {
    const races = orderedRaces(meeting).filter(r=>r.kind==='5Y6');
    if (races.length !== 6) return null;
    let hits = 0;
    for (const race of races) {
      const result = confirmedResult(meeting,race,events);
      if (!result) return null;
      const picks = Object.entries(ticket.legs).find(([key])=>legNumber(key)===legNumber(race.public_label))?.[1];
      if (!picks?.length) return null;
      if (result.winner_numbers.some(n=>picks.map(String).includes(String(n)))) hits++;
    }
    const snapshot = snapshots.find(s=>s.id===meeting.analysis_snapshot_id);
    const preserved = snapshot?.analysis.tickets?.find(t=>t.tier===ticket.tier);
    const timed = snapshot?.frozen_at && races.every(r=> Date.parse(snapshot.frozen_at) < Date.parse(confirmedResult(meeting,r,events).race_started_at));
    return {hits, verified: Boolean(timed && preserved && JSON.stringify(preserved.legs)===JSON.stringify(ticket.legs))};
  }
  return {officialSource,raceKey,legNumber,combinations,orderedRaces,safeURL,confirmedResult,frozenRace,outcome,ticketOutcome};
}));

(function exposeMeetingSelection(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined') module.exports = api;
  root.CuadroPerfectoModel = api;
}(globalThis, function makeMeetingSelection() {
  const day = date => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  function selectCurrentMeeting(meetings, now = new Date()) {
    const today = day(now);
    const active = meetings.filter(meeting => meeting.status !== 'FINALIZADA').slice().sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
    return active.find(meeting => meeting.date === today) || active.find(meeting => meeting.date > today) || meetings.slice().sort((a,b)=>b.date.localeCompare(a.date))[0] || null;
  }
  return {selectCurrentMeeting};
}));

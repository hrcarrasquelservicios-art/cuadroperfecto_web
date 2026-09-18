(function exposeMeetingSelection(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined') module.exports = api;
  root.CuadroPerfectoModel = api;
}(globalThis, function makeMeetingSelection() {
  const day = date => date.toISOString().slice(0, 10);
  function selectCurrentMeeting(meetings, now = new Date()) {
    const today = day(now);
    const active = meetings.filter(meeting => meeting.status !== 'FINALIZADA').slice().sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
    return active.find(meeting => meeting.date === today) || active.find(meeting => meeting.date > today) || active.at(-1) || null;
  }
  return {selectCurrentMeeting};
}));

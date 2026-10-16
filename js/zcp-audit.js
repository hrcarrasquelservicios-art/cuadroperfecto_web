/* Filtros del historial auditable y recálculo del rendimiento. Mejora progresiva: sin JS se ve todo. */
(function () {
  'use strict';
  var pct = function (w, n) { return n ? (Math.round(1000 * w / n) / 10).toFixed(1).replace('.', ',') + '%' : '—'; };

  var hf = document.getElementById('za-filters');
  if (hf) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#za-cards > article'));
    var apply = function () {
      var f = {track: hf.track.value, month: hf.month.value, version: hf.version.value, status: hf.status.value}, shown = 0;
      cards.forEach(function (c) {
        var ok = (!f.track || c.dataset.track === f.track) && (!f.month || c.dataset.month === f.month) &&
          (!f.version || c.dataset.version === f.version) && (!f.status || c.dataset.status === f.status);
        c.hidden = !ok; if (ok) shown++;
      });
      document.getElementById('za-count').textContent = shown + (shown === 1 ? ' reunión' : ' reuniones');
      document.getElementById('za-empty').hidden = shown > 0;
    };
    hf.addEventListener('change', apply);
    apply();
  }

  var pf = document.getElementById('za-perf');
  if (pf && window.fetch) {
    fetch('/data/zcp-audit.json', {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : null; }).then(function (D) {
      if (!D || !Array.isArray(D.race_metrics)) return;
      var defaultText = document.getElementById('za-utext').textContent;
      var names = {};
      D.meetings.forEach(function (m) { names[m.id] = m.track + ' R' + m.meeting + ' (' + m.date.slice(8, 10) + '/' + m.date.slice(5, 7) + ', ' + m.system_version + ', ' + m.status + ')'; });
      var update = function () {
        var f = {track: pf.track.value, version: pf.version.value, status: pf.status.value};
        var rows = D.race_metrics.filter(function (r) {
          return (!f.track || r.track === f.track) && (!f.version || r.version === f.version) && (!f.status || r.status === f.status);
        });
        var sum = function (k) { return rows.reduce(function (n, r) { return n + Number(r[k]); }, 0); };
        var pairs = {first: [sum('first'), rows.length], top3: [sum('top3'), rows.length], expanded: [sum('expanded'), rows.length],
          bomba_w: [sum('bomba_w'), sum('bomba_n')], ancla_w: [sum('ancla_w'), sum('ancla_n')], bat_w: [sum('bat_w'), sum('bat_n')]};
        Object.keys(pairs).forEach(function (k) {
          var el = document.querySelector('[data-kpi="' + k + '"]'); if (!el) return;
          el.querySelector('[data-w]').textContent = pairs[k][0];
          el.querySelector('[data-n]').textContent = pairs[k][1];
          el.querySelector('[data-p]').textContent = pct(pairs[k][0], pairs[k][1]);
        });
        var versions = rows.map(function (r) { return r.version; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
        var meetings = rows.map(function (r) { return r.meeting_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
        document.getElementById('za-ulabel').textContent = !rows.length ? 'SIN DATOS' : versions.length > 1 ? 'MULTI-VERSION HISTORICAL' : 'Sistema 3.3 ' + versions[0];
        document.getElementById('za-utext').textContent = !f.track && !f.version && !f.status ? defaultText :
          rows.length ? rows.length + ' carreras de ' + meetings.length + (meetings.length === 1 ? ' reunión: ' : ' reuniones: ') + meetings.map(function (id) { return names[id]; }).join(' · ') + '.' :
          'No hay carreras evaluables con esos filtros.';
        document.getElementById('za-perf-scope').textContent = rows.length + ' carreras evaluadas';
      };
      pf.addEventListener('change', update);
      update();
    }).catch(function () { /* se conserva la versión estática */ });
  }
}());

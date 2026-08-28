// Historial & Estadisticas -- consume la API publica y de solo lectura del
// Media Engine de Zona Caliente (Cloudflare Worker + D1). Sin API key,
// endpoints publicos por diseno. 28 ago 2026.

const API_BASE = 'https://zona-caliente-worker.nfd-dynamics.workers.dev/api/publico';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initTabs() {
  document.querySelectorAll('.hist-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hist-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.hist-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
    });
  });
}

async function cargarJornadas() {
  const el = document.getElementById('panel-jornadas');
  try {
    const resp = await fetch(`${API_BASE}/jornadas`);
    const data = await resp.json();
    if (!data.jornadas || data.jornadas.length === 0) {
      el.innerHTML = '<div class="hist-empty">Todavía no hay jornadas cargadas en el historial.</div>';
      return;
    }
    el.innerHTML = data.jornadas
      .map((j) => {
        const pago = j.pago === null || j.pago === undefined
          ? '<span class="hist-pago pendiente">Pago pendiente de cargar</span>'
          : `<span class="hist-pago si">Pagó Bs ${escapeHtml(j.pago)}</span>`;
        const jugada = j.jugada_texto
          ? `<div class="hist-jugada">${escapeHtml(j.jugada_texto)} (${escapeHtml(j.combinaciones)} combinaciones)</div>`
          : '';
        return `<div class="hist-card">
          <div class="hist-card-head">
            <b>${escapeHtml(j.hipodromo)} — ${escapeHtml(j.fecha)}</b>
            <span class="hist-tag">${escapeHtml(j.num_carreras)} carreras · Sistema ${escapeHtml(j.version_skill)}</span>
          </div>
          ${jugada}
          ${pago}
        </div>`;
      })
      .join('');
  } catch (e) {
    el.innerHTML = '<div class="hist-empty">No se pudo cargar el historial en este momento.</div>';
  }
}

async function cargarRankingJinetes() {
  const el = document.getElementById('panel-jinetes');
  try {
    const resp = await fetch(`${API_BASE}/ranking/jinetes`);
    const data = await resp.json();
    if (!data.ranking || data.ranking.length === 0) {
      el.innerHTML = '<div class="hist-empty">Todavía no hay resultados cargados para calcular el ranking real de jinetes.</div>';
      return;
    }
    const filas = data.ranking
      .map((r) => {
        const pct = r.recomendaciones > 0 ? ((r.aciertos / r.recomendaciones) * 100).toFixed(1) : '0.0';
        return `<tr><td>${escapeHtml(r.nombre_canonico)}</td><td>${escapeHtml(r.recomendaciones)}</td><td>${escapeHtml(r.aciertos)}</td><td>${pct}%</td></tr>`;
      })
      .join('');
    el.innerHTML = `<table class="hist-table">
      <thead><tr><th>Jinete</th><th>Veces recomendado</th><th>Aciertos</th><th>% acierto</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="hist-sub" style="margin-top:14px;">% de acierto solo cuando el Sistema 3.3 lo recomendó como pick principal — no es su porcentaje de victorias en general.</p>`;
  } catch (e) {
    el.innerHTML = '<div class="hist-empty">No se pudo cargar el ranking en este momento.</div>';
  }
}

async function cargarEstadisticas() {
  const el = document.getElementById('panel-stats');
  try {
    const resp = await fetch(`${API_BASE}/estadisticas`);
    const data = await resp.json();
    if (!data.estadisticas || data.estadisticas.length === 0) {
      el.innerHTML = '<div class="hist-empty">Todavía no se cargaron resultados oficiales de ninguna jornada -- la efectividad real se calcula recién cuando eso pase.</div>';
      return;
    }
    const filas = data.estadisticas
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.fecha)} · ${escapeHtml(e.hipodromo)}</td><td>${escapeHtml(e.exactos)}/${escapeHtml(e.total_carreras)}</td><td>${escapeHtml(e.pct_exactos)}%</td><td>${escapeHtml(e.pct_top3)}%</td></tr>`
      )
      .join('');
    el.innerHTML = `<table class="hist-table">
      <thead><tr><th>Jornada</th><th>Exactos</th><th>% Exactos</th><th>% Top 3</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
  } catch (e) {
    el.innerHTML = '<div class="hist-empty">No se pudo cargar la efectividad en este momento.</div>';
  }
}

initTabs();
cargarJornadas();
cargarRankingJinetes();
cargarEstadisticas();

/* Zona Caliente Pro — historial auditable.
   Genera páginas estáticas desde data/zcp-audit.json (exportado del ledger auditado):
   /historico /rendimiento /metodologia /resultados /resultados/<reunión> y los pronósticos previos en /reuniones/<reunión>.
   Solo publica el pronóstico oficial A. Falla el build ante cualquier desajuste de datos. */
const fs = require('node:fs');
const path = require('node:path');
const {validateAudit, ratio, EXPECTED_PRERACE} = require('./zcp-audit-validate.cjs');

const D = JSON.parse(fs.readFileSync('data/zcp-audit.json', 'utf8'));
validateAudit(D);
const V = 'zcp1';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const int = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const bs = n => n === null || n === undefined ? '—' : 'Bs ' + (Number.isInteger(n) ? int(n) : int(Math.trunc(n)) + ',' + Math.round((Math.abs(n) % 1) * 100).toString().padStart(2, '0'));
const pct = (w, n) => n ? (Math.round(1000 * w / n) / 10).toFixed(1).replace('.', ',') + '%' : '—';
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const ddmm = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const longDate = iso => { const dt = new Date(iso + 'T12:00:00Z'); return `${DAYS[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]} de ${dt.getUTCFullYear()}`; };
const caracas = utc => { if (!utc || !/^\d{4}-\d\d-\d\dT/.test(utc)) return null; const t = new Date(Date.parse(utc) - 4 * 3600e3); const p = n => String(n).padStart(2, '0'); return `${p(t.getUTCDate())}/${p(t.getUTCMonth() + 1)}/${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`; };
const utcShort = utc => utc.replace('T', ' ').replace(/:\d\d(\.\d+)?Z$/, ' UTC').replace(/Z$/, ' UTC');
const STATUS_ES = {VERIFIED: 'VERIFIED · verificado', PARTIAL: 'PARTIAL · parcial', AWAITING_OFFICIAL_EVIDENCE: 'AWAITING_OFFICIAL_EVIDENCE · esperando resultado oficial', NEEDS_EVIDENCE: 'NEEDS_EVIDENCE · falta evidencia'};
const badge = s => `<span class="za-badge za-s-${esc(s)}">${esc(STATUS_ES[s] || s)}</span>`;
const short = h => h ? esc(h.slice(0, 12)) + '…' : '—';
const frac = (o, label) => o ? `${o.w} / ${o.n}` : (label || '—');
const shortSys = v => v === 'no declarada' ? 'Sistema no declarado' : `Sistema 3.3 ${v}`;

/* ---------------- plantilla del sitio (cabecera, barra INH, pie) ---------------- */
let template = fs.readFileSync('index.html', 'utf8');
if (!template.includes('/css/zcp-audit.css')) template = template.replace('</head>', `<link rel="stylesheet" href="/css/zcp-audit.css?v=${V}"></head>`);
const routes = [];
function write(route, title, description, content, extraScript = false) {
  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)} | Zona Caliente Pro</title>`)
    .replace(/<main id="main"[\s\S]*?<\/main>/, () => `<main id="main" tabindex="-1" aria-busy="false" data-static="zcp"><div class="za">${content}</div></main>`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="https://cuadroperfecto.com${route}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="https://cuadroperfecto.com${route}">`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)} | Zona Caliente Pro">`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}">`);
  if (extraScript) html = html.replace('</body>', `<script src="/js/zcp-audit.js?v=${V}" defer></script></body>`);
  const file = path.join(route.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, html);
  routes.push(route);
}
const hero = (kicker, h1, lead) => `<section class="za-hero"><div class="wrap"><p class="za-kicker">${kicker}</p><h1>${h1}</h1>${lead ? `<p class="za-lead">${lead}</p>` : ''}<p class="za-tagline">«No se trata de adivinar, se trata de encontrar valor.»</p></div></section>`;
const subnav = `<p class="za-actions"><a class="za-btn-ghost za-btn" href="/historico">Histórico</a><a class="za-btn-ghost za-btn" href="/rendimiento">Rendimiento</a><a class="za-btn-ghost za-btn" href="/resultados">Resultados</a><a class="za-btn-ghost za-btn" href="/metodologia">Metodología</a></p>`;

/* ---------------- tarjetas de reunión ---------------- */
const pre = D.prerace;
const best5y6 = m => { const t = m.tickets.filter(x => !x.superseded); return t.length ? t.map(x => `${esc(x.name)} ${x.hits}/6`).join(' · ') : '—'; };
const corrLinks = ids => ids && ids.length ? ids.map(id => `<a href="/historico#${esc(id)}">${esc(id)}</a>`).join(' · ') : 'Ninguna';
const resultLine = m => m.races_evaluated ? `1ª selección ${frac(m.first_pick)} · top 3 ${frac(m.top3)} · ampliada ${frac(m.expanded)} <span class="za-muted">(${m.races_evaluated} carreras)</span>` : '<span class="za-muted">Solo se evalúa el cuadro publicado</span>';
function preTime(p) {
  if (p.published_at && /^\d{4}-\d\d-\d\dT[\d:]+Z$/.test(p.published_at)) return `${esc(caracas(p.published_at))} (Caracas)`;
  return esc(p.published_note || 'Sin hora de publicación demostrable');
}
function cardLedger(m) {
  const cls = m.status === 'PARTIAL' ? ' za-is-partial' : '';
  return `<article class="za-card${cls}" data-track="${esc(m.track)}" data-version="${esc(m.system_version)}" data-status="${esc(m.status)}" data-month="${esc(m.date.slice(0, 7))}">
<header><div><p class="za-kicker">${esc(m.track)} · Reunión ${m.meeting}</p><h3>${esc(longDate(m.date))}</h3></div>${badge(m.status)}</header>
<dl><dt>Sistema</dt><dd>${esc(shortSys(m.system_version))}</dd>
<dt>Pronóstico</dt><dd>${esc(m.pre_race.evidence)} · ${preTime(m.pre_race)}</dd>
<dt>Resultado</dt><dd>${resultLine(m)}</dd>
<dt>5y6</dt><dd>${best5y6(m)}</dd>
<dt>Bombas</dt><dd>${frac(m.bombas, 'Sin bombas publicadas')}</dd>
<dt>Correcciones</dt><dd>${corrLinks(m.corrections)}</dd></dl>
${m.scope ? `<p class="za-small za-muted">${esc(m.scope)}</p>` : ''}
<a class="za-link" href="/resultados/${esc(m.slug)}">Ver registro completo →</a></article>`;
}
function cardPre(p) {
  const eq = p.tickets.find(t => t.type === 'EQUILIBRADA');
  return `<article class="za-card za-is-pre" data-track="${esc(p.track)}" data-version="${esc(p.system_version)}" data-status="${esc(p.status)}" data-month="${esc(p.date.slice(0, 7))}">
<header><div><p class="za-kicker">${esc(p.track)} · Reunión ${p.meeting}</p><h3>${esc(longDate(p.date))}</h3></div>${badge(p.status)}</header>
<dl><dt>Sistema</dt><dd>Sistema 3.3 ${esc(p.system_version)}</dd>
<dt>Pronóstico</dt><dd><strong>PUBLICADO ANTES DE LA JORNADA</strong> · Telegram ${esc(p.telegram_ticket_msg)} · ${esc(caracas(p.SOURCE_PUBLISHED_AT))} (Caracas)</dd>
<dt>Resultado</dt><dd>Pendiente del resultado oficial</dd>
<dt>5y6</dt><dd>Recomendada: ${int(eq.current.combinations)} combinaciones · ${bs(eq.current.cost_bs)}</dd>
<dt>Bombas</dt><dd>${p.races.reduce((n, r) => n + r.horses.filter(h => h.classes.includes('BOMBA') && !h.withdrawn).length, 0)} publicadas</dd>
<dt>Correcciones</dt><dd>Ninguna</dd></dl>
<a class="za-link" href="/reuniones/${esc(p.slug)}">Ver pronóstico previo →</a></article>`;
}
function cardNeeds(m) {
  return `<article class="za-card za-is-needs" data-track="${esc(m.track)}" data-version="${esc(m.system_version)}" data-status="${esc(m.status)}" data-month="${esc(m.date.slice(0, 7))}">
<header><div><p class="za-kicker">${esc(m.track)} · Reunión ${m.meeting}</p><h3>${esc(longDate(m.date))}</h3></div>${badge(m.status)}</header>
<dl><dt>Sistema</dt><dd>No declarado</dd><dt>Pronóstico</dt><dd>Sin evidencia fechada</dd><dt>Resultado</dt><dd>No se evalúa</dd><dt>5y6</dt><dd>No se evalúa</dd><dt>Bombas</dt><dd>No se evalúan</dd><dt>Correcciones</dt><dd>Ninguna</dd></dl>
<p class="za-small za-muted">${esc(m.note)}</p><a class="za-link" href="${esc(m.previous_web_page)}">Ver ficha web original →</a></article>`;
}
function corrBlock(c) {
  return `<article class="za-corr" id="${esc(c.id)}"><p class="za-kicker">${esc(c.id)} · registrada el ${esc(ddmm(c.date))}</p><h3>${esc(c.title)}</h3>
<p class="za-small za-muted">Registro anterior (se conserva):</p><ul>${c.old_record.map(x => `<li><del>${esc(x)}</del></li>`).join('')}</ul>
<p class="za-small za-muted">Registro corregido:</p><ul>${c.new_record.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="za-small">${esc(c.reason)}</p>${c.evidence.length ? `<p class="za-small">Evidencia: ${c.evidence.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https:\/\//, '').slice(0, 48))}${u.length > 56 ? '…' : ''} ↗</a>`).join(' · ')}</p>` : ''}</article>`;
}

/* ---------------- /historico ---------------- */
const allCards = [...pre.map(p => ({date: p.date, html: cardPre(p)})), ...D.meetings.map(m => ({date: m.date, html: cardLedger(m)})), ...D.needs_evidence.map(m => ({date: m.date, html: cardNeeds(m)}))].sort((a, b) => b.date.localeCompare(a.date));
const versions = [...new Set([...pre.map(p => p.system_version), ...D.meetings.map(m => m.system_version), 'no declarada'])].sort();
const months = [...new Set(allCards.map(c => c.date.slice(0, 7)))].sort().reverse();
const filters = `<form class="za-filters" id="za-filters" aria-label="Filtrar reuniones">
<label>Hipódromo<select name="track"><option value="">Todos</option><option>Valencia</option><option>La Rinconada</option></select></label>
<label>Fecha<select name="month"><option value="">Todas</option>${months.map(m => `<option value="${m}">${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}</option>`).join('')}</select></label>
<label>Versión del sistema<select name="version"><option value="">Todas</option>${versions.map(v => `<option value="${esc(v)}">${esc(v === 'no declarada' ? 'No declarada' : 'Sistema 3.3 ' + v)}</option>`).join('')}</select></label>
<label>Estado<select name="status"><option value="">Todos</option>${Object.keys(D.statuses).map(s => `<option value="${s}">${s}</option>`).join('')}</select></label>
<p class="za-filter-count" id="za-count" aria-live="polite">${allCards.length} reuniones</p></form>`;
write('/historico', 'Histórico auditable', 'Historial auditable de Zona Caliente Pro: cada reunión con su pronóstico fechado, resultado oficial, estado de evidencia y correcciones.',
  hero('Histórico auditable', 'Cada pronóstico, con su fecha y su resultado.', 'Aquí están las jornadas buenas y las malas. Cada reunión muestra cuándo se publicó el pronóstico, con qué evidencia, qué dijo el resultado oficial y qué corregimos. Una reunión PARTIAL no se presenta como VERIFIED.') +
  `<div class="wrap">${subnav}<h2>Estados de evidencia</h2><div class="za-grid za-grid-2">${Object.entries(D.statuses).map(([k, v]) => `<div class="za-card">${badge(k)}<p class="za-small">${esc(v)}</p></div>`).join('')}</div>
<h2>Reuniones</h2>${filters}<div class="za-grid za-grid-2" id="za-cards">${allCards.map(c => c.html).join('')}</div>
<p class="za-notice" id="za-empty" hidden>No hay reuniones con esos filtros.</p>
<h2 id="correcciones">Registro de correcciones</h2><p class="za-muted">Nunca reescribimos un registro en silencio: el texto anterior queda visible, tachado, junto a la corrección.</p>${D.corrections.map(corrBlock).join('')}</div>`, true);

/* ---------------- /rendimiento ---------------- */
const RM = D.race_metrics;
const sum = (rows, k) => rows.reduce((n, r) => n + (typeof r[k] === 'boolean' ? Number(r[k]) : r[k]), 0);
const kpiDefs = [['first', null, 'Primera selección', D.metric_definitions.first], ['top3', null, 'Top 3', D.metric_definitions.top3], ['expanded', null, 'Cobertura ampliada', D.metric_definitions.expanded],
  ['bomba_w', 'bomba_n', 'Bombas', D.metric_definitions.bombas], ['ancla_w', 'ancla_n', 'Anclas', D.metric_definitions.anclas], ['bat_w', 'bat_n', 'Batacazos', D.metric_definitions.batacazos]];
const kpis = rows => kpiDefs.map(([w, n, title, def]) => { const W = sum(rows, w), N = n ? sum(rows, n) : rows.length; return `<article class="za-kpi" data-kpi="${w}"><h3>${title}</h3><span class="za-frac"><span data-w>${W}</span> <small>/</small> <span data-n>${N}</span></span><span class="za-pct" data-p>${pct(W, N)}</span><p>${esc(def)}</p></article>`; }).join('');
const versionRows = [...new Set(RM.map(r => r.version))].sort().map(v => { const rows = RM.filter(r => r.version === v); const ms = [...new Set(rows.map(r => r.meeting_id))]; return `<tr><th scope="row">Sistema 3.3 ${esc(v)}</th><td>${ms.length}</td><td>${sum(rows, 'first')} / ${rows.length}</td><td>${sum(rows, 'top3')} / ${rows.length}</td><td>${sum(rows, 'expanded')} / ${rows.length}</td><td>${sum(rows, 'bomba_w')} / ${sum(rows, 'bomba_n')}</td><td>${sum(rows, 'ancla_w')} / ${sum(rows, 'ancla_n')}</td><td>${sum(rows, 'bat_w')} / ${sum(rows, 'bat_n')}</td></tr>`; }).join('');
const meetingRows = D.meetings.filter(m => m.in_race_metrics).map(m => `<tr><th scope="row"><a href="/resultados/${esc(m.slug)}">${esc(m.track)} R${m.meeting}</a><br><span class="za-small za-muted">${esc(ddmm(m.date))}</span></th><td>${esc(m.system_version)}</td><td>${badge(m.status)}</td><td>${frac(m.first_pick)}</td><td>${frac(m.top3)}</td><td>${frac(m.expanded)}</td><td>${frac(m.bombas, '—')}</td><td>${frac(m.anclas, '—')}</td><td>${frac(m.batacazos, '—')}</td></tr>`).join('');
const allTickets = D.meetings.flatMap(m => m.tickets.filter(t => !t.superseded).map(t => ({m, t})));
const t5 = allTickets.filter(x => x.t.hits >= 5).length, t6 = allTickets.filter(x => x.t.hits === 6).length;
const ticketRows = allTickets.map(({m, t}) => `<tr data-track="${esc(m.track)}" data-version="${esc(m.system_version)}" data-status="${esc(m.status)}"><th scope="row"><a href="/resultados/${esc(m.slug)}">${esc(m.track)} R${m.meeting}</a><br><span class="za-small za-muted">${esc(ddmm(m.date))} · ${esc(m.system_version)}</span></th><td>${esc(t.name)}</td><td>${badge(m.status)}</td><td><strong>${t.hits}/6</strong></td><td>${int(t.combinations)}${t.combinations_correction ? `<br><span class="za-small za-no">publicado «${t.published_combinations}» · <a href="/historico#C-2026-004">C-2026-004</a></span>` : ''}</td><td>${bs(t.cost_bs)}</td><td>${t.hits >= 5 ? bs(t.theoretical_return_bs) : bs(0)}</td><td>${t.net_bs === null ? '—' : `<span class="${t.net_bs >= 0 ? 'za-ok' : 'za-no'}">${bs(t.net_bs)}</span>`}</td></tr>`).join('');
const rFilters = `<form class="za-filters" id="za-perf" aria-label="Filtrar rendimiento">
<label>Hipódromo<select name="track"><option value="">Valencia + La Rinconada</option><option>Valencia</option><option>La Rinconada</option></select></label>
<label>Versión del sistema<select name="version"><option value="">Todas (multi-versión)</option>${[...new Set(RM.map(r => r.version))].sort().map(v => `<option value="${esc(v)}">Sistema 3.3 ${esc(v)}</option>`).join('')}</select></label>
<label>Estado de evidencia<select name="status"><option value="">VERIFIED + PARTIAL</option><option value="VERIFIED">Solo VERIFIED</option><option value="PARTIAL">Solo PARTIAL</option></select></label>
<p class="za-filter-count" id="za-perf-scope" aria-live="polite"></p></form>`;
const U = D.metric_universe;
write('/rendimiento', 'Rendimiento reconstruido', 'Rendimiento de Zona Caliente Pro con numerador y denominador: primera selección, top 3, cobertura, bombas, anclas, batacazos y 5y6, por hipódromo y versión del sistema.',
  hero('Rendimiento reconstruido', 'Números con numerador y denominador.', 'Solo publicamos métricas que se pueden reconstruir carrera por carrera desde un pronóstico previo y el resultado oficial. Ningún porcentaje aparece sin su fracción ni sin su universo.') +
  `<div class="wrap">${subnav}${rFilters}
<p class="za-universe" id="za-universe"><strong id="za-ulabel">${esc(U.label)}</strong> · <span id="za-utext">${esc(U.description)}</span></p>
<div class="za-kpis" id="za-kpis">${kpis(RM)}</div>
<p class="za-callout"><strong>Las versiones no se mezclan en silencio.</strong> Con «Todas» el total combina Sistema 3.3 v3.7, v3.8, v3.9 y v4.0, y por eso lleva la etiqueta MULTI-VERSION HISTORICAL. Elige una versión para ver solo sus carreras.</p>
<h2>Por versión del sistema</h2><div class="za-scroll" tabindex="0" role="region" aria-label="Rendimiento por versión"><table><thead><tr><th>Versión</th><th>Reuniones</th><th>1ª selección</th><th>Top 3</th><th>Ampliada</th><th>Bombas</th><th>Anclas</th><th>Batacazos</th></tr></thead><tbody>${versionRows}</tbody></table></div>
<h2>Por reunión</h2><div class="za-scroll" tabindex="0" role="region" aria-label="Rendimiento por reunión"><table><thead><tr><th>Reunión</th><th>Versión</th><th>Estado</th><th>1ª selección</th><th>Top 3</th><th>Ampliada</th><th>Bombas</th><th>Anclas</th><th>Batacazos</th></tr></thead><tbody>${meetingRows}</tbody></table></div>
<p class="za-small za-muted">No entran en estas métricas por carrera: La Rinconada R37 (20/09, PARTIAL: no válidas incompletas), Valencia R24 y La Rinconada R38 (26–27/09, solo cuadro), y las reuniones NEEDS_EVIDENCE (13/09 y 19/09).</p>
<h2>Cuadros 5y6 publicados</h2>
<div class="za-kpis"><article class="za-kpi"><h3>Cuadros con 5 o 6 aciertos</h3><span class="za-frac">${t5} <small>/</small> ${allTickets.length}</span><span class="za-pct">${pct(t5, allTickets.length)}</span><p>Cuadros publicados antes de la jornada en las 8 reuniones con evidencia (VERIFIED + PARTIAL, multi-versión). No incluye la versión sustituida 2663.</p></article><article class="za-kpi"><h3>Cuadros con 6 de 6</h3><span class="za-frac">${t6} <small>/</small> ${allTickets.length}</span><span class="za-pct">${pct(t6, allTickets.length)}</span><p>Mismo universo.</p></article></div>
<p class="za-muted za-small">Costo y retorno son teóricos: se calculan con Bs 35 por combinación y el dividendo oficial cuando hubo 5 o 6 aciertos. Un cuadro publicado no es un boleto sellado ni un premio cobrado. Donde la unidad no se publicó, el costo queda en «—».</p>
<div class="za-scroll" tabindex="0" role="region" aria-label="Cuadros 5y6"><table><thead><tr><th>Reunión</th><th>Cuadro</th><th>Estado</th><th>Aciertos</th><th>Combinaciones</th><th>Costo</th><th>Retorno teórico</th><th>Neto</th></tr></thead><tbody>${ticketRows}</tbody></table></div>
<h2>Cómo se cuenta</h2><ul>${Object.entries(D.metric_definitions).map(([k, v]) => `<li><strong>${esc({first: 'Primera selección', top3: 'Top 3', expanded: 'Cobertura ampliada', bombas: 'Bombas', anclas: 'Anclas', batacazos: 'Batacazos', fivesix: '5y6'}[k])}:</strong> ${esc(v)}</li>`).join('')}</ul></div>`, true);

/* ---------------- /metodologia ---------------- */
const G = [['Rating', 'Medida numérica del rendimiento reciente de cada ejemplar. Trabajamos con el promedio de sus últimas actuaciones y con la ventaja sobre el resto del lote.'],
  ['Remate', 'Cómo cierra el caballo los tramos finales de sus carreras. Un remate mejor (un registro más bajo) indica un final más fuerte.'],
  ['Tendencia', 'La dirección de los últimos registros: si el ejemplar viene subiendo, estable o bajando.'],
  ['Bomba', 'La señal más fuerte del sistema: el mismo caballo tiene el mejor rating y el mejor remate de la carrera. Sin esa convergencia de datos, no hay bomba.'],
  ['Ancla', 'Caballo con ventaja clara de rating sin ser el de mejor remate. Se usa como base de la combinación, pero no garantiza la victoria.'],
  ['Batacazo', 'Caballo con el mejor remate sin el mejor rating. Es la sorpresa que merece cobertura.'],
  ['Cobertura', 'Cuántos caballos entran en cada pata del cuadro. Más cobertura sube la probabilidad de acertar y también el costo.'],
  ['5y6', 'Apuesta sobre seis carreras válidas. Publicamos tres cuadros —Económica, Equilibrada (recomendada) y Blindada— con sus combinaciones y costo exactos.'],
  ['Versiones', 'Cada pronóstico declara la versión del sistema con que se hizo. Los resultados de versiones distintas no se mezclan sin avisarlo.'],
  ['Post-mortem', 'Después de cada reunión comparamos el pronóstico congelado con el resultado oficial, carrera por carrera, y anotamos qué funcionó, qué falló y por qué.']];
write('/metodologia', 'Metodología', 'Cómo trabaja Zona Caliente Pro: rating, remate, tendencia, bombas, anclas, batacazos, cobertura, 5y6, versiones del sistema y post-mortem.',
  hero('Metodología', 'Cómo llegamos a cada selección.', 'Zona Caliente Pro analiza cada carrera con datos de rendimiento y publica el pronóstico antes de la jornada. Después lo comparamos con el resultado oficial, sin cambiar lo publicado.') +
  `<div class="wrap">${subnav}<h2>Conceptos</h2><div class="za-glossary">${G.map(([t, d]) => `<article><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
<h2>El ciclo de cada reunión</h2><ol class="za-steps"><li><strong>Análisis.</strong> Rating, remate y tendencia de cada ejemplar; clasificación en bombas, anclas y batacazos.</li><li><strong>Publicación.</strong> El pronóstico y los tres cuadros se publican antes de la jornada en Telegram y en esta web, con su fecha y hora.</li><li><strong>Congelación.</strong> Guardamos la versión publicada con una huella digital (SHA-256). Desde ese momento no se cambia: solo se ajustan los cuadros por retiros oficiales, y el ajuste queda registrado.</li><li><strong>Resultado oficial.</strong> Se toma de la fuente oficial publicada y se cruza por número y nombre de cada caballo.</li><li><strong>Post-mortem.</strong> Se cuentan aciertos y fallos con numerador y denominador, y se registra el porqué.</li><li><strong>Aprendizaje.</strong> Los cambios de versión del sistema se deciden con esos registros, no con una jornada aislada.</li></ol>
<h2>Reglas del historial</h2><ul><li>Nunca se reconstruye un pronóstico a partir del resultado.</li><li>Cuando hay varias versiones de un pronóstico, vale la última publicada antes de la primera carrera, nunca la que mejor resultado habría dado.</li><li>Las correcciones se publican: el registro anterior queda visible, tachado.</li><li>Un cuadro acertado no equivale a un boleto sellado ni a un premio cobrado.</li><li>Toda métrica lleva su fracción y su universo.</li></ul>
<p class="za-callout"><strong>El análisis no garantiza resultados.</strong> Zona Caliente Pro es independiente y no está afiliada al INH. Juega con responsabilidad. Solo para mayores de 18 años.</p></div>`);

/* ---------------- /resultados/<reunión> ---------------- */
const nums = (arr, win) => arr.length ? arr.map(n => `<span class="num">${esc(n)}</span>${n === win ? '<span class="za-ok" aria-label="ganador">✓</span>' : ''}`).join(' ') : '—';
function resultPage(m) {
  const raceRows = m.races.map(r => `<tr><th scope="row">${esc(r.label)}${r.valid ? ' <span class="za-tag">5y6</span>' : ''}</th><td>${nums(r.selections, r.winner)}</td><td>${nums(r.batacazos, r.winner)}</td><td>${r.bombas.length ? r.bombas.map(b => `<span class="za-tag za-t-BOMBA">#${esc(b)}</span>`).join('') : '—'}${r.anclas.map(a => `<span class="za-tag za-t-ANCLA">#${esc(a)}</span>`).join('')}</td><td>${r.winner === null ? '<span class="za-muted">sin dorsal</span> ' : `<span class="num">${esc(r.winner)}</span>`}${esc(r.winner_name)}</td><td>${!r.selections.length ? '—' : r.first ? '<span class="za-ok">1ª ✓</span>' : r.top3 ? '<span class="za-ok">Top 3 ✓</span>' : r.expanded ? '<span class="za-ok">Ampliada ✓</span>' : '<span class="za-no">No cubierto</span>'}</td></tr>`).join('');
  const tickets = m.tickets.map(t => `<article class="za-ticket${t.superseded ? '' : ''}"><p class="za-kicker">${esc(t.kind)}</p><h3>${esc(t.name)}</h3><div class="za-total">${t.hits}/6 <span>aciertos</span></div>
<ol>${t.legs.map((l, i) => `<li><span>V${i + 1}</span>${l.join(' - ')} ${t.leg_hits[i] ? '<span class="za-ok">✓</span>' : '<span class="za-no">✗</span>'}</li>`).join('')}</ol>
<p>${int(t.combinations)} combinaciones${t.combinations_correction ? ` · <strong>publicado como «${t.published_combinations}»</strong> (<a href="/historico#C-2026-004">C-2026-004</a>)` : ''}</p><p class="za-cost">Costo: ${bs(t.cost_bs)}</p>${t.hits >= 5 ? `<p>Retorno teórico: ${bs(t.theoretical_return_bs)} (${t.tickets_with_5 ? `${t.tickets_with_5} boletos con cinco` : 'seis aciertos'})</p>` : ''}${t.net_bs !== null ? `<p>Neto teórico: <strong>${bs(t.net_bs)}</strong></p>` : ''}</article>`).join('');
  const corr = D.corrections.filter(c => m.corrections.includes(c.id));
  const p = m.pre_race;
  return hero(`${esc(m.track)} · Reunión ${m.meeting} · ${esc(shortSys(m.system_version))}`, `${esc(m.track)} · ${esc(longDate(m.date))}`, '') +
  `<div class="wrap">${subnav}<p>${badge(m.status)}</p>${m.scope ? `<p class="za-notice">${esc(m.scope)}</p>` : ''}
<h2>Pronóstico publicado</h2><div class="za-card"><dl><dt>Evidencia</dt><dd>${esc(p.evidence)}${p.telegram_url ? ` · <a href="${esc(p.telegram_url)}" target="_blank" rel="noopener noreferrer">Ver en Telegram ↗</a>` : ''}</dd><dt>Publicado</dt><dd>${preTime(p)}${p.published_at && /Z$/.test(p.published_at) && !p.published_note ? ` · ${esc(utcShort(p.published_at))}` : ''}</dd><dt>Nivel</dt><dd>${esc(p.tier)}</dd>${p.text_sha256 ? `<dt>Huella</dt><dd><code>${short(p.text_sha256)}</code> (SHA-256 del texto publicado)</dd>` : ''}</dl></div>
<h2>Resultado oficial</h2><p>Fuente: <a href="${esc(m.official_result_source)}" target="_blank" rel="noopener noreferrer">${esc(m.official_result_source_name)} ↗</a></p>
${m.races_evaluated ? `<div class="za-kpis"><article class="za-kpi"><h3>Primera selección</h3><span class="za-frac">${m.first_pick.w} <small>/</small> ${m.first_pick.n}</span><span class="za-pct">${pct(m.first_pick.w, m.first_pick.n)}</span></article><article class="za-kpi"><h3>Top 3</h3><span class="za-frac">${m.top3.w} <small>/</small> ${m.top3.n}</span><span class="za-pct">${pct(m.top3.w, m.top3.n)}</span></article><article class="za-kpi"><h3>Cobertura ampliada</h3><span class="za-frac">${m.expanded.w} <small>/</small> ${m.expanded.n}</span><span class="za-pct">${pct(m.expanded.w, m.expanded.n)}</span></article></div>
<p class="za-universe">Universo: las ${m.races_evaluated} carreras de esta reunión con selección publicada · ${esc(shortSys(m.system_version))} · ${esc(m.status)}.</p>
<div class="za-scroll" tabindex="0" role="region" aria-label="Carrera por carrera"><table><thead><tr><th>Carrera</th><th>Nuestra lista</th><th>Batacazos</th><th>Bomba / ancla</th><th>Ganador oficial</th><th>Cobertura</th></tr></thead><tbody>${raceRows}</tbody></table></div>
<p class="za-small za-muted">Bombas ${frac(m.bombas)} · Anclas ${frac(m.anclas)} · Batacazos ${frac(m.batacazos)}</p>` : '<p class="za-muted">En esta reunión solo se evalúa el cuadro publicado: no hay pronóstico previo fechado de las carreras no válidas.</p>'}
<h2>Cuadros 5y6</h2><div class="za-tickets">${tickets}</div>
${m.partial.length || m.notes.length ? `<h2>Post-mortem y notas</h2><ul>${[...m.partial, ...m.notes].map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
${corr.length ? `<h2>Correcciones</h2>${corr.map(corrBlock).join('')}` : ''}
${m.previous_web_page ? `<p class="za-small za-muted">Ficha web original conservada: <a href="${esc(m.previous_web_page)}">${esc(m.previous_web_page)}</a></p>` : ''}</div>`;
}
for (const m of D.meetings) write('/resultados/' + m.slug, `${m.track} R${m.meeting} · ${ddmm(m.date)} · resultado auditado`, `Registro auditado de ${m.track}, reunión ${m.meeting} (${ddmm(m.date)}): pronóstico publicado, resultado oficial, cuadros 5y6 y correcciones.`, resultPage(m));

/* ---------------- /reuniones/<pronóstico previo> ---------------- */
function prePage(p) {
  const nv = p.races.filter(r => r.valid_leg === null), va = p.races.filter(r => r.valid_leg !== null);
  const horseLi = h => `<li><span class="za-rank">${h.rank ? h.rank + 'ª' : '·'}</span><span class="num${h.withdrawn ? ' out' : ''}">${esc(h.number)}</span><span class="za-horse">${esc(h.name)}</span> ${h.withdrawn ? '<span class="za-tag za-t-WITHDRAWN">RETIRADO</span>' : ''}${h.classes.filter(c => !['FAVORITE', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH'].includes(c)).map(c => `<span class="za-tag za-t-${esc(c)}">${esc(c === 'WARNING' ? 'Advertencia' : c === 'EXTERNAL_REFERENCE' ? 'Referencia externa' : c.replace('_', ' '))}</span>`).join('')}${h.reasoning ? `<p>${esc(h.reasoning)}</p>` : ''}</li>`;
  const race = r => `<section class="za-race" id="c${r.race}"><header><strong>C${r.race}${r.valid_leg ? ` · V${r.valid_leg}` : ''}</strong><span class="za-muted">${esc(r.time)} · ${int(r.distance)} m</span>${r.valid_leg ? '<span class="za-tag">5y6</span>' : '<span class="za-tag">No válida</span>'}</header>${r.note ? `<p class="za-small za-muted wrap-pad">&nbsp;${esc(r.note)}</p>` : ''}<ol>${r.horses.map(horseLi).join('')}</ol></section>`;
  const fav = p.races.map(r => { const h = r.horses.find(x => x.rank === 1); return `<li><strong>C${r.race}${r.valid_leg ? '/V' + r.valid_leg : ''}</strong> <span class="num">${esc(h.number)}</span>${esc(h.name)}</li>`; }).join('');
  const byClass = c => p.races.flatMap(r => r.horses.filter(h => h.classes.includes(c)).map(h => `<li><strong>C${r.race}${r.valid_leg ? '/V' + r.valid_leg : ''}</strong> <span class="num${h.withdrawn ? ' out' : ''}">${esc(h.number)}</span>${esc(h.name)}${h.withdrawn ? ' <span class="za-tag za-t-WITHDRAWN">RETIRADO</span>' : ''}</li>`)).join('') || '<li>Ninguna</li>';
  const ticket = t => `<article class="za-ticket${t.recommended ? ' za-rec' : ''}"><p class="za-kicker">${t.recommended ? 'Recomendada' : 'Cuadro 5y6'}</p><h3>${esc(t.name)}</h3><div class="za-total">${int(t.current.combinations)} <span>combinaciones</span></div>
<ol>${t.current.legs.map((l, i) => `<li><span>V${i + 1}</span>${l.join(' - ')}</li>`).join('')}</ol><p class="za-cost">${bs(t.current.cost_bs)}</p><p class="za-small">${int(t.current.combinations)} × Bs ${t.unit_bs}</p>
${t.withdrawal_adjusted ? `<p class="za-adj"><strong>Ajuste mecánico por retiro:</strong> ${t.adjustment.map(a => esc(a.event)).join(', ')}. Publicado: <del>${esc(t.published.line)} · ${int(t.published.combinations)} comb. · ${bs(t.published.cost_bs)}</del></p>` : ''}</article>`;
  const wd = p.withdrawals.map(w => w.identity === 'CONFIRMED' ? `<li><strong>C${w.race}</strong> <span class="num out">${w.number}</span>${esc(w.name)} — ${w.in_analysis ? 'estaba en nuestro análisis; sale de los cuadros' : 'no estaba en nuestras selecciones'}</li>` : `<li><strong>C${w.race}</strong> <span class="num out">${w.number}</span>${esc(w.note)}</li>`).join('');
  const tg = p.telegram.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Telegram @LaRectaCaliente ${esc(x.msg)} ↗</a> · ${esc(caracas(x.datetime))} Caracas (${esc(utcShort(x.datetime))}) · huella del texto <code>${short(x.text_sha256)}</code></li>`).join('');
  return hero(`${esc(p.track)} · Reunión ${p.meeting} · Sistema 3.3 ${esc(p.system_version)}`, `${esc(p.track)} · ${esc(longDate(p.date))}`, 'Pronóstico oficial publicado antes de la jornada. Todavía no hay resultado: esta página no marca ningún ganador.') +
  `<div class="wrap">${subnav}<div class="za-stamp"><span class="za-badge za-pre">PRONÓSTICO PREVIO</span>${badge(p.status)}</div>
<p class="za-stamp"><strong>PUBLICADO ANTES DE LA JORNADA</strong><span>Pronóstico registrado antes de la carrera · Telegram ${esc(p.telegram_ticket_msg)} · ${esc(caracas(p.SOURCE_PUBLISHED_AT))} (hora de Caracas)</span></p>
<details><summary>VER EVIDENCIA</summary><dl class="za-card"><dt>Publicación</dt><dd><ul>${tg}</ul></dd><dt>Análisis fuente</dt><dd>Huella SHA-256 <code>${short(p.SOURCE_SHA256)}</code></dd><dt>Pronóstico congelado</dt><dd>Huella SHA-256 <code>${short(p.DATASET_SHA256)}</code> · congelado el ${esc(caracas(p.PREDICTION_FROZEN_AT.replace(/\.\d+\+00:00$/, 'Z')))} (Caracas)</dd><dt>Versión</dt><dd>Sistema 3.3 ${esc(p.SYSTEM_VERSION)}</dd><dt>Retiros</dt><dd>Solo ajustes mecánicos por retiros oficiales; consultados hasta ${esc(caracas(p.withdrawals_as_of.replace(/^(\S+)T(\d\d:\d\d)Z.*$/, '$1T$2:00Z')))} (Caracas).</dd></dl><p class="za-small za-muted">La huella permite comprobar que el pronóstico guardado es idéntico al publicado. Solo mostramos los primeros caracteres.</p></details>
<h2>Retiros oficiales</h2><ul>${wd}</ul><p class="za-small za-muted">Los cuadros solo cambian por retiros oficiales confirmados. Fuente de retiros: Meridiano.</p>
<h2>Favoritos</h2><ul>${fav}</ul>
<div class="za-grid za-grid-3"><div class="za-card"><h3>Bombas</h3><ul>${byClass('BOMBA')}</ul></div><div class="za-card"><h3>Anclas</h3><ul>${byClass('ANCLA')}</ul></div><div class="za-card"><h3>Batacazos</h3><ul>${byClass('BATACAZO')}</ul></div></div>
<h2>No válidas</h2>${nv.map(race).join('')}
<h2>5y6 · las seis válidas</h2>${va.map(race).join('')}
<h2>Cuadros 5y6</h2><div class="za-tickets">${p.tickets.map(ticket).join('')}</div>
<p class="za-small za-muted">Valor de la combinación: Bs 35. El costo total es combinaciones × Bs 35. Verifica retiros y montos en el portal oficial antes de jugar.</p>
<p class="za-notice">Después de la jornada, el resultado oficial se publicará en <a href="/resultados">Resultados</a> junto a este mismo pronóstico, sin modificarlo.</p></div>`;
}
for (const p of pre) write('/reuniones/' + p.slug, `${p.track} R${p.meeting} · ${ddmm(p.date)} · pronóstico previo`, `Pronóstico previo de Zona Caliente Pro para ${p.track}, reunión ${p.meeting} (${ddmm(p.date)}): favoritos, bombas, anclas, batacazos y cuadros 5y6. Publicado antes de la jornada.`, prePage(p));

/* ---------------- /resultados ---------------- */
const resRows = [...pre.map(p => ({date: p.date, html: `<tr><th scope="row"><a href="/reuniones/${esc(p.slug)}">${esc(p.track)} R${p.meeting}</a></th><td>${esc(ddmm(p.date))}</td><td>${esc(p.system_version)}</td><td>${badge(p.status)}</td><td>Pronóstico previo publicado · resultado pendiente</td></tr>`})),
  ...D.meetings.map(m => ({date: m.date, html: `<tr><th scope="row"><a href="/resultados/${esc(m.slug)}">${esc(m.track)} R${m.meeting}</a></th><td>${esc(ddmm(m.date))}</td><td>${esc(m.system_version)}</td><td>${badge(m.status)}</td><td>${m.races_evaluated ? `Top 3 ${frac(m.top3)} · ` : ''}${best5y6(m)}</td></tr>`})),
  ...D.needs_evidence.map(m => ({date: m.date, html: `<tr><th scope="row"><a href="${esc(m.previous_web_page)}">${esc(m.track)} R${m.meeting}</a></th><td>${esc(ddmm(m.date))}</td><td>—</td><td>${badge(m.status)}</td><td>No se evalúa</td></tr>`}))].sort((a, b) => b.date.localeCompare(a.date));
write('/resultados', 'Resultados', 'Resultados de Zona Caliente Pro reunión por reunión, cotejados con el pronóstico publicado antes de cada jornada.',
  hero('Resultados', 'Resultado oficial frente a pronóstico previo.', 'Cada reunión enlaza su registro completo: qué publicamos, cuándo, qué dijo el resultado oficial y cuánto costaba cada cuadro.') +
  `<div class="wrap">${subnav}<div class="za-scroll" tabindex="0" role="region" aria-label="Resultados por reunión"><table><thead><tr><th>Reunión</th><th>Fecha</th><th>Versión</th><th>Estado</th><th>Resumen</th></tr></thead><tbody>${resRows.map(r => r.html).join('')}</tbody></table></div>
<p class="za-muted za-small">El archivo anterior a septiembre de 2026 se conserva en <a href="/reuniones">Reuniones</a>; no tiene evidencia fechada del pronóstico y no cuenta en las métricas.</p></div>`);

/* ---------------- sitemap ---------------- */
const sm = fs.readFileSync('sitemap.xml', 'utf8');
const add = routes.filter(r => !sm.includes(`https://cuadroperfecto.com${r}<`)).map(r => `<url><loc>https://cuadroperfecto.com${r}</loc></url>`).join('');
fs.writeFileSync('sitemap.xml', sm.replace('</urlset>', add + '</urlset>'));
fs.writeFileSync('data/zcp-audit-routes.json', JSON.stringify({routes, expected_prerace: EXPECTED_PRERACE}, null, 1) + '\n');
console.log('ZCP audit pages:', routes.length);
module.exports = {ratio};

/* Contenido editorial de portada: Valencia R25 (10/10/2026, resultados) y La Rinconada R40 (11/10/2026, pronóstico).
   Solo presentación: no toca motor, datasets ni snapshots. Cualquier cifra de cuadro se valida al compilar. */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const WHATSAPP = 'https://whatsapp.com/channel/0029Vb7FGL74IBhBg53SQ33J';
const TELEGRAM = 'https://t.me/LaRectaCaliente';
const UNIT_BS = 35;

// ---------- La Rinconada · Reunión 40 · 11/10/2026 (PRONÓSTICO) ----------
const retiros = [
  ['C7', 5, 'MOTHER CARMEN'], ['C11', 4, 'MONEY FOR YOU'], ['C12', 1, 'PITTALUGA'],
  ['C13', 4, 'NEIGH SAYER'], ['C13', 5, 'PROMETHEUS']
];

const noValidas = [
  {c:'C1', first:[6,'MAKE SENSE OF IT'], second:[7,'De Gala'], third:[1,'Muscle Maiden'], bat:[4,'Coronada en Gloria']},
  {c:'C2', first:[9,'DRA. BEA'], second:[5,'Prioritise'], third:[4,'Salome'], bat:[1,'Decidida']},
  {c:'C3', first:[4,'ALANA'], second:[8,'Super Explosiva'], third:[2,'Lelizamar'], bat:[7,'My Flirting Mate'], warn:'350 días sin correr'},
  {c:'C4', bomb:true, first:[3,'CALGARY'], second:[5,'Zio Giaccof'], third:[2,'The Last Dance']},
  {c:'C5', bomb:true, first:[5,'EKATI KING'], second:[3,'Rockville'], third:[1,'The Fieldher Jr']},
  {c:'C6', bomb:true, first:[9,'QUANTUM LEAP'], second:[5,"Pharoah's Dynasty"], third:[7,'The Notoriou']},
  {c:'C7', first:[1,'COMPADRE PECHE'], second:[6,'Ponsigue'], third:[4,'Black Stone'], open:true}
];

const validas = [
  {v:'V1', c:'C8', time:'4:05pm', picks:[[11,'COFFEE TIME'],[3,'ELORZA PRINCESS'],[10,'BOILED MILK']], ext:[5,'NOSTRA VITTORIA','Ampliada']},
  {v:'V2', c:'C9', time:'4:35pm', picks:[[3,'CHOSEN FACTOR','bomba'],[9,'DANCE TO REMEMBER','ancla'],[6,'BELLA CATIRA'],[8,"ETNA'S NAPPER"]]},
  {v:'V3', c:'C10', time:'5:05pm', picks:[[9,'VICTORY ROSE'],[1,'BELIEVE ANDREW'],[7,'ISOCORICO']]},
  {v:'V4', c:'C11', time:'5:35pm', picks:[[6,'EL ABUSADOR','bomba'],[7,'GRAN ANDRES'],[2,'JESUSVIÑA']], note:'#4 Money For You, retirado.'},
  {v:'V5', c:'C12', time:'6:05pm', picks:[[8,'SOLANA','bomba'],[5,'EASYASYOUPLEASE'],[7,'TINTA FINA'],[3,'MISS PAOLA']]},
  {v:'V6', c:'C13', time:'6:35pm', picks:[[9,'EL IRLANDES','bomba'],[7,'BIG VALDI'],[6,'ZORRO VIEJO'],[2,'KING JULIEN']]}
];

const jugadas = [
  {id:'economica', name:'Económica', combos:32, cost:'1.120 Bs', legs:[[11,3],[3,9],[9,1],[6],[8,5],[9,7]]},
  {id:'equilibrada', name:'Equilibrada', combos:216, cost:'7.560 Bs', rec:true, legs:[[11,3,10],[3,9],[9,1,7],[6,7],[8,5],[9,7,6]]},
  {id:'blindada', name:'Blindada', combos:648, cost:'22.680 Bs', legs:[[11,3,10],[3,9,6],[9,1,7],[6,7],[8,5,7],[9,7,6,2]]}
];
const fmt = n => n.toLocaleString('es-VE');
for (const j of jugadas) { // QA de compilación: combinaciones y costo exactos
  const total = j.legs.reduce((a, l) => a * l.length, 1);
  if (total !== j.combos) throw new Error(`${j.name}: ${total} combinaciones, esperado ${j.combos}`);
  if (fmt(total * UNIT_BS) + ' Bs' !== j.cost) throw new Error(`${j.name}: costo ${fmt(total * UNIT_BS)} != ${j.cost}`);
  validas.forEach((v, i) => {
    const known = new Set(v.picks.map(p => p[0]).concat(v.ext ? [v.ext[0]] : []));
    j.legs[i].forEach(n => { if (!known.has(n)) throw new Error(`${j.name} ${v.v}: #${n} fuera del cuadro`); });
  });
}

const bombas = [
  ['CALGARY',3,'C4','Promedio 82,25 · R11,2'],
  ['EKATI KING',5,'C5','94-95-92-93 · Promedio 93,5'],
  ['QUANTUM LEAP',9,'C6','79→81→82 · R11,3'],
  ['CHOSEN FACTOR',3,'V2','75→79→90→95 · R12'],
  ['EL ABUSADOR',6,'V4','90 / 90 últimas · 2 victorias en 3 · R11,4'],
  ['SOLANA',8,'V5','62-61-69→87 · R11,3'],
  ['EL IRLANDES',9,'V6','Promedio 86,75 · R11,2']
];

const batacazos = [
  ['Coronada en Gloria',4,'C1'],['Decidida',1,'C2'],['My Flirting Mate',7,'C3'],['Maximus Fortune',8,'C4'],
  ['The Fieldher Jr',1,'C5'],['The Notoriou',7,'C6'],['Colossus',3,'C7'],['Nostra Vittoria',5,'V1'],
  ['Bella Catira',6,'V2'],['Believe Andrew',1,'V3'],['Jesusviña',2,'V4'],['Tinta Fina',7,'V5'],['Zorro Viejo',6,'V6']
];

// ---------- Valencia · Reunión 25 · 10/10/2026 (RESULTADO VERIFICADO) ----------
const valNoValidas = [
  {c:'C1', name:'GRAN CANELO', n:1, extra:'Exacta perfecta: 1-5 con Divergente'},
  {c:'C2', name:'CATIRA MERCEDES', n:5},
  {c:'C3', name:'CLOVER TIME', n:8, extra:'Exacta boxeada: 8-7 con Astrofisico'}
];
const valValidas = [
  {v:'V1', name:'CHARLIE', n:6, ok:false},
  {v:'V2', name:'CASSIUSCLAY', n:8, ok:true},
  {v:'V3', name:'SKULL TROOPER', n:4, ok:true},
  {v:'V4', name:'STELLA CADENTE', n:7, ok:true, anchor:true},
  {v:'V5', name:'STRENGTH ROMA', n:3, ok:true},
  {v:'V6', name:'LUISACACERES', n:6, ok:true}
];

// ---------- piezas ----------
const num = n => `<b class="zr-num">${esc(n)}</b>`;
const horse = (n, name) => `${num(n)} ${esc(name)}`;
const tag = (kind) => kind === 'bomba'
  ? '<span class="zr-tag zr-tag-bomb"><span aria-hidden="true">💣</span> Bomba</span>'
  : '<span class="zr-tag zr-tag-anchor"><span aria-hidden="true">⚓</span> Ancla</span>';

function hero() {
  return `<section class="zr-hero" aria-labelledby="zr-hero-title">
<div class="zr-hero-copy"><p class="eyebrow">ZONA CALIENTE PRO · <span class="zr-badge">SISTEMA 4.0</span></p>
<h1 id="zr-hero-title">AYER 5 DE 6.<br>HOY VAMOS POR LA RINCONADA.</h1>
<p class="zr-lead">Análisis • Rating • Remate • Cobertura • Mejora continua</p>
<div class="zr-kpis zr-kpis-hero">
<article><strong>5/6</strong><span>VÁLIDAS<br>Valencia 10/10</span></article>
<article><strong>89%</strong><span>GANADOR<br>CUBIERTO</span></article>
<article><strong>3/3</strong><span>NO<br>VÁLIDAS</span></article>
</div>
<div class="zr-actions"><a class="btn zr-btn-main" href="#rinconada-r40">VER CUADRO DE HOY</a><a class="zr-btn-ghost" href="#valencia-r25">VER RESULTADOS DE VALENCIA</a></div>
<small class="independence">Pronósticos de análisis; no garantizan resultados. Portal oficial de apuestas externo (INH): Cuadro Perfecto es independiente.</small>
</div></section>`;
}

function rinconada() {
  const ret = retiros.map(([c, n, name]) => `<li><b>${esc(c)}</b> ${horse(n, name)}</li>`).join('');
  const nv = noValidas.map(r => `<article class="zr-card${r.bomb ? ' zr-card-bomb' : ''}${r.open ? ' zr-card-open' : ''}">
<header><span class="zr-race">${esc(r.c)}</span>${r.bomb ? tag('bomba') : ''}${r.open ? '<span class="zr-tag">Carrera abierta</span>' : ''}</header>
<h4>${horse(r.first[0], r.first[1])}</h4>
<p class="zr-place"><span>2ª</span> ${horse(r.second[0], r.second[1])}</p>
<p class="zr-place"><span>3ª</span> ${horse(r.third[0], r.third[1])}</p>
${r.bat ? `<p class="zr-bat">Batacazo: ${horse(r.bat[0], r.bat[1])}</p>` : ''}
${r.warn ? `<p class="zr-warn">Advertencia: ${esc(r.warn)}</p>` : ''}
</article>`).join('');

  return `<section class="zr-section" id="rinconada-r40" aria-labelledby="zr-rin-title">
<div class="zr-head"><div><p class="eyebrow">LA RINCONADA · REUNIÓN 40 · 13 CARRERAS · SISTEMA 4.0</p>
<h2 id="zr-rin-title">La Rinconada · domingo 11/10/2026</h2></div>
<span class="zr-badge zr-badge-big">VERSIÓN FINAL POST-RETIROS</span></div>
<p class="zr-note">Esto es pronóstico: selecciones fijadas antes de las carreras, sin ningún ejemplar marcado como ganador.</p>
<div class="zr-alert" role="note"><h3>RETIROS CONFIRMADOS</h3><ul>${ret}</ul>
<p><strong>Mother Carmen era una bomba del sistema.</strong> Al retirarse, C7 perdió la convergencia necesaria y pasó a carrera abierta. <em>Sin dato, no hay bomba.</em></p></div>
<h3 class="zr-sub">No válidas · C1 a C7</h3>
<div class="zr-grid zr-grid-3">${nv}</div>
</section>`;
}

function cuadro() {
  const legs = validas.map(v => `<article class="zr-card zr-leg">
<header><span class="zr-race">${esc(v.v)}</span><span class="zr-meta">${esc(v.c)} · ${esc(v.time)}</span></header>
<ul class="zr-picks">${v.picks.map(p => `<li>${horse(p[0], p[1])}${p[2] ? ' ' + tag(p[2]) : ''}</li>`).join('')}</ul>
${v.ext ? `<p class="zr-ext"><span class="zr-tag">${esc(v.ext[2])}</span> ${horse(v.ext[0], v.ext[1])}</p>` : ''}
${v.note ? `<p class="zr-warn">${esc(v.note)}</p>` : ''}
</article>`).join('');

  const tickets = jugadas.map(j => `<article class="zr-ticket${j.rec ? ' zr-ticket-rec' : ''}">
${j.rec ? '<p class="zr-ribbon">RECOMENDADA</p>' : ''}
<h4>${esc(j.name)}</h4>
<p class="zr-cost"><strong>${esc(j.cost)}</strong><span>${fmt(j.combos)} combinaciones</span></p>
<ol class="zr-legs">${j.legs.map((l, i) => `<li><span>V${i + 1}</span>${l.map(n => num(n)).join('<i>-</i>')}</li>`).join('')}</ol>
</article>`).join('');

  return `<section class="zr-section" id="cuadro-5y6" aria-labelledby="zr-5y6-title">
<div class="zr-head"><div><p class="eyebrow">LA RINCONADA · 11/10/2026 · C8 A C13</p><h2 id="zr-5y6-title">Cuadro Perfecto 5Y6</h2></div></div>
<div class="zr-grid zr-grid-3">${legs}</div>
<h3 class="zr-sub">Las tres jugadas</h3>
<div class="zr-grid zr-grid-3 zr-tickets">${tickets}</div>
<div class="zr-strategy"><h3>AYER APRENDIMOS. HOY AJUSTAMOS.</h3>
<p>En Valencia acertamos 5 de 6, pero cubrimos demasiado para el dividendo obtenido.</p>
<p>Hoy cerramos donde los datos muestran mayor convergencia y concentramos la cobertura en las patas más abiertas: <strong>V1 y V3 concentran la mayor incertidumbre.</strong></p>
<p class="zr-muted">El ajuste de cobertura no garantiza rentabilidad.</p></div>
</section>`;
}

function bombasSection() {
  const rows = bombas.map(([name, n, where, ctx]) => `<article class="zr-card zr-card-bomb"><header><span class="zr-race">${esc(where)}</span>${tag('bomba')}</header><h4>${horse(n, name)}</h4><p class="zr-ctx">${esc(ctx)}</p></article>`).join('');
  const bat = batacazos.map(([name, n, where]) => `<li><span class="zr-race">${esc(where)}</span> ${horse(n, name)}</li>`).join('');
  return `<section class="zr-section" id="bombas" aria-labelledby="zr-bombas-title">
<div class="zr-head"><div><p class="eyebrow">LA RINCONADA · 11/10/2026</p><h2 id="zr-bombas-title">7 bombas</h2></div></div>
<p class="zr-note">Tres en las no válidas (C4, C5, C6) y cuatro en el 5Y6 (V2, V4, V5, V6).</p>
<div class="zr-grid zr-grid-3">${rows}</div>
<h3 class="zr-sub">Batacazos</h3>
<ul class="zr-chips">${bat}</ul>
</section>`;
}

function valencia() {
  const nv = valNoValidas.map(r => `<article class="zr-card zr-card-win"><header><span class="zr-race">${esc(r.c)}</span><span class="zr-tag zr-tag-ok">GANÓ</span></header><h4>${horse(r.n, r.name)}</h4>${r.extra ? `<p class="zr-ctx">${esc(r.extra)}</p>` : ''}</article>`).join('');
  const va = valValidas.map(r => `<article class="zr-card ${r.ok ? 'zr-card-win' : 'zr-card-miss'}"><header><span class="zr-race">${esc(r.v)}</span><span class="zr-tag ${r.ok ? 'zr-tag-ok' : 'zr-tag-miss'}">${r.ok ? '✅ CUBIERTO' : '❌ NO CUBIERTO'}</span></header><h4>${horse(r.n, r.name)}</h4>${r.anchor ? '<p class="zr-ctx">Fija / ancla · ganó</p>' : ''}</article>`).join('');
  return `<section class="zr-section zr-valencia" id="valencia-r25" aria-labelledby="zr-val-title">
<div class="zr-head"><div><p class="eyebrow">VALENCIA · REUNIÓN 25 · 10/10/2026 · RESULTADO VERIFICADO</p>
<h2 id="zr-val-title">VALENCIA: 5 DE 6 EN EL CUADRO PERFECTO</h2><p class="zr-lead zr-lead-dark"><del>Nuestro mejor registro histórico en Valencia</del> · Ganador cubierto: 8 de 9 carreras evaluadas (88,9%) · <a href="/historico#C-2026-005">Corrección C-2026-005</a></p></div></div>
<div class="zr-kpis zr-kpis-light">
<article><strong>8/9</strong><span>GANADOR CUBIERTO<br>88,9% · 9 carreras evaluadas</span></article>
<article><strong>100%</strong><span>NO VÁLIDAS<br>3/3</span></article>
<article><strong>83%</strong><span>VÁLIDAS 5Y6<br>5/6</span></article>
<article><strong>2</strong><span>EXACTAS<br>ACERTADAS</span></article>
</div>
<h3 class="zr-sub">No válidas · 3/3</h3><div class="zr-grid zr-grid-3">${nv}</div>
<h3 class="zr-sub">5Y6 · 5 de 6</h3><div class="zr-grid zr-grid-3">${va}</div>
<div class="zr-highlight"><p class="eyebrow">EL ANCLA RESPONDIÓ</p><h3>${horse(7, 'STELLA CADENTE')} · SR 101</h3><p>Mejor rating del día. Fue nuestra fija y ganó.</p></div>
<div class="zr-money" id="valencia-economia"><h3>ACERTAR Y COBRAR NO SON LO MISMO</h3>
<p>El dividendo con 5 pagó <strong>1.453,52 Bs</strong>. Hubo <strong>17.292 boletos con cinco</strong>.</p>
<dl><div><dt>Jugada Equilibrada · costo</dt><dd>10.080 Bs</dd></div><div><dt>Cobro declarado</dt><dd>3 boletos × 1.453,52 Bs = 4.360,56 Bs</dd></div><div><dt>Resultado económico</dt><dd class="zr-neg">NEGATIVO</dd></div></dl>
<p>El análisis cubrió 8 de 9 ganadores, pero la cobertura fue demasiado costosa para el dividendo obtenido.</p>
<p><strong>El siguiente ajuste del sistema se concentra en eficiencia de cobertura.</strong></p></div>
<div class="zr-learn"><h3>LO QUE APRENDIMOS</h3><ol>
<li>El mejor rating puede ganar cuando la ventaja sobre el lote es suficientemente grande. Caso: Stella Cadente.</li>
<li>Las bombas siguen mostrando tendencia a colocación: Gran Canelo ganó, Astrofisico llegó 2°, Vermelho 2° y Luz del Valle 3°. King of Success sufrió incidente de pista.</li>
<li>La hipótesis de «mejor remate» sigue <strong>en prueba</strong>: no es una regla validada.</li></ol></div>
</section>`;
}

function social(cls = '') {
  return `<div class="zr-social ${cls}"><a class="btn zr-wa" href="${WHATSAPP}" target="_blank" rel="noopener noreferrer">ÚNETE A WHATSAPP ↗</a><a class="btn zr-tg" href="${TELEGRAM}" target="_blank" rel="noopener noreferrer">SEGUIR EN TELEGRAM ↗</a></div>`;
}

function historyHeading() {
  return `<div class="section-heading zr-history-head" id="historial-reciente"><div><p class="eyebrow">Historial</p><h2>Jornadas y resultados anteriores</h2></div></div>`;
}

function historyCards() {
  return `<article class="card"><p>2026-10-11</p><h2>La Rinconada · R40</h2><a href="/resultados/la-rinconada-reunion-40-11-octubre-2026">Ver registro auditado</a></article><article class="card"><p>2026-10-10</p><h2>Valencia · R25 · 5/6</h2><a href="/resultados/valencia-reunion-25-10-octubre-2026">Ver registro auditado</a></article>`;
}

module.exports = {hero, rinconada, cuadro, bombasSection, valencia, social, historyHeading, historyCards, WHATSAPP, TELEGRAM,
  seo: {
    title: 'Zona Caliente Pro | Cuadro Perfecto 5Y6 — Valencia 17/10 y La Rinconada 18/10/2026',
    description: 'Pronóstico previo de Valencia (17/10) y La Rinconada (18/10): favoritos, bombas, batacazos y cuadros 5y6, publicado antes de la jornada. Historial auditable con numerador y denominador.'
  }};

/* Progressive, static-first jornada interface. All remote content is escaped. */
const root = document.getElementById('main');
const model = window.ZCP;
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateES = value => new Intl.DateTimeFormat('es-VE',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Caracas'}).format(new Date(`${value}T12:00:00-04:00`));
const tierName = tier => ({PRESENTADO:'Económico',RECOMENDADO:'Recomendado',PREMIUM:'Completo'}[tier] || tier);
const roles = {FAVORITO_ZCP:'Favorito ZCP',ENEMIGO:'Enemigo',SORPRESA:'Bomba / sorpresa',BASE:'Base'};
const link = (path,text,cls='') => `<a href="${esc(path)}" class="${cls}" data-route>${text}</a>`;
const external = (url,text,cls='') => model.safeURL(url) ? `<a href="${esc(url)}" class="${cls}" target="_blank" rel="noopener noreferrer">${text} ↗<span class="sr-only"> (sitio externo, abre otra pestaña)</span></a>` : '';
let store;
let warning = '';
let loading = false;
let visibleMeeting=null;
const section = (title,body,id='') => `<section class="section" ${id?`id="${id}"`:''}><div class="wrap"><h2>${title}</h2>${body}</div></section>`;
const empty = text => `<p class="empty">${text}</p>`;
function meetingStatus(m) {return m.races.length && m.races.every(r=>model.confirmedResult(m,r,store.events))?'FINALIZADA':m.status;}
function title(m) {return `${esc(m.track)}${m.meeting_number ? ` · Reunión ${m.meeting_number}`:''}`;}
function officialCTA() {return `<div class="official">${external('https://apuestas.inh.gob.ve/','Jugar 5y6 en INH','btn')}<small>Portal oficial externo. Zona Caliente Pro es independiente y no está afiliada al INH.</small></div>`;}
function agenda(meetings,current) {
 const upcoming = meetings.filter(m=>m.status!=='FINALIZADA' && m.date>=current.date).sort((a,b)=>a.date.localeCompare(b.date));
 return `<nav class="agenda" aria-label="Calendario de jornadas">${upcoming.map(m=>link(`/reuniones/${m.slug}`,`<span>${esc(dateES(m.date))}</span><strong>${esc(m.track)}</strong>`,m.id===current.id?'selected':'')).join('')}</nav>`;
}
function legacyResult(m,r) {
 return m.results?.race_results?.find(x=>x.race_label===r.public_label || (r.kind==='5Y6' ? model.legNumber(x.race_label)===model.legNumber(r.public_label) : x.race_label.split(/[ /]/)[0]===r.public_label));
}
function raceCard(m,r,index) {
 const {result,hit} = model.outcome(m,r,store.events,store.snapshots);
 const favorite = r.horses.find(h=>h.role==='FAVORITO_ZCP');
 const old = legacyResult(m,r);
 const status = result ? 'Resultado oficial' : old ? 'Resultado de archivo' : m.date<today()?'Resultado pendiente':'Por correr · horario por confirmar';
 const badges = r.horses.map(h=>`<tr><th scope="row"><b class="number">${esc(h.number)}</b> ${esc(h.name)}</th><td>${esc(roles[h.role] || h.role || 'Sin selección')}</td><td>${esc(h.jockey || 'Por confirmar')}</td><td>${esc(h.trainer || 'Por confirmar')}</td><td>${esc(h.speed_rating ?? h.sr ?? '—')}</td><td>${esc(Array.isArray(h.recent_form)?h.recent_form.join(' · '):h.recent_form || '—')}</td><td>${esc(typeof h.workouts==='string'?h.workouts:h.workouts?JSON.stringify(h.workouts):'—')}</td></tr>`).join('');
 return `<article class="race" id="carrera-${index+1}"><div class="race-top"><div class="race-index">${String(index+1).padStart(2,'0')}</div><div><div class="eyebrow">${esc(r.kind==='5Y6'?'5y6 Nacional':'No válida')} · ${esc(r.public_label)}</div><h3>${esc(r.time || 'Hora pendiente')} <small>· ${esc(r.distance || 'Distancia pendiente')}</small></h3></div><span class="pill">${status}</span></div><div class="race-body"><div class="selection"><span>NUESTRA SELECCIÓN</span><strong>${favorite?`<b class="number">${esc(favorite.number)}</b> ${esc(favorite.name)}`:'Favorito pendiente'}</strong><p>${esc(r.analysis || 'Argumento del sistema pendiente de publicación.')}</p></div>${result?`<div class="result"><strong>Ganador: ${result.winner_numbers.map(n=>'#'+esc(n)).join(' / ')} ${esc(result.winner_name||'')}</strong> · ${hit===null?'Acierto no verificable con evidencia pre-carrera':hit?'Acertó nuestro favorito':'No acertó nuestro favorito'} ${external(result.source_url,'Ver fuente oficial')}</div>`:old?`<p class="callout">${esc(old.official_result_raw)}<br><small>Registro heredado; sin fuente individual verificada. Excluido de aciertos verificados.</small></p>`:''}<details><summary>Ver ejemplares y datos disponibles (${r.horses.length})</summary><p class="muted">Selecciones registradas; no constituyen la nómina oficial completa. SR = Speed Rating. «—» indica un dato no disponible.</p><div class="table-scroll" tabindex="0" role="region" aria-label="Ejemplares de ${esc(r.public_label)}"><table><thead><tr><th>Ejemplar</th><th>Selección</th><th>Jinete</th><th>Entrenador</th><th>SR</th><th>Forma</th><th>Trabajos</th></tr></thead><tbody>${badges}</tbody></table></div></details></div></article>`;
}
function ticketCard(m,t) {
 const total=model.combinations(t.legs);
 const outcome=model.ticketOutcome(m,t,store.events,store.snapshots);
 return `<article class="ticket ${t.tier==='RECOMENDADO'?'recommended':''}"><div class="eyebrow">${t.tier==='RECOMENDADO'?'SELECCIÓN CENTRAL':'CUADRO PERFECTO'}</div><h3>${esc(tierName(t.tier))}</h3><div class="ticket-total">${total===null?'—':total.toLocaleString('es-VE')}<span>combinaciones</span></div><ol class="legs">${Object.entries(t.legs).sort(([a],[b])=>model.legNumber(a)-model.legNumber(b)).map(([leg,picks])=>`<li><span>${esc(leg)}</span><strong>${picks.map(esc).join(' · ')||'Pendiente'}</strong></li>`).join('')}</ol><p>${m.unit_value && total?`Importe: ${(total*m.unit_value).toLocaleString('es-VE')} Bs`:'Importe pendiente del valor oficial de la unidad.'}</p>${outcome?`<p class="pill">${outcome.hits}/6 · ${outcome.verified?'Cotejado con pronóstico previo':'Sin evidencia temporal suficiente'}</p>`:''}</article>`;
}
function streamPlayer(b) {
 if(!b)return '';
 const url=new URL(b.url);const id=url.hostname==='youtu.be'?url.pathname.slice(1):['www.youtube.com','youtube.com'].includes(url.hostname)?(url.searchParams.get('v')||url.pathname.match(/^\/(?:live|embed)\/([\w-]+)/)?.[1]):null;
 return id && /^[\w-]{11}$/.test(id)?'<iframe class="stream-player" title="Transmisión oficial de la jornada" src="https://www.youtube-nocookie.com/embed/'+id+'" loading="lazy" allow="fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>':'';
}
function live(m) {
 const broadcast=store.channels.broadcasts?.find(b=>b.meeting_id===m.id && b.verified_at && model.safeURL(b.source_url) && model.safeURL(b.url));
 const liveNow=broadcast?.status==='live' && Date.parse(broadcast.valid_until)>Date.now();
 const events=store.events.filter(e=>e.meeting_id===m.id).slice().reverse();
 return section('La jornada en vivo',`<div class="live-layout"><div class="broadcast"><div class="eyebrow">TRANSMISIÓN OFICIAL</div><h3>${broadcast?(liveNow?'En vivo':broadcast.status==='ended'?'Repetición de la jornada':'Transmisión programada'):'Esperando enlace de esta jornada'}</h3><p>${broadcast?'La transmisión se abre en el canal de origen.':'Publicaremos aquí la transmisión cuando se confirme el enlace oficial de esta reunión.'}</p>${broadcast?streamPlayer(broadcast)+external(broadcast.url,'Abrir transmisión oficial','btn'):external('https://t.me/s/INHOficial','Consultar avisos oficiales del INH')}</div><div id="live-feed"><h3>Minuto a minuto</h3>${events.length?events.map(e=>`<article class="feed-item"><time>${esc(new Date(e.occurred_at).toLocaleString('es-VE',{timeZone:'America/Caracas'}))}</time><p>${esc(e.message)}</p>${external(e.source_url,'Fuente')}</article>`).join(''):empty('Todavía no hay avisos confirmados de salida ni resultados para esta jornada.')}</div></div>`,'en-vivo');
}
function banner(m) {
 return '<section class="broadcast-banner" aria-label="Zona Caliente Pro TV"><div class="broadcast-brand"><span class="broadcast-kicker">CUADROPERFECTO · TV</span><p class="broadcast-wordmark">ZONA<br>CALIENTE<span>PRO</span></p><div class="broadcast-rule"></div><p class="broadcast-track">'+esc(m.track)+'</p><a class="broadcast-live-link" href="#en-vivo">Transmisión de la jornada <span aria-hidden="true">↗</span></a></div><div class="broadcast-screen"><div class="broadcast-screen-top"><span class="archive-tag">ARCHIVO OFICIAL</span><span>LA RINCONADA · 13 SEP 2026</span></div>'+'<div id="archive-player"><button id="play-archive" class="video-cover" aria-label="Reproducir carrera real: La Rinconada, 13 de septiembre de 2026"><img src="https://i.ytimg.com/vi/T8xrWacjvsQ/hqdefault.jpg" alt="Carrera oficial de La Rinconada" width="480" height="360"><span class="play-circle" aria-hidden="true">▶</span><span class="play-caption">VER CARRERA</span></button></div>'+'<div class="broadcast-caption"><span>Carrera 14 · Reunión 36</span>'+external('https://youtu.be/T8xrWacjvsQ','Ver en YouTube')+'</div></div></section><details class="promo-library"><summary>Videos de Zona Caliente Pro</summary><div id="promo-media"><video controls muted playsinline preload="none" poster="/assets/banner-poster.webp" aria-label="Video promocional de Zona Caliente Pro"><source src="/assets/promo.mp4" type="video/mp4"></video></div><label class="promo-choice">Video promocional <select id="promo-choice"><option value="promo.mp4">Promoción 1</option><option value="promo2.mp4">Promoción 2</option><option value="promo3.mp4">Promoción 3</option><option value="promo4.mp4">Promoción 4</option></select></label></details>';
}
function meeting(m,home=false) {
 visibleMeeting=m;
 const races=model.orderedRaces(m);
 if(!races.some(r=>r.kind==='5Y6') && m.tickets.length)for(let leg=1;leg<=6;leg++)races.push({public_label:leg+'V',kind:'5Y6',horses:[],analysis:'Selecciones del cuadro recomendado: '+(m.tickets.find(t=>t.tier==='RECOMENDADO')?.legs[leg+'V']||[]).map(n=>'#'+n).join(', ')+'. Ficha oficial pendiente.'});
 root.innerHTML=`<div class="wrap">${agenda(store.meetings,m)}${banner(m)}<header class="meeting-header"><div><div class="eyebrow">${esc(dateES(m.date))} · VENEZUELA</div><h1>${title(m)}</h1><p>Análisis carrera por carrera. Pronósticos que quedan registrados.</p></div><span class="pill">${esc(meetingStatus(m))}</span></header><nav class="section-nav" aria-label="Secciones de la jornada"><a href="#carreras">Carreras</a><a href="#cuadro">Cuadros 5y6</a><a href="#en-vivo">En vivo</a>${link('/estadisticas','Estadísticas')}${link('/resultados','Historial')}</nav>${warning?`<p role="status" class="callout">${esc(warning)}</p>`:''}</div>${section('Programa de carreras',`<div class="program-heading"><p>Orden de la jornada · ${m.races.length} fichas publicadas · Horarios de Venezuela</p><a href="#cuadro">Ir a los tres cuadros ↓</a></div>${m.track==='Valencia' && m.races.filter(r=>r.kind==='5Y6').length<6?empty('El archivo de Valencia aún no contiene las fichas de las seis válidas. Puedes consultar los tres cuadros más abajo. Las fichas pendientes se publicarán al completar el programa.') : ''}<div class="race-list">${races.map((r,i)=>raceCard(m,r,i)).join('') || empty('Programa por confirmar.')}</div>`,'carreras')}${section('Cuadro Perfecto 5y6',`<p>Tres coberturas para la misma jornada. Las combinaciones se calculan a partir de cada selección.</p><div class="tickets">${m.tickets.slice().sort((a,b)=>['PRESENTADO','RECOMENDADO','PREMIUM'].indexOf(a.tier)-['PRESENTADO','RECOMENDADO','PREMIUM'].indexOf(b.tier)).map(t=>ticketCard(m,t)).join('')}</div>${officialCTA()}`,'cuadro')}${section('Señales del sistema',`<div class="archive-grid"><article class="card"><h3>Bases</h3><p>${(m.intelligence?.bases||[]).map(esc).join('<br>')||'Sin base publicada.'}</p></article><article class="card"><h3>Bombas y sorpresas</h3><p>${(m.intelligence?.bombas||[]).map(b=>typeof b==='string'?esc(b):esc(b.race)+' · #'+esc(b.number)+' '+esc(b.name)).join('<br>')||'Sin selección publicada.'}</p></article><article class="card"><h3>Alertas y retirados</h3><p>${[...(m.intelligence?.alertas||[]),...(m.intelligence?.retirados||[])].map(a=>esc(typeof a==='object'?JSON.stringify(a):a)).join('<br>')||'Pendiente de confirmación oficial.'}</p></article></div>`)}${live(m)}${section('Antes de jugar',`<p>Verifica retiros, cambios de monta, pista y valor oficial de la unidad. ${Object.values(m.gate||{}).every(v=>v===true)?'Revisión registrada.':'La validación final de esta jornada sigue pendiente.'}</p><details><summary>Consultar registro del pronóstico</summary><p>Referencia: ${esc(m.analysis_snapshot_id||'Pendiente')}.</p><p>Los resultados posteriores no sustituyen las selecciones previas.</p>${external('https://cuadroperfecto.com/data/analysis-snapshots.json','Archivo de pronósticos')}</details>`)}`;
 document.getElementById('play-archive').addEventListener('click',()=>{document.getElementById('archive-player').innerHTML=streamPlayer({url:'https://youtu.be/T8xrWacjvsQ'});});
 document.getElementById('promo-choice').addEventListener('change',e=>{const media=document.getElementById('promo-media');media.innerHTML=e.target.value==='official-archive'?streamPlayer({url:'https://youtu.be/T8xrWacjvsQ'})+'<p>Archivo · La Rinconada, 13/09/2026 · C14. '+external('https://t.me/INHOficial/24359','Fuente oficial')+'</p>':'<video controls muted playsinline preload="none" poster="/assets/banner-poster.webp" aria-label="Video promocional de Zona Caliente Pro"><source src="/assets/'+esc(e.target.value)+'" type="video/mp4"></video>'; });
 document.title=`${home?'Zona Caliente Pro · ':''}${m.track} ${m.date} | Cuadro Perfecto`;
}
function archive() {
 root.innerHTML=section('Calendario y archivo',`<p>Jornadas próximas en orden cronológico. El archivo conserva las reuniones anteriores.</p>${['Próximas jornadas','Archivo'].map((label,i)=>`<h2>${label}</h2><div class="archive-grid">${store.meetings.filter(m=>i?m.date<today():m.date>=today()).sort((a,b)=>i?b.date.localeCompare(a.date):a.date.localeCompare(b.date)).map(m=>`<article class="card"><div class="eyebrow">${esc(dateES(m.date))}</div><h3>${title(m)}</h3><p>${esc(meetingStatus(m))}</p>${link('/reuniones/'+m.slug,'Consultar jornada →','text-link')}</article>`).join('')}</div>`).join('')}`);
}
function today() {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function results() {
 const rows=store.meetings.flatMap(m=>m.races.map(r=>({m,r,...model.outcome(m,r,store.events,store.snapshots)}))).filter(x=>x.result);
 const verified=rows.filter(x=>x.hit!==null);
 const wins=store.meetings.flatMap(m=>m.tickets.map(t=>({m,t,outcome:model.ticketOutcome(m,t,store.events,store.snapshots)}))).filter(x=>x.outcome?.verified && x.outcome.hits===6);
 root.innerHTML=section('Historial de pronósticos y resultados',`<div class="metrics"><article><strong>${verified.length?verified.filter(x=>x.hit).length+'/'+verified.length:'—'}</strong><span>Favoritos acertados / cotejados</span></article><article><strong>${wins.length}</strong><span>Cuadros de 6 aciertos verificados</span></article><article><strong>${store.meetings.length}</strong><span>Jornadas conservadas</span></article></div><p>Solo contabilizamos aciertos con resultado oficial enlazado y pronóstico preservado antes de la salida. Un cuadro acertado no acredita un boleto sellado ni un premio cobrado.</p>${rows.length?rows.map(x=>`<article class="card"><h3>${title(x.m)} · ${esc(x.r.public_label)}</h3><p>Ganador: ${x.result.winner_numbers.map(esc).join(', ')} ${esc(x.result.winner_name||'')} · ${x.hit===null?'Sin evidencia pre-carrera suficiente':x.hit?'Favorito acertado':'Favorito fallado'}</p>${external(x.result.source_url,'Resultado oficial')}</article>`).join(''):empty('Aún no hay resultados con evidencia suficiente para calcular una tasa de acierto verificada. Esto no equivale a cero aciertos históricos.')}<h2>Cuadros acertados</h2>${wins.length?wins.map(x=>`<article class="card"><h3>${title(x.m)} · ${esc(tierName(x.t.tier))}</h3><p>6/6 · ${model.combinations(x.t.legs)} combinaciones</p>${link('/reuniones/'+x.m.slug,'Ver evidencia carrera por carrera')}</article>`).join(''):empty('Ningún cuadro de seis aciertos acreditado todavía con las fuentes disponibles.')}<h2>Archivo anterior</h2><p>Estos registros fueron importados. Se conservan visibles, separados de las métricas verificadas.</p><div class="archive-grid">${store.meetings.filter(m=>m.results).sort((a,b)=>b.date.localeCompare(a.date)).map(m=>`<article class="card"><div class="eyebrow">${esc(dateES(m.date))}</div><h3>${title(m)}</h3><p>${m.results.race_results?.length||0} resultados de archivo</p>${link('/reuniones/'+m.slug,'Ver pronósticos y resultados →')}</article>`).join('')}</div>`);
}
function statistics() {
 const stats=store.stats;
 root.innerHTML=section('Estadísticas hípicas',`<p>Consulta los registros disponibles por hipódromo y período. No se mezclan temporadas ni se presentan datos antiguos como actuales.</p>${stats?`<p class="callout">Última actualización del archivo: <strong>${esc(stats.actualizado)}</strong> · Temporada ${esc(stats.temporada)}. Pendiente de actualización para la jornada actual. ${external(stats.url,'Fuente declarada: INH')}</p><div class="card"><h3>Publicaciones oficiales recientes</h3><p>La Rinconada · reunión del 13/09/2026</p><p><a href="https://t.me/INHOficial/24390" target="_blank" rel="noopener noreferrer">Estadísticas de temporada ↗</a> · <a href="https://t.me/INHOficial/24395" target="_blank" rel="noopener noreferrer">Jinetes ↗</a> · <a href="https://t.me/INHOficial/24397" target="_blank" rel="noopener noreferrer">Entrenadores ↗</a></p><p>Las tablas de abajo conservan los períodos del archivo. Consulta estas publicaciones para el corte más reciente localizado.</p></div><div class="filters"><label>Hipódromo <select id="stats-track"><option value="rinconada">La Rinconada</option><option value="valencia">Valencia</option></select></label><label>Categoría <select id="stats-kind"><option value="jinetes">Jinetes</option><option value="entrenadores">Entrenadores</option><option value="caballos">Caballos</option></select></label></div><div id="stats-content"></div>`:empty('No se pudo cargar el archivo de estadísticas. Vuelve a intentar la carga.')}`);
 if(stats) {document.getElementById('stats-track').addEventListener('change',statTable);document.getElementById('stats-kind').addEventListener('change',statTable);statTable();}
}
function statTable() {
 const track=document.getElementById('stats-track').value, kind=document.getElementById('stats-kind').value;
 const meetings=store.stats[track]?.meetings || [];
 const history = kind==='caballos' ? `<h3>Caballos en los análisis conservados</h3><p>Estas apariciones son selecciones editoriales, no salidas oficiales ni victorias de su campaña.</p><div class="table-scroll" tabindex="0"><table><thead><tr><th>Caballo</th><th>Jornadas en el archivo</th></tr></thead><tbody>${horseHistory(track).map(([name,count])=>`<tr><th>${esc(name)}</th><td>${count}</td></tr>`).join('')}</tbody></table></div>`:'';
 document.getElementById('stats-content').innerHTML=meetings.map(m=>`<h3>${esc(m.nombre)}</h3>${m[kind]?.length?`<div class="table-scroll" tabindex="0"><table><thead><tr><th>Posición</th><th>Nombre</th><th>Victorias</th></tr></thead><tbody>${m[kind].map(x=>`<tr><td>${esc(x.pos)}</td><th scope="row">${esc(x.nombre)}</th><td>${esc(x.victorias)}</td></tr>`).join('')}</tbody></table></div>`:empty('No hay estadísticas oficiales de esta categoría en el archivo disponible.')}`).join('')+history;
}
function horseHistory(track) {
 const map=new Map();store.meetings.filter(m=>m.track===(track==='valencia'?'Valencia':'La Rinconada')).forEach(m=>{new Set(m.races.flatMap(r=>r.horses.map(h=>h.name.toUpperCase()))).forEach(n=>map.set(n,(map.get(n)||0)+1));});return [...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}
function render() {
 if(!store)return;visibleMeeting=null;
 const p=(new URLSearchParams(location.search).get('ruta')||location.pathname).replace(/\/$/,'')||'/';
 const slug=p.match(/^\/reuniones\/([^/]+)$/)?.[1];
 const track=p==='/valencia'?'Valencia':['/rinconada','/la-rinconada'].includes(p)?'La Rinconada':null;
 const found=slug?store.meetings.find(m=>m.slug===slug):window.CuadroPerfectoModel.selectCurrentMeeting(track?store.meetings.filter(m=>m.track===track):store.meetings);
 document.title='Zona Caliente Pro | Cuadro Perfecto';
 if(p==='/estadisticas')statistics();else if(p==='/resultados')results();else if(p==='/reuniones')archive();else if((p==='/'||track||slug)&&found)meeting(found,p==='/');else root.innerHTML=section('Jornada no disponible',empty('No encontramos una reunión para esta dirección.')+link('/reuniones','Consultar calendario','btn'));
 const canonical=document.querySelector('link[rel="canonical"]'); if(canonical)canonical.href='https://cuadroperfecto.com'+(found && (slug||track)?'/reuniones/'+found.slug:p);
 document.querySelectorAll('#nav a').forEach(a=>{if(a.getAttribute('href')===p)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.getElementById('load-status').textContent=warning||'Datos cargados';
 if(!root.querySelector('h1')){const heading=root.querySelector('h2');if(heading){const h=document.createElement('h1');h.textContent=heading.textContent;heading.replaceWith(h);}}
 if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
async function json(url) {
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
 try {const response=await fetch(url,{signal:controller.signal,cache:'no-cache'});if(!response.ok)throw new Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timer);}
}
async function load() {
 if(loading)return;loading=true;root.setAttribute('aria-busy','true');
 try {
 const [current,...optional]=await Promise.all([json('/data/meetings.json'),...['legacy-meetings','analysis-snapshots','estadisticas_inh','jornada-events','channels'].map(name=>json('/data/'+name+'.json').catch(()=>null))]);
 if(!Array.isArray(current.meetings))throw new Error('Registro inválido');
 const [legacy,snapshots,stats,events,channels]=optional;
 warning=optional.some(x=>x===null)?'Algunos archivos complementarios no están disponibles. Los datos parciales no se cuentan como historial verificado.':'';
 store={meetings:[...current.meetings,...(legacy?.meetings||[])],snapshots:snapshots?.snapshots||[],stats,events:events?.events||[],channels:channels||{}};render();
 } catch {root.innerHTML=section('No pudimos cargar la jornada',`<p>La conexión o el archivo de jornadas no está disponible. No se han cambiado los pronósticos.</p><button class="btn" id="retry">Volver a intentar</button><p>${external('https://t.me/LaRectaCaliente','Consultar Telegram')}</p>`);document.getElementById('retry').addEventListener('click',load);document.getElementById('load-status').textContent='Error al cargar la jornada';}
 finally {loading=false;root.setAttribute('aria-busy','false');}
}
document.addEventListener('click',e=>{
 const a=e.target.closest('a[data-route], #nav a, a.brand');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
 e.preventDefault();history.pushState({},'',a.getAttribute('href'));document.getElementById('nav').classList.remove('open');document.getElementById('menu').setAttribute('aria-expanded','false');render();if(!location.hash)window.scrollTo(0,0);root.focus({preventScroll:true});
});
document.getElementById('menu').addEventListener('click',()=>{const open=document.getElementById('nav').classList.toggle('open');document.getElementById('menu').setAttribute('aria-expanded',String(open));});
window.addEventListener('popstate',render);
load();

// Refresh result events without interrupting the banner or embedded live player.
setInterval(async()=>{
 if(!store || document.hidden)return;
 try {
 const fresh=await json('/data/jornada-events.json');
 if(!Array.isArray(fresh.events)||JSON.stringify(fresh.events)===JSON.stringify(store.events))return;
 store.events=fresh.events;
 if(visibleMeeting){
 const list=document.querySelector('.race-list');if(list)list.innerHTML=model.orderedRaces(visibleMeeting).map((r,i)=>raceCard(visibleMeeting,r,i)).join('');
 const feed=document.getElementById('live-feed');if(feed)feed.innerHTML='<h3>Minuto a minuto</h3>'+store.events.filter(e=>e.meeting_id===visibleMeeting.id).slice().reverse().map(e=>'<article class="feed-item"><p>'+esc(e.message)+'</p>'+external(e.source_url,'Fuente oficial')+'</article>').join('');
 } else if(location.pathname.replace(/\/$/,'')==='/resultados')results();
 document.getElementById('load-status').textContent='Hay resultados nuevos. Historial actualizado.';
 }catch{document.getElementById('load-status').textContent='No se pudo actualizar el directo. Se conservan los últimos datos cargados.';}
},30000);

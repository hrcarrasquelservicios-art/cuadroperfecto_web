const CHANNELS = {
    inh: { name: 'La Rinconada', id: 'UCR0C0QitI9WGwLPv5t2Mjxw', icon: '🏇' },
    hinava: { name: 'Valencia', id: 'UCeElPxYsX8MZZm25zMgg0Gg', videoId: 'sGpTROPlIc8', icon: '🐎' }
};
let currentChannel = 'inh';

function loadStream(channelKey) {
    const ch = CHANNELS[channelKey];
    if (!ch) return;
    currentChannel = channelKey;
    const iframe = document.getElementById('streamIframe');
    const statusEl = document.querySelector('.stream-status');
    const btns = document.querySelectorAll('.channel-btn');
    iframe.src = ch.videoId
        ? `https://www.youtube.com/embed/${ch.videoId}?autoplay=1&rel=0`
        : `https://www.youtube.com/embed/live_stream?channel=${ch.id}&autoplay=1&rel=0`;
    statusEl.innerHTML = `<span class="status-dot"></span> ${ch.icon} ${ch.name} — EN VIVO`;
    btns.forEach(b => b.classList.toggle('active', b.dataset.channel === channelKey));
}

let jornadasData = [];

document.addEventListener('DOMContentLoaded', () => {
    const redirect = sessionStorage.getItem('redirect');
    if (redirect) { sessionStorage.removeItem('redirect'); history.replaceState(null, '', redirect); }

    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('open'));
        menu.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a) return;
            const href = a.getAttribute('href');
            if (href && href.startsWith('/')) {
                e.preventDefault();
                menu.classList.remove('open');
                history.pushState(null, '', href);
                showPage(href);
            }
        });
    }

    window.addEventListener('popstate', () => showPage(location.pathname || '/'));

    function showPage(page) {
        const app = document.getElementById('app');
        const stream = document.getElementById('stream-page');
        const resultados = document.getElementById('resultados');
        const recaudacion = document.getElementById('recaudacion');
        const publicidad = document.getElementById('publicidad');
        const aprendizaje = document.getElementById('aprendizaje-page');
        const navLinks = document.querySelectorAll('.nav-menu a');

        [app, stream, resultados, recaudacion, publicidad, aprendizaje].forEach(el => { if (el) el.style.display = 'none'; });

        if (page === '/stream') {
            stream.style.display = 'block';
            loadStream(currentChannel);
        } else if (page === '/resultados') {
            resultados.style.display = 'block';
        } else if (page === '/recaudacion') {
            recaudacion.style.display = 'block';
        } else if (page === '/aprendizaje') {
            if (aprendizaje) aprendizaje.style.display = 'block';
            loadAprendizajePage();
        } else {
            app.style.display = 'block';
            publicidad.style.display = 'block';
            const iframe = document.getElementById('streamIframe');
            if (iframe) iframe.src = '';

            if (!jornadasData.length) return;

            // Home: muestra las 2 jornadas mas recientes (Valencia + Rinconada)
            if (page === '/' || page === '') {
                app.innerHTML = renderHome();
            } else if (page === '/valencia') {
                app.innerHTML = renderHipodromo('Valencia');
            } else if (page === '/rinconada') {
                app.innerHTML = renderHipodromo('La Rinconada');
            }
        }

        navLinks.forEach(a => {
            const href = a.getAttribute('href') || '';
            const active = href === page || (page === '/' && href === '/');
            a.classList.toggle('active', active);
        });
    }

    function renderHome() {
        const valencia = jornadasData.filter(j => j.hipodromo === 'Valencia');
        const rinconada = jornadasData.filter(j => j.hipodromo === 'La Rinconada');
        const ultimaV = valencia[valencia.length - 1];
        const ultimaR = rinconada[rinconada.length - 1];
        let html = '<div class="hipodromo-tabs">';
        html += `<a href="/valencia" class="hipo-tab" onclick="event.preventDefault();history.pushState(null,'','/valencia');showPage('/valencia')">🏇 Valencia</a>`;
        html += `<a href="/rinconada" class="hipo-tab" onclick="event.preventDefault();history.pushState(null,'','/rinconada');showPage('/rinconada')">🐎 La Rinconada</a>`;
        html += '</div>';
        if (ultimaV) html += renderJornadaCompleta(ultimaV, jornadasData.indexOf(ultimaV));
        if (ultimaR) html += renderJornadaCompleta(ultimaR, jornadasData.indexOf(ultimaR));
        return html;
    }

    function renderHipodromo(nombre) {
        const filtradas = jornadasData.filter(j => j.hipodromo === nombre);
        let html = '<div class="hipodromo-tabs">';
        html += `<a href="/valencia" class="hipo-tab${nombre === 'Valencia' ? ' active' : ''}" onclick="event.preventDefault();history.pushState(null,'','/valencia');showPage('/valencia')">🏇 Valencia</a>`;
        html += `<a href="/rinconada" class="hipo-tab${nombre === 'La Rinconada' ? ' active' : ''}" onclick="event.preventDefault();history.pushState(null,'','/rinconada');showPage('/rinconada')">🐎 La Rinconada</a>`;
        html += '</div>';
        // Mas reciente primero
        filtradas.slice().reverse().forEach((j, i) => {
            html += renderJornadaCompleta(j, jornadasData.indexOf(j));
            if (i < filtradas.length - 1) html += '<div class="hist-separator"><span>Análisis anterior</span></div>';
        });
        return html;
    }

    function renderJornadaCompleta(j, idx) {
        const slug = j.slug || `jornada-${idx}`;
        return [
            renderBanner(j, slug),
            j.retirados ? renderRetirados(j, slug) : '',
            j.lineas_fijas ? renderLineasFijas(j, slug) : '',
            j.validas ? renderValidas(j, slug) : '',
            j.bombas ? renderBombas(j, slug) : '',
            j.stats ? renderStats(j) : '',
        ].join('');
    }

    fetch('data/jornadas.json')
        .then(r => r.json())
        .then(data => {
            jornadasData = data;
            renderResultados(data);
            renderRecaudacion(data);
            // Cargar base de datos de actores tempranamente para renderizar rachas
            fetch('data/learning/actors_db.json')
                .then(res => res.json())
                .then(act => { actorsDbData = act; })
                .catch(() => {});

            const nav = document.getElementById('navMenu');
            nav.innerHTML = `
                <li><a href="/" class="active">Análisis</a></li>
                <li><a href="/valencia">🏇 Valencia</a></li>
                <li><a href="/rinconada">🐎 La Rinconada</a></li>
                <li><a href="/stream">🎥 En Vivo</a></li>
                <li><a href="/resultados">📊 Resultados</a></li>
                <li><a href="/aprendizaje">🧠 IA Aprendizaje</a></li>
                <li><a href="/recaudacion">💰 Recaudación</a></li>
            `;
            showPage(location.pathname || '/');
        });

    function renderBanner(j, slug) {
        const dot = j.condiciones === 'optimas' ? '<span class="status-dot"></span>' : '';
        return `
        <section class="race-day-banner" id="${slug}">
            <div class="container">
                <div class="banner-header">
                    <h2>📍 ${j.hipodromo} — ${j.fecha}</h2>
                    <p class="banner-status">${dot} ${j.condiciones === 'optimas' ? 'Condiciones óptimas' : ''}${j.trabajos ? ' — Trabajos ' + j.trabajos : ''}</p>
                </div>
                <div class="banner-stats">
                    <div class="stat"><span class="num">${j.stats?.carreras || j.lineas_fijas?.length || '-'}</span><span class="label">Carreras</span></div>
                    <div class="stat"><span class="num">${j.stats?.bombas || j.bombas?.length || '-'}</span><span class="label">Bombas</span></div>
                    ${j.expectativa ? `<div class="stat"><span class="num">${j.expectativa}</span><span class="label">Expectativa</span></div>` : ''}
                </div>
            </div>
        </section>`;
    }

    function renderRetirados(j, slug) {
        if (!j.retirados || !j.retirados.length) return '';
        return `
        <section class="retirados-section" id="${slug}-retirados">
            <div class="container">
                <h2 class="section-title">🚩 EJEMPLARES RETIRADOS</h2>
                <div class="retirados-list">
                    ${j.retirados.map(r => `
                    <div class="retirado-card">
                        <div class="retirado-header">${r.carrera}</div>
                        <div class="retirado-body">
                            ${r.dorsales.map((d, i) => `
                            <span class="retirado-item">#${d} ${r.nombres[i]} — ${r.motivo}</span>
                            `).join('')}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </section>`;
    }

    function renderLineasFijas(j, slug) {
        const carreras = j.lineas_fijas || [];
        const rango = carreras.length ? `${carreras[0].numero}-${carreras[carreras.length-1].numero}` : '';
        return `
        <section class="race-cards" id="${slug}-fijas">
            <div class="container">
                <h2 class="section-title">🏇 LÍNEAS FIJAS <span class="gold">${rango}</span></h2>
                <div class="card-grid">
                    ${j.lineas_fijas.map(c => renderCard(c)).join('')}
                </div>
            </div>
        </section>`;
    }

    function renderCard(c) {
        return `
        <div class="race-card">
            <div class="card-header">
                <span class="race-num">${c.numero}</span>
                <span class="race-time">${c.hora}</span>
                <span class="race-dist">${c.distancia}</span>
            </div>
            <div class="card-category">${c.categoria}</div>
            ${c.bomb_tag ? `<div class="card-bombs"><span class="bomb-tag">${c.bomb_tag}</span></div>` : ''}
            <div class="card-top">
                ${c.top3.map(h => {
                    const racha = getActorBadgeHtml(h.jinete, h.preparador);
                    const details = h.jinete ? `<br><span style="font-size:0.75rem;color:var(--text-muted)">Jinete: ${h.jinete} ${racha}</span>` : '';
                    return `
                    <div class="horse ${h.pos === 1 ? 'first' : h.pos === 2 ? 'second' : 'third'}">
                        <div style="flex: 1;">
                            <span class="pos">${h.pos}°</span>
                            <span class="number">#${h.dorsal}</span>
                            <span class="name">${h.nombre}</span>
                            ${details}
                        </div>
                        <span class="pts">${h.pts} pts</span>
                        ${h.icono ? `<span class="icon">${h.icono}</span>` : ''}
                    </div>`;
                }).join('')}
            </div>
            <div class="card-key">🔑 ${c.clave}</div>
        </div>`;
    }

    function renderValidas(j, slug) {
        return `
        <section class="validas-section" id="${slug}-5y6">
            <div class="container">
                <h2 class="section-title">🎯 CUADRO PERFECTO <span class="gold">5Y6</span></h2>
                <p class="section-sub">${j.validas.length} válidas para el 5y6</p>
                <div class="validas-grid">
                    ${j.validas.map(v => renderValida(v)).join('')}
                </div>
                ${j.jugada_combos ? `
                <div class="jugada-box">
                    <h3>🎯 JUGADA OFICIAL 5Y6</h3>
                    <div class="jugada-combinaciones">
                        ${j.jugada_combos.map(c => `<span class="combo">${c}</span>`).join('')}
                    </div>
                    <p class="jugada-info">${j.jugada_info || ''}</p>
                </div>` : ''}
            </div>
        </section>`;
    }

    function renderValida(v) {
        const bombaClass = v.top.bomba === 'mega' ? 'megabomba' : v.top.bomba ? 'bomba' : '';
        const featuredClass = v.featured ? 'featured' : '';
        const copaBadge = v.copa ? '<span class="copa-badge">🏆 COPA</span>' : '';
        const topPts = v.top.bomba === 'mega' ? `${v.top.pts} pts 💣💣` : v.top.bomba ? `${v.top.pts} pts 💣` : `${v.top.pts} pts`;
        
        const topRacha = getActorBadgeHtml(v.top.jinete, v.top.preparador);
        const altRacha = getActorBadgeHtml(v.alt.jinete, v.alt.preparador);
        
        const topDetails = v.top.jinete ? `<span style="font-size:0.75rem;color:var(--text-muted);display:block;margin-top:2px;">Jinete: ${v.top.jinete} ${topRacha}</span>` : '';
        const altDetails = v.alt.jinete ? `<span style="font-size:0.75rem;color:var(--text-muted);display:block;margin-top:2px;">Jinete: ${v.alt.jinete} ${altRacha}</span>` : '';

        return `
        <div class="valida-card ${featuredClass}">
            <div class="valida-header ${v.color}">
                <span class="valida-num">${v.v}</span>
                <span class="valida-info">${v.carrera} · ${v.distancia} · ${v.hora}</span>
                ${copaBadge}
            </div>
            <div class="valida-body">
                <div class="valida-pick top ${bombaClass}">
                    <div>
                        ${v.top.nombre} <span class="dorsal">#${v.top.dorsal}</span>
                        ${topDetails}
                    </div>
                    <span class="pts">${topPts}</span>
                </div>
                <div class="valida-pick alt" style="margin-top: 8px;">
                    <div>
                        ${v.alt.nombre} <span class="dorsal">#${v.alt.dorsal}</span>
                        ${altDetails}
                    </div>
                    <span class="pts">${v.alt.pts} pts</span>
                </div>
            </div>
        </div>`;
    }

    function renderBombas(j, slug) {
        return `
        <section class="bombas-section" id="${slug}-bombas">
            <div class="container">
                <h2 class="section-title">💣 BOMBAS DEL DÍA</h2>
                <div class="bombas-list">
                    ${j.bombas.map(b => `
                    <div class="bomba-card ${b.nivel === 'mega' ? 'mega' : ''}">
                        <span class="bomba-rank">#${b.rank}</span>
                        <div class="bomba-info">
                            <span class="bomba-name">${b.nombre}</span>
                            <span class="bomba-dorsal">#${b.dorsal}</span>
                            <span class="bomba-race">${b.carrera} · ${b.hora}</span>
                        </div>
                        <span class="bomba-pts">${b.pts}</span>
                        <span class="bomba-level">${b.nivel === 'mega' ? (b.pts >= 20 ? '💣💣💣' : '💣💣') : '💣'}</span>
                    </div>`).join('')}
                </div>
            </div>
        </section>`;
    }

    function renderStats(j) {
        if (!j.stats) return '';
        const s = j.stats;
        return `
        <section class="stats-section">
            <div class="container">
                <h2 class="section-title">📊 SISTEMA 3.3 — ESTADÍSTICAS</h2>
                <div class="stats-grid">
                    <div class="stat-card big">
                        <span class="stat-value gold">${s.efectividad_con_trabajos}</span>
                        <span class="stat-label">Efectividad con trabajos</span>
                    </div>
                    <div class="stat-card bad">
                        <span class="stat-value">${s.efectividad_sin_trabajos}</span>
                        <span class="stat-label">Sin trabajos</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.carreras}</span>
                        <span class="stat-label">Carreras analizadas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.bombas}</span>
                        <span class="stat-label">Bombas detectadas</span>
                    </div>
                </div>
                <div class="metodologia-box">
                    <h3>🎯 Metodología</h3>
                    <p>Sistema 3.3 "La Vencida" pondera 14 factores por caballo.</p>
                    <ul class="metodologia-list">
                        <li>≥ 14 pts → 💣 BOMBA</li>
                        <li>12-13.9 pts → 🔥 Alta confianza</li>
                        <li>10-11.9 pts → ✅ Media</li>
                        <li>8-9.9 pts → ⚠️ Baja</li>
                        <li>&lt; 8 pts → 📉 Mínima</li>
                    </ul>
                </div>
            </div>
        </section>`;
    }

    function renderResultados(jornadas) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;
        let html = '';
        jornadas.forEach(j => {
            const ganadores = j.ganadores || [];
            
            // Recopilar todos nuestros picks (tanto de líneas fijas como de válidas)
            const picks = [];
            if (j.lineas_fijas) {
                j.lineas_fijas.forEach(lf => {
                    const top = lf.top3.find(h => h.pos === 1) || lf.top3[0];
                    const alts = lf.top3.filter(h => h.pos !== 1);
                    picks.push({
                        carrera: lf.numero,
                        nombre: top ? top.nombre : '—',
                        dorsal: top ? top.dorsal : '',
                        pts: top ? top.pts : 0,
                        isBomba: false,
                        alts: alts
                    });
                });
            }
            if (j.validas) {
                j.validas.forEach(v => {
                    picks.push({
                        carrera: v.carrera,
                        nombre: v.top.nombre,
                        dorsal: v.top.dorsal,
                        pts: v.top.pts,
                        isBomba: !!v.top.bomba,
                        alts: v.alt ? [v.alt] : []
                    });
                });
            }

            html += `
            <div class="results-jornada">
                <h3 class="results-hipodromo">📍 ${j.hipodromo} — ${j.fecha} ${j.reunion ? '· ' + j.reunion : ''}</h3>
                ${j.efectividad ? `<div class="results-efectividad">Efectividad: <span class="gold">${j.efectividad}</span></div>` : ''}
                <div class="results-table-wrapper">
                    <table class="results-table">
                        <thead>
                            <tr><th>Carrera/Válida</th><th>Nuestro Pick</th><th>Ganador Real</th><th>Estado</th></tr>
                        </thead>
                        <tbody>
                            ${ganadores.map(g => {
                                const pick = picks.find(p => g.carrera.includes(p.carrera));
                                if (!pick) {
                                    return `
                                    <tr class="miss">
                                        <td class="race-cell">${g.carrera}</td>
                                        <td class="pick-cell">—</td>
                                        <td class="winner-cell">${g.ganador}</td>
                                        <td class="status-cell">❌</td>
                                    </tr>`;
                                }

                                const gGanadorNormalized = g.ganador.toLowerCase();
                                const acertoTop = gGanadorNormalized.includes(pick.nombre.toLowerCase());
                                const altAcertada = pick.alts.find(alt => gGanadorNormalized.includes(alt.nombre.toLowerCase()));
                                const acerto = acertoTop || !!altAcertada;

                                let pickText = `${pick.nombre} #${pick.dorsal}`;
                                if (pick.pts) pickText += ` (${pick.pts}pts)`;
                                if (pick.isBomba) pickText += ` 💣`;

                                if (altAcertada) {
                                    return `
                                    <tr class="hit">
                                        <td class="race-cell">${g.carrera}</td>
                                        <td class="pick-cell">${pickText} <span style="font-size:0.8rem;color:var(--text-muted)">[Alt: ${altAcertada.nombre} #${altAcertada.dorsal}]</span></td>
                                        <td class="winner-cell">${g.ganador}</td>
                                        <td class="status-cell">✅</td>
                                    </tr>`;
                                } else {
                                    return `
                                    <tr class="${acerto ? 'hit' : 'miss'}">
                                        <td class="race-cell">${g.carrera}</td>
                                        <td class="pick-cell">${pickText}</td>
                                        <td class="winner-cell">${g.ganador}</td>
                                        <td class="status-cell">${acerto ? '✅' : '❌'}</td>
                                    </tr>`;
                                }
                            }).join('')}
                        </tbody>
                    </table>
                    ${j.recaudacion?.dividendo_6 ? `
                    <div class="dividendos-box">
                        <h4>💰 Dividendos 5y6 Nacional</h4>
                        <div class="dividendos-grid">
                            <div class="dividendo-card">
                                <span class="dividendo-label">6 Aciertos</span>
                                <span class="dividendo-value">${j.recaudacion.dividendo_6}</span>
                                <span class="dividendo-count">${j.recaudacion.ganadores_6 || '—'} ganadores</span>
                            </div>
                            <div class="dividendo-card">
                                <span class="dividendo-label">5 Aciertos</span>
                                <span class="dividendo-value">${j.recaudacion.dividendo_5}</span>
                                <span class="dividendo-count">${j.recaudacion.ganadores_5 || '—'} ganadores</span>
                            </div>
                        </div>
                    </div>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    function renderRecaudacion(jornadas) {
        const container = document.getElementById('recaudacionContainer');
        if (!container) return;
        let html = '<div class="recaudacion-grid">';
        jornadas.forEach(j => {
            if (!j.recaudacion) return;
            html += `
            <div class="recaudacion-card">
                <h3>📍 ${j.hipodromo}</h3>
                <div class="recaudacion-monto">${j.recaudacion.monto}</div>
                <div class="recaudacion-detalle">
                    <div class="recaudacion-row"><span>Carreras:</span> <span>${j.recaudacion.carreras}</span></div>
                    <div class="recaudacion-row"><span>Válidas 5y6:</span> <span>${j.recaudacion.validas}</span></div>
                    ${j.recaudacion.dividendo_6 ? `
                    <div class="recaudacion-row"><span>Dividendo 6:</span> <span class="gold">${j.recaudacion.dividendo_6}</span></div>
                    <div class="recaudacion-row"><span>Dividendo 5:</span> <span>${j.recaudacion.dividendo_5}</span></div>` : ''}
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // Live status
    function toggleTickerStream(youtubeId) {
        const dropdown = document.getElementById('tickerStreamDropdown');
        const iframe = document.getElementById('tickerIframe');
        if (!dropdown || !iframe) return;
        
        const isOpen = dropdown.classList.toggle('open');
        if (isOpen && youtubeId) {
            if (youtubeId.startsWith('live_stream')) {
                iframe.src = `https://www.youtube.com/embed/live_stream?channel=UCR0C0QitI9WGwLPv5t2Mjxw&autoplay=1&rel=0`;
            } else {
                iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
            }
        } else {
            iframe.src = '';
        }
    }
    window.toggleTickerStream = toggleTickerStream;

    function showLiveBanner(j) {
        const existing = document.querySelector('.live-banner');
        if (existing) existing.remove();
        
        const hero = document.querySelector('.hero');
        if (!hero) return;
        
        const statusVal = (j.status || (j.activa ? 'EN_CURSO' : 'PREVIA')).toLowerCase();
        const statusLabel = j.status === 'PREVIA' ? 'Próxima Carrera' 
                          : j.status === 'FINALIZADA' ? 'Jornada Finalizada' 
                          : 'En Curso';
        
        const youtubeId = j.youtube_id || (j.hipodromo === 'Valencia' ? 'sGpTROPlIc8' : 'live_stream');
        
        const html = `
        <section class="live-banner">
            <div class="container">
                <div class="live-ticker-container">
                    <div class="live-ticker-header">
                        <div class="live-ticker-main">
                            <span class="live-status-pill ${statusVal}">
                                <span class="live-dot"></span>
                                ${statusLabel}
                            </span>
                            <span class="live-hipodromo" style="font-weight: 700;">📍 ${j.hipodromo}</span>
                            <div class="live-ticker-info">
                                ${j.carrera_actual ? `<span class="live-race">🏇 ${j.carrera_actual}</span>` : ''}
                                ${j.hora ? `<span class="live-time">⏱ ${j.hora}</span>` : ''}
                                ${j.favorito ? `<span class="live-fav">🔥 Favorito: <span class="fav">${j.favorito}</span></span>` : ''}
                                ${j.progreso ? `<span class="live-progress">${j.progreso}</span>` : ''}
                                ${j.siguiente ? `<span class="live-next">⏳ Siguiente: ${j.siguiente} ${j.siguiente_hora ? '(' + j.siguiente_hora + ')' : ''}</span>` : ''}
                            </div>
                        </div>
                        <div class="live-ticker-controls">
                            <button class="btn-ticker-stream" onclick="window.toggleTickerStream('${youtubeId}')">
                                🎥 Ver Carrera
                            </button>
                        </div>
                    </div>
                    
                    <div class="live-ticker-dropdown" id="tickerStreamDropdown">
                        <div class="live-ticker-embed">
                            <iframe id="tickerIframe" src="" frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
        hero.insertAdjacentHTML('afterend', html);
    }
    function processLiveStatus(status) {
        (status.jornadas || []).forEach(j => { if (j.activa || j.status) showLiveBanner(j); });
    }
    function pollLiveStatus() {
        fetch('https://mibot-n8n-auto.duckdns.org/race-status/live_status.json?_=' + Date.now())
            .then(r => r.json()).then(s => processLiveStatus(s))
            .catch(() => {
                fetch('data/live_status.json?_=' + Date.now())
                    .then(r => r.json()).then(s => processLiveStatus(s)).catch(() => {});
            });
    }
    pollLiveStatus();
    setInterval(pollLiveStatus, 30000);

    fetch('https://api.countapi.xyz/hit/cuadroperfecto-com/visitas')
        .then(r => r.json())
        .then(data => { document.getElementById('visitorCount').textContent = (data.value || 0).toLocaleString('es'); })
        .catch(() => {});

    // ── LOGICA DE APRENDIZAJE ──
    let learningLogData = [];
    let actorsDbData = { jockeys: {}, trainers: {} };

    function loadAprendizajePage() {
        Promise.all([
            fetch('data/learning/learning_log.json?_=' + Date.now()).then(r => r.json()).catch(() => []),
            fetch('data/learning/actors_db.json?_=' + Date.now()).then(r => r.json()).catch(() => ({ jockeys: {}, trainers: {} }))
        ]).then(([logs, actors]) => {
            learningLogData = logs;
            actorsDbData = actors;
            renderLearningKPIs();
            renderActorsTables();
            renderLearningLogs();
        });
    }

    function renderLearningKPIs() {
        const logs = learningLogData;
        if (!logs.length) return;
        const total = logs.length;
        const topHits = logs.filter(l => l.acierto && l.top_pick && normalizeName(l.ganador).includes(normalizeName(l.top_pick))).length;
        const globalHits = logs.filter(l => l.acierto).length;
        const totalDeviation = logs.reduce((sum, l) => sum + (l.desviacion || 0), 0);
        
        document.getElementById('accuracyTop').textContent = `${round((topHits / total) * 100, 1)}%`;
        document.getElementById('accuracyGlobal').textContent = `${round((globalHits / total) * 100, 1)}%`;
        document.getElementById('averageDeviation').textContent = round(totalDeviation / total, 2);
        document.getElementById('totalEvaluations').textContent = total;
    }

    function renderActorsTables() {
        const jockeysBody = document.querySelector('#jockeysTable tbody');
        const trainersBody = document.querySelector('#trainersTable tbody');
        if (!jockeysBody || !trainersBody) return;
        
        const jockeys = Object.entries(actorsDbData.jockeys || {}).sort((a, b) => b[1].wins - a[1].wins);
        jockeysBody.innerHTML = jockeys.map(([name, data]) => {
            const roiClass = data.roi >= 1.0 ? 'roi-good' : 'roi-bad';
            const trendSvg = renderSparkline(data.trend);
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${data.wins}</td>
                    <td>${data.losses}</td>
                    <td class="roi-value ${roiClass}">${data.roi}</td>
                    <td class="trend-td">${trendSvg}</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5" style="text-align:center">Sin datos de jinetes</td></tr>';
        
        const trainers = Object.entries(actorsDbData.trainers || {}).sort((a, b) => b[1].wins - a[1].wins);
        trainersBody.innerHTML = trainers.map(([name, data]) => {
            const roiClass = data.roi >= 1.0 ? 'roi-good' : 'roi-bad';
            const trendSvg = renderSparkline(data.trend);
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${data.wins}</td>
                    <td>${data.losses}</td>
                    <td class="roi-value ${roiClass}">${data.roi}</td>
                    <td class="trend-td">${trendSvg}</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5" style="text-align:center">Sin datos de preparadores</td></tr>';
    }

    function renderSparkline(trend) {
        if (!trend || !trend.length) return '—';
        const width = 80;
        const height = 20;
        const padding = 2;
        
        if (trend.length === 1) {
            return `<svg width="${width}" height="${height}"><circle cx="${width/2}" cy="${height/2}" r="3" fill="var(--gold)"/></svg>`;
        }
        
        const maxVal = Math.max(...trend, 0.1);
        const minVal = Math.min(...trend, 0);
        const range = maxVal - minVal || 1;
        
        const points = trend.map((val, index) => {
            const x = (index / (trend.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((val - minVal) / range) * (height - padding * 2) - padding;
            return { x, y };
        });
        
        const pathData = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
        const lastPoint = points[points.length - 1];
        
        return `
            <svg width="${width}" height="${height}">
                <path d="${pathData}" class="sparkline" />
                <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="2" class="sparkline-dot" />
            </svg>
        `;
    }

    function renderLearningLogs() {
        const body = document.querySelector('#logsTable tbody');
        if (!body) return;
        
        const sortedLogs = learningLogData.slice().reverse();
        body.innerHTML = sortedLogs.map(l => {
            const badgeClass = l.acierto ? 'hit' : 'miss';
            const badgeText = l.acierto ? 'ÉXITO' : 'FALLO';
            const scoreText = l.top_pts ? ` (${l.top_pts} pts)` : '';
            return `
                <tr class="${badgeClass}">
                    <td><strong>${l.hipodromo}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${l.carrera} · ${l.date}</span></td>
                    <td><strong>${l.ganador}</strong></td>
                    <td>${l.jinete || '—'}<br><span class="actor-info">${l.preparador || '—'}</span></td>
                    <td>${l.top_pick || '—'}${scoreText}</td>
                    <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                    <td class="dev-cell">${l.desviacion || 0}</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="6" style="text-align:center">Sin registros de aprendizaje</td></tr>';
    }

    function round(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    function normalizeName(name) {
        if (!name) return "";
        return name.toLowerCase().trim();
    }

    function getActorBadgeHtml(jinete, preparador) {
        let html = '';
        if (jinete && actorsDbData.jockeys && actorsDbData.jockeys[jinete]) {
            const j = actorsDbData.jockeys[jinete];
            const rate = j.wins / (j.wins + j.losses || 1);
            if (rate >= 0.6 || j.roi >= 1.2) {
                html += `<span class="badge-racha caliente" title="Racha caliente: ${round(rate*100,0)}% wins, ROI ${j.roi}">🔥 Caliente</span>`;
            } else if (rate <= 0.3 && j.roi <= 0.7) {
                html += `<span class="badge-racha frio" title="Racha fría: ${round(rate*100,0)}% wins, ROI ${j.roi}">⚠️ Enfríado</span>`;
            }
        }
        return html;
    }
});

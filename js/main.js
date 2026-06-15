const CHANNELS = {
    inh: {
        name: 'La Rinconada',
        id: 'UCR0C0QitI9WGwLPv5t2Mjxw',
        icon: '🏇'
    },
    hinava: {
        name: 'Valencia',
        id: 'UCeElPxYsX8MZZm25zMgg0Gg',
        videoId: 'vOoCQb1U1Gc',
        icon: '🐎'
    }
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

function showPage(page) {
    const app = document.getElementById('app');
    const stream = document.getElementById('stream-page');
    const resultados = document.getElementById('resultados');
    const recaudacion = document.getElementById('recaudacion');
    const publicidad = document.getElementById('publicidad');
    const navLinks = document.querySelectorAll('.nav-menu a');

    [app, stream, resultados, recaudacion, publicidad].forEach(el => { if (el) el.style.display = 'none'; });

    if (page === '/stream') {
        stream.style.display = 'block';
        loadStream(currentChannel);
    } else if (page === '/resultados') {
        resultados.style.display = 'block';
    } else if (page === '/recaudacion') {
        recaudacion.style.display = 'block';
    } else {
        app.style.display = 'block';
        publicidad.style.display = 'block';
        const iframe = document.getElementById('streamIframe');
        if (iframe) iframe.src = '';
    }

    navLinks.forEach(a => {
        const href = a.getAttribute('href');
        a.classList.toggle('active', href === page || (page === '/' && href === '/'));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('open'));
        document.querySelectorAll('.nav-menu a').forEach(a => {
            a.addEventListener('click', (e) => {
                const href = a.getAttribute('href');
                if (href.startsWith('/')) {
                    e.preventDefault();
                    menu.classList.remove('open');
                    history.pushState(null, '', href);
                    showPage(href);
                }
            });
        });
    }

    window.addEventListener('popstate', () => {
        showPage(location.pathname || '/');
    });

    fetch('data/jornadas.json')
        .then(r => r.json())
        .then(data => {
            renderResultados(data);
            renderRecaudacion(data);
            const app = document.getElementById('app');
            data.forEach((j, idx) => {
                const slug = j.slug || `jornada-${idx}`;
                app.innerHTML += `
                    ${renderBanner(j, slug)}
                    ${j.lineas_fijas ? renderLineasFijas(j, slug) : ''}
                    ${j.validas ? renderValidas(j, slug) : ''}
                    ${j.bombas ? renderBombas(j, slug) : ''}
                    ${j.stats ? renderStats(j) : ''}
                `;

                const nav = document.getElementById('navMenu');
                nav.innerHTML += `<li><a href="#${slug}">${j.hipodromo} ${j.fecha}</a></li>`;
                if (j.bombas) nav.innerHTML += `<li><a href="#${slug}-bombas">Bombas</a></li>`;
                if (j.validas) nav.innerHTML += `<li><a href="#${slug}-5y6">5y6</a></li>`;
            });
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

    function renderLineasFijas(j, slug) {
        return `
        <section class="race-cards" id="${slug}-fijas">
            <div class="container">
                <h2 class="section-title">🏇 LÍNEAS FIJAS <span class="gold">C1-C2</span></h2>
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
                ${c.top3.map(h => `
                <div class="horse ${h.pos === 1 ? 'first' : h.pos === 2 ? 'second' : 'third'}">
                    <span class="pos">${h.pos}°</span>
                    <span class="number">#${h.dorsal}</span>
                    <span class="name">${h.nombre}</span>
                    <span class="pts">${h.pts} pts</span>
                    ${h.icono ? `<span class="icon">${h.icono}</span>` : ''}
                </div>`).join('')}
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
        return `
        <div class="valida-card ${featuredClass}">
            <div class="valida-header ${v.color}">
                <span class="valida-num">${v.v}</span>
                <span class="valida-info">${v.carrera} · ${v.distancia} · ${v.hora}</span>
                ${copaBadge}
            </div>
            <div class="valida-body">
                <div class="valida-pick top ${bombaClass}">${v.top.nombre} <span class="dorsal">#${v.top.dorsal}</span> <span class="pts">${topPts}</span></div>
                <div class="valida-pick alt">${v.alt.nombre} <span class="dorsal">#${v.alt.dorsal}</span> <span class="pts">${v.alt.pts} pts</span></div>
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
                    <p>Sistema 3.3 "La Vencida" pondera 14 factores por caballo: forma reciente, consistencia, trabajos matinales, distancia, hipódromo, jinete, peso, dorsal, edad, código de trabajo (shn, ddlr, cómoda, animada), y más.</p>
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
            const picks = j.lineas_fijas ? j.lineas_fijas.map(c => {
                const top = c.top3[0];
                return { carrera: c.numero, nombre: top.nombre, dorsal: top.dorsal, pts: top.pts };
            }) : [];
            html += `
            <div class="results-jornada">
                <h3 class="results-hipodromo">📍 ${j.hipodromo} — ${j.fecha}</h3>
                ${j.efectividad ? `<div class="results-efectividad">Efectividad: <span class="gold">${j.efectividad}</span></div>` : ''}
                <div class="results-table-wrapper">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Carrera</th>
                                <th>Nuestro Pick</th>
                                <th>Ganador Real</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ganadores.map(g => {
                                const pick = picks.find(p => p.carrera === g.carrera);
                                const acerto = pick && (pick.nombre === g.ganador.split('#')[1]?.trim() || g.ganador.includes(pick.nombre));
                                return `
                                <tr class="${acerto ? 'hit' : 'miss'}">
                                    <td class="race-cell">${g.carrera}</td>
                                    <td class="pick-cell">${pick ? `${pick.nombre} #${pick.dorsal} (${pick.pts}pts)` : '—'}</td>
                                    <td class="winner-cell">${g.ganador}</td>
                                    <td class="status-cell">${acerto ? '✅' : '❌'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
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
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // Live status polling
    function showLiveBanner(j) {
        if (document.querySelector('.live-banner')) return;
        const hero = document.querySelector('.hero');
        if (!hero) return;
        const html = `
        <section class="live-banner">
            <div class="container">
                <div class="live-header">
                    <span class="live-dot"></span>
                    <span class="live-label">EN VIVO</span>
                    <span class="live-hipodromo">📍 ${j.hipodromo}</span>
                </div>
                <div class="live-body">
                    <div class="live-race">🏇 ${j.carrera_actual}</div>
                    <div class="live-time">⏱ ${j.hora}</div>
                    ${j.tipo ? `<div class="live-type">${j.tipo}</div>` : ''}
                    ${j.favorito ? `<div class="live-fav">🔥 Favorito: ${j.favorito}</div>` : ''}
                    <div class="live-progress">${j.progreso}</div>
                    ${j.siguiente ? `<div class="live-next">⏳ Siguiente: ${j.siguiente} ${j.siguiente_hora ? '(' + j.siguiente_hora + ')' : ''}</div>` : ''}
                </div>
            </div>
        </section>`;
        hero.insertAdjacentHTML('afterend', html);
    }

    function processLiveStatus(status) {
        const jornadas = status.jornadas || [];
        jornadas.forEach(j => { if (j.activa) showLiveBanner(j); });
    }

    function pollLiveStatus() {
        fetch('https://mibot-n8n-auto.duckdns.org/race-status/live_status.json?_=' + Date.now())
            .then(r => r.json())
            .then(s => processLiveStatus(s))
            .catch(() => {
                fetch('data/live_status.json?_=' + Date.now())
                    .then(r => r.json())
                    .then(s => processLiveStatus(s))
                    .catch(() => {});
            });
    }
    pollLiveStatus();
    setInterval(pollLiveStatus, 30000);

    // Visitor counter (CountAPI)
    fetch('https://api.countapi.xyz/hit/cuadroperfecto-com/visitas')
        .then(r => r.json())
        .then(data => {
            document.getElementById('visitorCount').textContent = (data.value || 0).toLocaleString('es');
        })
        .catch(() => {});

    showPage(location.pathname || '/');
});

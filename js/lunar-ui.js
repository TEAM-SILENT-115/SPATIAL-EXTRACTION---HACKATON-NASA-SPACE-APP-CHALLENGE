/* DOM/canvas adapter. All resource and route rules live in Lunar. */
var LunarUI = (function () {
  'use strict';
  let s = Lunar.nuevo(), root, intro = true, modal = null, tutorialStep = 0;
  let category = 0, selected = 0, message = 'Diseña el viaje que te traerá de vuelta.', keys = {}, elapsed = 0, last = 0;
  let particles = [];
  let notif = null, notifTimer = null;

  function mostrarNotif(tipo, badge, titulo, texto, extra) {
    notif = { tipo, badge, titulo, texto, extra };
    if (notifTimer) clearTimeout(notifTimer);
    notifTimer = setTimeout(() => { notif = null; render(); }, 8500);
  }

  const R = REGLAS_LUNARES;
  const n = v => Number(v).toFixed(1);
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn = (a, t, x='', off=false, extra='') => `<button class="btn ${extra}" data-l="${a}" data-x="${x}" ${off?'disabled':''}>${t}</button>`;
  const names = {directa:'Ruta directa', ahorro:'Ruta de ahorro'};

  function header() {
    const audioOn = LunarAudio.estaActivo();
    const sitioInfo = SITIOS_LUNARES[s.sitio] || SITIOS_LUNARES.Site01;

    // Métricas de telemetría de recursos en tiempo real
    const masaActual = Lunar.masa(s);
    const masaMax = s.masa.capacidad || 120;
    const pctMasa = Math.min(100, Math.round((masaActual / masaMax) * 100));
    const masaAlerta = masaActual > masaMax;

    let oxActual, oxMax, pctOx, oxAlerta;
    let energiaActual, energiaMax, pctEnergia, energiaAlerta;

    if (s.etapa === 'hangar') {
      const tot = Motor.totales(s);
      const pr = Lunar.proyectar(s);
      oxActual = tot.oxigeno;
      oxMax = Math.max(160, tot.oxigeno);
      pctOx = Math.min(100, Math.round((tot.oxigeno / oxMax) * 100));
      oxAlerta = tot.oxigeno < pr.ox;

      energiaActual = tot.energia;
      energiaMax = Math.max(160, tot.energia);
      pctEnergia = Math.min(100, Math.round((tot.energia / energiaMax) * 100));
      energiaAlerta = pr.total > tot.energia;
    } else {
      oxActual = Math.max(0, Math.round(s.recursos.oxigeno));
      oxMax = s.plan?.oxigeno || Motor.totales(s).oxigeno || 100;
      pctOx = oxMax > 0 ? Math.max(0, Math.min(100, Math.round((oxActual / oxMax) * 100))) : 0;
      oxAlerta = s.retorno && s.recursos.oxigeno < s.retorno.ox;

      energiaActual = Math.max(0, Math.round(s.recursos.energiaWh));
      energiaMax = s.plan?.energia || Motor.totales(s).energia || 100;
      pctEnergia = energiaMax > 0 ? Math.max(0, Math.min(100, Math.round((energiaActual / energiaMax) * 100))) : 0;
      energiaAlerta = s.retorno && s.recursos.energiaWh < s.retorno.wh;
    }

    return `<header class="l-header">
      <div class="l-header-brand">
        <b>MISIÓN UMBRAL</b>
        <small>AGENCIA LUNAR · ${sitioInfo.estrellas} ${esc(sitioInfo.dificultad.toUpperCase())}</small>
      </div>

      <div class="l-header-telemetria">
        <!-- BARRA DE ESPACIO / CARGA ÚTIL -->
        <div class="l-hbar espacio ${masaAlerta ? 'alerta' : ''}" title="Espacio de carga útil: ${masaActual} kg usados de ${masaMax} kg disponibles">
          <div class="l-hbar-label">
            <span>⚖ ESPACIO</span>
            <b>${masaActual} / ${masaMax} kg</b>
          </div>
          <div class="l-hbar-track">
            <div class="l-hbar-fill" style="width:${pctMasa}%"></div>
          </div>
        </div>

        <!-- BARRA DE OXÍGENO -->
        <div class="l-hbar oxigeno ${oxAlerta ? 'alerta' : ''}" title="Soporte vital: ${oxActual} u de O₂ disponibles">
          <div class="l-hbar-label">
            <span>🫁 OXÍGENO</span>
            <b>${oxActual} u</b>
          </div>
          <div class="l-hbar-track">
            <div class="l-hbar-fill" style="width:${pctOx}%"></div>
          </div>
        </div>

        <!-- BARRA DE ENERGÍA -->
        <div class="l-hbar energia ${energiaAlerta ? 'alerta' : ''}" title="Batería: ${energiaActual} Wh de reserva">
          <div class="l-hbar-label">
            <span>⚡ BATERÍA</span>
            <b>${energiaActual} Wh</b>
          </div>
          <div class="l-hbar-track">
            <div class="l-hbar-fill" style="width:${pctEnergia}%"></div>
          </div>
        </div>
      </div>

      <div class="l-header-controles">
        <nav class="l-header-nav">
          ${['hangar','viaje','superficie','informe'].map((x,i)=>`<span class="${s.etapa===x?'active':''}">${'0'+(i+1)} ${['PLANEAR','VIAJAR','EXPLORAR','APRENDER'][i]}</span>`).join('')}
        </nav>
        ${btn('sound', audioOn ? '🔊' : '🔇', '', false, 'btn-sound mini' + (audioOn ? '' : ' muted'))}
        ${btn('tutorial_modal', '🚀 TUTORIAL', '', false, 'btn-tutorial-header mini')}
        ${btn('credits', 'CRÉDITOS', '', false, 'mini')}
      </div>
    </header>`;
  }

  function tutorial() {
    if (!s.tutorial.activo) return '';
    const p = Lunar.guiaPaso(s);
    return `<aside class="banner-tutorial" role="region" aria-label="Tutorial AIDA">
      <div class="aida-badge" data-l="tutorial_modal" title="Haz clic para abrir el tutorial interactivo">
        🚀 ${esc(p.badge)}
      </div>
      <div class="aida-info">
        <span class="aida-fase-tag">${esc(p.fase)}</span>
        <p class="aida-instruccion">${esc(p.texto)}</p>
      </div>
      <div class="aida-acciones">
        ${s.etapa === 'hangar' ? `
          ${btn('tutorial_step_hangar', '◀', String(p.paso - 2), p.paso <= 1, 'mini btn-tutorial-nav')}
          ${btn('tutorial_step_hangar', '▶', String(p.paso), p.paso >= p.total, 'mini btn-tutorial-nav')}
        ` : ''}
        ${btn('tutorial_modal', '📖 GUÍA ▶', '', false, 'btn-tutorial-open mini')}
        ${btn('skip', '✕ CERRAR', '', false, 'btn-tutorial-close mini')}
      </div>
    </aside>`;
  }

  function introHTML() {
    return `<div class="l-intro">
      <canvas id="l-hero" width="400" height="300" aria-label="Mapa lunar"></canvas>
      <section>
        <p class="l-kicker">NASA SPACE APPS · DEMO OFICIAL</p>
        <h1>MISIÓN<br><em>UMBRAL</em></h1>
        <p class="l-lead">La ciencia empieza con un buen plan.<br>Y termina cuando logras regresar.</p>
        <p>Inspirado en los retos de la misión <b>VIPER</b> y el programa <b>Artemis</b> en el Polo Sur Lunar. Diseña tu carga útil, opera en vuelo y explora cráteres lunares con datos reales de pendientes de la NASA.</p>
        <div class="fila-botones">
          ${btn('play','JUGAR','','','grande')}
          ${btn('tutorial','CÓMO JUGAR','','','grande')}
          ${btn('tutorial_modal','GUÍA Y REGLAS','','','grande')}
        </div>
        <small>3 niveles de dificultad · Pendientes reales LOLA · 6 finales narrativos<br>100% sin conexión · WASD / flechas · E interactúa · I inventario · M silenciar</small>
      </section>
    </div>`;
  }

  function routeCard(r) {
    const p = Lunar.proyectar(s, r);
    return `<button data-l="ruta" data-x="${r}" class="l-route ${s.ruta===r?'chosen':''}">
      <b>${s.ruta===r?'●':'○'} ${names[r]}</b>
      <span>${p.distancia} m ida + vuelta · ${n(p.total)} Wh</span>
      <small>Pendiente media ida ${n(p.a.media)}° · máx. ${n(p.a.max)}°</small>
    </button>`;
  }

  function itemCategory(o) {
    return o.tipo==='herramienta'?0:['bateria','combustible'].includes(o.tipo)?1:o.tipo==='oxigeno'?2:3;
  }

  function inventoryHTML(hangar) {
    const items = DATOS.objetos.filter(o=>itemCategory(o)===category&&(hangar||s.equipo.includes(o.id)));
    const samples = category===3&&!hangar?s.muestras.recogidas:[];
    selected = Math.min(selected, Math.max(0, items.length+samples.length-1));
    const o = items[selected];
    return `<div class="l-tabs" role="tablist">
      ${R.categorias.map((c,i)=>`<button role="tab" aria-selected="${i===category}" class="${i===category?'chosen':''}" data-l="category" data-x="${i}">${c}</button>`).join('')}
    </div>
    <div class="l-items">
      ${items.map((o,i)=>`<button data-l="select" data-x="${i}" class="${i===selected?'chosen':''}"><span>${o.icono} ${o.nombre}</span><small>×${s.equipo.includes(o.id)?1:0} ${s.equipo.includes(o.id)?'✓ Equipado':''}</small></button>`).join('')}
      ${samples.map((name,i)=>`<button data-l="select" data-x="${items.length+i}" class="${selected===items.length+i?'chosen':''}">◇ ${esc(name)} <small>×1 · Sin entregar</small></button>`).join('')}
      ${!items.length&&!samples.length?'<p>Sin objetos en esta categoría.</p>':''}
    </div>
    <div class="l-detail">
      ${o?`<b>${o.icono} ${o.nombre}</b><p>${esc(R.usos[o.id])}</p><small>${o.masa} kg · ${o.costo} créditos</small>${hangar?btn('equipo',s.equipo.includes(o.id)?'QUITAR':'EQUIPAR',o.id):''}`:samples.length?'<b>◇ Muestra científica</b><p>1 kg · 100 puntos al entregarla. Llévala al módulo antes de agotar los recursos.</p>':'<p>Selecciona una categoría para ver su equipo.</p>'}
    </div>
    <p class="l-load">Carga usada <b>${Lunar.masa(s)} / ${s.masa.capacidad} kg</b> · Disponible ${s.masa.capacidad-Lunar.masa(s)} kg</p>`;
  }

  function hangarHTML() {
    const v = Lunar.evaluar(s), p = v.p, t = v.t;
    const infoSitio = SITIOS_LUNARES[s.sitio] || SITIOS_LUNARES.Site01;
    const esDesbloqueado = Lunar.esDesbloqueado(s, s.sitio);

    return `<main class="l-hangar">
      <section class="l-panel">
        <p class="l-kicker">01 / SITIO Y RUTA LUNAR</p>
        <h2>Recupera el núcleo.<br>Entrégalo en el módulo.</h2>
        <label>Zona de exploración
          <select data-l="site" aria-label="Zona científica">
            ${MAPAS_NASA.map(m => {
              const meta = SITIOS_LUNARES[m.id] || {nombre: m.name, estrellas: '', dificultad: ''};
              const desbloq = Lunar.esDesbloqueado(s, m.id);
              return `<option value="${m.id}" ${s.sitio===m.id?'selected':''} ${!desbloq?'disabled':''}>
                ${desbloq ? meta.estrellas : '🔒'} ${meta.nombre} (${meta.dificultad})
              </option>`;
            }).join('')}
          </select>
        </label>
        <div class="l-site-badge ${infoSitio.claseDificultad}">
          <b>${infoSitio.estrellas} DIFICULTAD: ${infoSitio.dificultad.toUpperCase()}</b>
          <p>${esc(infoSitio.descripcion)}</p>
          <small>${esDesbloqueado ? '✓ Certificado para descenso' : '🔒 Requiere completar la misión anterior'}</small>
        </div>
        <canvas id="l-map" width="400" height="300" aria-label="Mapa lunar"></canvas>
        <div class="l-legend"><span>▣ Módulo</span><span>◇ Núcleo</span><span>··· Directa</span><span>━ Ahorro</span></div>
        ${routeCard('directa')}
        ${routeCard('ahorro')}
        <small>Gris: suave · rayado: &gt;15° · negro: &gt;27° intransitable.</small>
      </section>

      <section class="l-panel">
        <p class="l-kicker">02 / EQUIPO Y CARGA ÚTIL</p>
        <label>Lanzador
          <select data-l="rocket" aria-label="Lanzador">
            ${DATOS.cohetes.map(c=>`<option value="${c.id}" ${s.cohete===c.id?'selected':''}>${c.nombre} · ${c.capacidadMasa} kg · ${c.costo} cr</option>`).join('')}
          </select>
        </label>
        ${inventoryHTML(true)}
        <p>Presupuesto <b class="${s.presupuesto.gastado>s.presupuesto.total?'alerta':''}">${s.presupuesto.gastado} / ${s.presupuesto.total} cr</b></p>
        <small>La masa encarece cada metro. Deja 1 kg libre por cada muestra esperada.</small>
      </section>

      <section class="l-panel">
        <p class="l-kicker">03 / PROBAR EL PLAN</p>
        <div class="l-big"><strong>${n(t.energia)}</strong><span>Wh disponibles</span></div>
        <div class="l-energy"><span style="width:${Math.min(100,p.total/Math.max(1,t.energia)*100)}%"></span></div>
        <table class="l-table">
          <tr><td>Ida · ${p.a.metros} m</td><td>${n(p.a.wh)} Wh</td></tr>
          <tr><td>Perforar el núcleo</td><td>${n(p.tarea)} Wh</td></tr>
          <tr><td>Regreso con 1 kg · ${p.b.metros} m</td><td>${n(p.b.wh)} Wh</td></tr>
          <tr><th>Consumo previsto</th><th>${n(p.total)} Wh</th></tr>
          <tr><td>Reserva recomendada (15%)</td><td>${n(p.reserva)} Wh</td></tr>
          <tr><td>Reserva al volver</td><td class="${p.margen<p.reserva?'ambar':'ok'}">${n(p.margen)} Wh</td></tr>
          <tr><td>O₂ disponible / previsto</td><td>${t.oxigeno} / ${n(p.ox)} u</td></tr>
          <tr><td>Combustible de maniobra</td><td>${t.combustible} u</td></tr>
        </table>
        <small>Reserva = colchón vital ante pendientes o imprevistos de regolito.</small>
        <div class="l-check ${v.bloqueos.length?'danger':''}">
          ${v.bloqueos.map(x=>`<p>⛔ ${x}</p>`).join('')}
          ${v.riesgos.map(x=>`<p>⚠ ${x}</p>`).join('')}
          ${!v.bloqueos.length&&!v.riesgos.length?'<p>✓ Equipo y reserva cubren la misión prevista.</p>':''}
        </div>
        <div class="fila-botones">
          ${btn('test','PROBAR PLAN')}
          ${btn('formula','VER CÁLCULO')}
        </div>
        ${s.prueba?'<p class="ok">✓ Prueba completada. Revisa el resultado antes de lanzar.</p>':''}
        ${btn('launch', v.riesgos.length?'LANZAR CON RIESGO':'LANZAR', '', !!v.bloqueos.length||!s.prueba||!esDesbloqueado, 'grande')}
      </section>
    </main>`;
  }

  function travelHTML() {
    const normal = Lunar.proyectar(s), near = Lunar.proyectar(s, s.ruta, Lunar.map(s).nearModule);
    return `<main class="l-travel">
      <section class="l-travel-side">
        <p class="l-kicker">EN VUELO / ${esc(Lunar.map(s).name)}</p>
        <h1>Una decisión antes<br>de tocar la Luna.</h1>
        <p>Tu diseño de carga y la ruta ${names[s.ruta].toLowerCase()} van a bordo.</p>
        <canvas id="l-ship" width="380" height="110"></canvas>
        <div class="l-telemetria-resumen">
          <span>Combustible: <b>${s.recursos.combustible} u</b></span> · 
          <span>Batería: <b>${s.recursos.energiaWh} Wh</b></span> · 
          <span>O₂: <b>${s.recursos.oxigeno} u</b></span>
        </div>
      </section>
      <section class="l-panel l-travel-panel">
        <h2>Reconocimiento del descenso</h2>
        ${!s.viaje.escaneado?`
          <p>Escanea la telemetría del punto de descenso para evaluar la plataforma más cercana al objetivo.</p>
          <div style="margin-top:10px">${btn('scanflight','ESCANEAR DESCENSO','',false,'grande')}</div>
        `:`
          <p>Telemetría recibida. Corregir reduce la caminata en regolito pero consume 30 u de combustible.</p>
          <div class="l-options">
            <article class="l-opt-card ${s.viaje.decidido && !s.viaje.corrigio ? 'seleccionada' : ''}">
              <h3>Mantener</h3>
              <p>${normal.distancia} m · ${n(normal.total)} Wh</p>
              <p>Combustible: −0 u<br>Reserva estimada: ${n(s.recursos.energiaWh-normal.total)} Wh</p>
              <div class="l-badge-nominal">✓ Descenso nominal directo</div>
              ${btn('keep','MANTENER','',s.viaje.decidido, 'grande')}
            </article>
            <article class="l-opt-card ${s.recursos.combustible<30?'bloqueada':''} ${s.viaje.decidido && s.viaje.corrigio ? 'seleccionada' : ''}">
              <h3>Corregir</h3>
              <p>${near.distancia} m · ${n(near.total)} Wh</p>
              <p>Combustible: −30 u<br>Reserva estimada: ${n(s.recursos.energiaWh-near.total)} Wh</p>
              ${s.recursos.combustible<30?`
                <div class="l-alerta-combustible">
                  <b>⛔ Maniobra no disponible (Falta combustible)</b>
                  <small>Requiere <b>30 u</b> de combustible. Llevas <b>${s.recursos.combustible} u</b>.<br>En el Hangar se requería equipar <b>Combustible extra (+30 u)</b> o el cohete <b>Titán</b>.</small>
                  ${!s.viaje.decidido?`<div style="margin-top:6px">${btn('back_to_hangar','↺ VOLVER AL HANGAR A EQUIPAR','',false,'mini')}</div>`:''}
                </div>
              `:`
                <div class="l-badge-nominal">✓ Propulsores de maniobra listos (−30 u)</div>
              `}
              ${btn('correct','CORREGIR','',s.viaje.decidido||s.recursos.combustible<30, 'grande')}
            </article>
          </div>
        `}
        ${s.viaje.decidido?`
          <div class="l-descenso-box">
            <div class="l-descenso-msg">✓ ${s.viaje.corrigio?'Corrección de órbita':'Trayectoria original'} sellada para el descenso.</div>
            ${btn('land','🚀 DESCENDER A SUPERFICIE','',false,'grande btn-descenso-pulso')}
          </div>
        `:''}
      </section>
    </main>`;
  }

  function surfaceHTML() {
    const c = Lunar.contexto(s), r = s.retorno;
    const risk = s.recursos.energiaWh < r.wh || s.recursos.oxigeno < r.ox;
    return `<main class="l-surface">
      <div class="l-hud">
        <div>
          <small>OBJETIVO PRINCIPAL</small>
          <b>${s.tomada ? 'Entrega el núcleo en el módulo ▣' : 'Perfora el núcleo del cráter ◇'}</b>
        </div>
        <div>
          <small>ENERGÍA RESTANTE</small>
          <b>${n(s.recursos.energiaWh)} Wh</b>
        </div>
        <div class="${risk?'alerta':'ok'}">
          <small>REGRESO MÍNIMO · LÍNEA AZUL</small>
          <b>${n(r.wh)} Wh · ${r.metros} m</b>
        </div>
        <div>
          <small>O₂ / PARA VOLVER</small>
          <b>${n(s.recursos.oxigeno)} / ${n(r.ox)} u</b>
        </div>
      </div>
      <div class="l-field">
        <canvas id="l-field" width="640" height="320" tabindex="0" aria-label="Superficie lunar. WASD para moverte, E para interactuar"></canvas>
        <div class="l-minimap">
          <canvas id="l-mini" width="160" height="120"></canvas>
          <span>${esc(Lunar.map(s).name)}</span>
        </div>
        <span class="l-compass">N ↑</span>
        ${notif ? `
          <div class="l-notif ${notif.tipo}" role="alert">
            <div class="l-notif-bar">
              <span class="l-notif-tag">${notif.badge}</span>
              <strong class="l-notif-title">${notif.titulo}</strong>
              <button class="btn mini l-notif-btn-close" data-l="dismiss_notif">✕ CERRAR</button>
            </div>
            <p class="l-notif-desc">${notif.texto}</p>
            ${notif.extra ? `<div class="l-notif-extra">${notif.extra}</div>` : ''}
          </div>
        ` : ''}
      </div>
      <div class="l-interaction">
        <div>
          ${c?`<b>E · ${c.texto}${c.wh?' · '+c.wh+' Wh':''}</b>
          <small>${c.falta || (c.wh ? 'Tras la acción: '+n(s.recursos.energiaWh-c.wh-r.wh)+' Wh sobre el regreso (puede encarecer al transportar).' : 'Las muestras solo puntúan al entregarlas en el módulo.')}</small>`:
          '<b>Controles: WASD / Flechas para caminar · E interactúa · I inventario · M silenciar</b><small>Línea ámbar: ida planeada · Línea azul: camino de regreso de menor gasto · Puntos: huellas de regolito</small>'}
        </div>
        ${c?btn('interact','E · '+c.texto):''}
        ${btn('inventory','I · INVENTARIO')}
        ${btn('pause','ESC · PAUSA')}
      </div>
    </main>`;
  }

  function reportHTML() {
    const r = Lunar.informe(s);
    const fin = r.final || FINALES_LUNARES.maestro;
    const nuevo = r.nuevoDesbloqueo ? SITIOS_LUNARES[r.nuevoDesbloqueo] : null;

    return `<main class="l-report">
      <p class="l-kicker">INFORME FORENSE DE MISIÓN / ${esc(Lunar.map(s).name)}</p>

      <div class="l-ending-card" style="border-color:${fin.color}">
        <div class="l-ending-header">
          <div class="l-rank-badge" style="color:${fin.color};border-color:${fin.color}">${fin.rango}</div>
          <div class="l-ending-titles">
            <h2 style="color:${fin.color}">${fin.icono} ${esc(fin.titulo)}</h2>
            <small>${esc(fin.subtitulo)}</small>
          </div>
        </div>
        <p class="l-ending-epilogo">«${esc(fin.epilogo)}»</p>
        <div class="l-ending-leccion">
          <b>💡 LECCIÓN DE INGENIERÍA:</b> ${esc(fin.leccion)}
        </div>
      </div>

      ${nuevo ? `
        <aside class="l-unlock-banner">
          <strong>🎉 ¡NUEVA ZONA CERTIFICADA Y DESBLOQUEADA: ${nuevo.nombre.toUpperCase()}!</strong>
          <p>${esc(nuevo.descripcion)}</p>
          ${btn('next_mission', 'EXPLORAR ' + nuevo.nombre.toUpperCase() + ' (' + nuevo.dificultad + ')', nuevo.id, false, 'grande')}
        </aside>
      ` : ''}

      <div class="l-score">
        <strong>+${r.ciencia}</strong>
        <span>PROGRESO CIENTÍFICO<br>${r.entregadas} muestra(s) asegurada(s)</span>
        <b style="color:${fin.color}">${fin.rango} · ${esc(fin.subtitulo)}</b>
      </div>

      <p class="l-cause">${esc(r.causa)}</p>

      <table class="l-table">
        <tr><th>Parámetro</th><th>Plan de agencia</th><th>Real ejecutado</th></tr>
        <tr><td>Distancia caminada</td><td>${s.plan.distancia} m</td><td>${r.distancia} m</td></tr>
        <tr><td>Energía consumida</td><td>${n(s.plan.total)} Wh</td><td>${n(r.consumo)} Wh</td></tr>
        <tr><td>Reserva final disponible</td><td>${n(s.plan.margen)} Wh</td><td>${n(r.restante)} Wh</td></tr>
      </table>
      <p><small>Desglose de energía: Movimiento ${n(s.movimientoWh)} Wh · Perforación y trabajo ${n(s.accionesWh)} Wh · Reserva recomendada: ${n(s.plan.reserva)} Wh.</small></p>

      ${s.anterior?`<div class="l-check">Partida anterior: ${s.anterior.ciencia} pts · ${n(s.anterior.consumo)} Wh gastados. Ahora: ${r.ciencia} pts · ${n(r.consumo)} Wh gastados. Compara tu balance de masa y ruta elegida.</div>`:''}

      <div class="fila-botones">
        ${btn('repeat','REPETIR AJUSTANDO EL PLAN','','','grande')}
        ${btn('new','CAMBIAR DE ZONA')}
      </div>
    </main>`;
  }

  function modalTutorialHTML() {
    const slides = [
      {
        titulo: '01. El Ciclo de la Misión Espacial',
        contenido: `
          <h3>De la Agencia a la Superficie Lunar</h3>
          <p>En la NASA, diseñar una misión significa equilibrar demandas opuestas: ciencia vs masa vs energía vs presupuesto.</p>
          <ul>
            <li><b>01. Planear (Hangar):</b> Diseña tu cohete, batería, herramientas y ruta de descenso.</li>
            <li><b>02. Viajar (En vuelo):</b> Escanea el descenso y decide si gastar combustible para corregir.</li>
            <li><b>03. Explorar (Superficie):</b> Camina con WASD/flechas, llega al núcleo ◇ y usa E para perforar.</li>
            <li><b>04. Regresar (Módulo):</b> Las muestras solo puntúan si logras volver al módulo ▣ con vida.</li>
          </ul>
        `
      },
      {
        titulo: '02. La Ecuación del Retorno',
        contenido: `
          <h3>En el espacio, cada gramo cuesta vatios</h3>
          <p>Moverte por la Luna consume energía en base a 3 factores reales:</p>
          <ul>
            <li><b>Distancia:</b> Cada metro caminado gasta batería.</li>
            <li><b>Masa:</b> Cada kg extra que llevas aumenta el gasto por paso. ¡Llevar muestras de 1 kg también encarece tu regreso!</li>
            <li><b>Pendiente al cuadrado:</b> Subir por laderas empinadas multiplica exponencialmente el consumo de los motores.</li>
            <li><b>Reserva (15%):</b> Tu seguro de vida ante desvíos o terreno difícil.</li>
          </ul>
        `
      },
      {
        titulo: '03. Telemetría y Controles en Superficie',
        contenido: `
          <h3>Cómo leer tu HUD y moverte</h3>
          <ul>
            <li><b>Línea Ámbar:</b> Tu camino planificado original hacia el objetivo.</li>
            <li><b>Línea Azul:</b> Tu ruta de regreso más segura y de menor consumo calculada en tiempo real por Dijkstra.</li>
            <li><b>Indicador de Retorno:</b> Si tu energía actual baja de lo que cuesta volver, ¡quedarás varado!</li>
            <li><b>Teclas:</b> WASD o Flechas para caminar · <b>E</b> para interactuar · <b>I</b> para inventario · <b>M</b> para silenciar · <b>Esc</b> para pausar.</li>
          </ul>
        `
      },
      {
        titulo: '04. Escala de Dificultad y Múltiples Finales',
        contenido: `
          <h3>Progresión y Rejugabilidad</h3>
          <ul>
            <li><b>Connecting Ridge (Fácil ★☆☆):</b> Pendientes dóciles para aprender a planificar.</li>
            <li><b>Borde de Shackleton (Desafiante ★★☆):</b> El desafío canónico de balance VIPER.</li>
            <li><b>Borde de Gerlache (Extremo ★★★):</b> Pendientes severas que exigen optimización perfecta.</li>
            <li><b>6 Finales Disponibles:</b> Desde <b>Pionero Artemis (Rango S+)</b> hasta <b>Monolito Silencioso (Rango F)</b> con telemetría forense interactiva.</li>
          </ul>
        `
      }
    ];

    const actual = slides[tutorialStep] || slides[0];
    return `<div class="l-tutorial-box">
      <div class="l-tutorial-nav">
        <span>TUTORIAL DE MISIÓN ESPACIAL · PASO ${tutorialStep + 1} DE ${slides.length}</span>
        <small>${esc(actual.titulo)}</small>
      </div>
      <div class="l-tutorial-content">
        ${actual.contenido}
      </div>
      <div class="l-tutorial-actions">
        ${tutorialStep > 0 ? btn('tutorial_step', '◀ ANTERIOR', String(tutorialStep - 1)) : '<span></span>'}
        ${tutorialStep < slides.length - 1 ?
          btn('tutorial_step', 'SIGUIENTE ▶', String(tutorialStep + 1)) :
          btn('close', '¡ENTENDIDO, A JUGAR!', '', false, 'grande')}
      </div>
    </div>`;
  }

  function modalHTML() {
    if (!modal) return '';
    let body = '';
    if (modal === 'tutorial_modal') body = modalTutorialHTML();
    if (modal === 'inventory') {
      const masaTotal = Lunar.masa(s);
      const maxMasa = s.masa.capacidad;
      const capacidadMuestras = Motor.totales(s).capacidadMuestras;
      const muestrasRecogidas = s.muestras.recogidas.length;
      body = `
        <div class="l-inv-header">
          <div class="l-inv-title">
            <h2>🎒 BAHÍA DE CARGA E INVENTARIO ASTRONÁUTICO</h2>
            <small>ESTADO DE TELEMETRÍA EN SUPERFICIE · SIMULACIÓN PAUSADA</small>
          </div>
          <div class="l-inv-badges">
            <span class="l-inv-badge">📦 MUESTRAS: <b>${muestrasRecogidas}/${capacidadMuestras}</b></span>
            <span class="l-inv-badge">⚖ CARGA: <b>${masaTotal}/${maxMasa} kg</b></span>
            <span class="l-inv-badge">⚡ ENERGÍA: <b>${n(s.recursos.energiaWh)} Wh</b></span>
            <span class="l-inv-badge">◍ O₂: <b>${n(s.recursos.oxigeno)} u</b></span>
          </div>
        </div>
        ${inventoryHTML(false)}
        <div class="l-inv-footer">
          <small>🎮 Controles: [←][→] cambiar categoría · [↑][↓] seleccionar objeto · [I] o [Esc] volver a la superficie</small>
        </div>
      `;
    }
    if (modal === 'pause') {
      body = `
        <div class="l-inv-header">
          <div class="l-inv-title">
            <h2>⏸️ MISIÓN LUNAR EN PAUSA</h2>
            <small>TELEMETRÍA DETENIDA · NO SE CONSUMEN RECURSOS</small>
          </div>
        </div>
        <p style="margin:12px 0 16px;line-height:1.5">La nave y el soporte vital están en modo espera. Puedes consultar los protocolos del manual o reanudar.</p>
        <div class="fila-botones" style="margin-bottom:12px">
          ${btn('tutorial_modal','📖 ABRIR TUTORIAL COMPLETO')}
          ${btn('formula','📐 VER ECUACIONES')}
          ${btn('credits','ℹ️ CRÉDITOS')}
        </div>
      `;
    }
    if (modal === 'formula') body = `<h2>Ecuación de Navegación y Energía</h2><p>Por cada metro recorrido: distancia × ${R.whMetro} Wh/m × (1 + masa / ${R.masaReferencia} kg) × (1 + pendiente / ${R.pendienteReferencia}°)².</p><p>Acciones: perforar 25 Wh, escanear 5 Wh, recoger 3 Wh. Soporte vital: ${R.oxMetro} u/metro más trabajo. Reserva recomendada: 15% del total.</p>`;
    if (modal === 'credits') body = `<h2>Créditos y Rigor Científico</h2><p>Pendientes reales: NASA Goddard / LRO-LOLA (Barker et al., 2021). Sitios 01, 04 y 11 procesados desde GeoTIFF originales de 5 m/píxel.</p><p>Misión Umbral — Proyecto para el NASA Space Apps Challenge 2026. Arte, código y sonido 100% originales del equipo, sin dependencias externas.</p>`;
    return `<div class="velo"><section class="panel modal l-modal" role="dialog" aria-modal="true">${body}${btn('close','CERRAR · ESC','',false,'grande')}</section></div>`;
  }

  function drawMap(id, mini=false, hero=false) {
    const cv = document.getElementById(id);
    if (!cv) return;
    const ctx = cv.getContext('2d'), m = Lunar.map(s), t = cv.width / m.width;
    ctx.imageSmoothingEnabled = false;
    terrain(ctx, m, t, 0, 0);

    const line = (path, color, dashed=false) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = mini ? 1 : 2;
      ctx.setLineDash(dashed ? [3,3] : []);
      ctx.beginPath();
      path.forEach((p,i) => {
        const x = (p[0] + 0.5) * t, y = (p[1] + 0.5) * t;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (!mini) {
      line(Lunar.proyectar(s, 'directa').ida, '#e6bd6a', true);
      line(Lunar.proyectar(s, 'ahorro').ida, '#6dd6cf');
    }
    if (mini && s.retorno) line(s.retorno.path, '#86e5f4');

    [[s.modulo||m.module, '#e6bd6a'], [m.target, '#ffffff'], [m.extra, '#79b5f2']].forEach(([p, color]) => {
      ctx.fillStyle = color;
      ctx.fillRect(p[0]*t - 1, p[1]*t - 1, Math.max(3, t), Math.max(3, t));
    });

    if (s.pos) {
      ctx.fillStyle = '#ff7785';
      ctx.fillRect(s.pos[0]*t, s.pos[1]*t, Math.max(3, t), Math.max(3, t));
    }
    if (!mini) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('M', m.module[0]*t, m.module[1]*t - 4);
      ctx.fillText('OBJETIVO', Math.min(cv.width - 65, m.target[0]*t - 25), m.target[1]*t - 6);
    }
  }

  function terrain(ctx, m, t, ox, oy) {
    ctx.fillStyle = '#101728';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        const p = m.slopes[y][x], px = Math.round(x*t - ox), py = Math.round(y*t - oy);
        if (px > ctx.canvas.width || py > ctx.canvas.height || px+t < 0 || py+t < 0) continue;
        const v = p === null ? 15 : Math.round(123 - p*2.4);
        ctx.fillStyle = p === null || p > R.pendienteMax ? '#172033' : `rgb(${v-10},${v},${v+18})`;
        ctx.fillRect(px, py, t, t);
        ctx.fillStyle = p > 15 ? '#303d54' : '#8e9cad';
        ctx.fillRect(px + (x*7 + y*3) % Math.max(1, t-3), py + (y*7 + x*3) % Math.max(1, t-3), 2, 1);
        if (p > 15) {
          ctx.fillStyle = p > 27 ? '#374256' : '#56637b';
          ctx.fillRect(px+2, py+3, Math.max(1, t-4), 1);
        }
      }
    }
  }

  function drawSurface() {
    const cv = document.getElementById('l-field');
    if (!cv) return;
    const ctx = cv.getContext('2d'), m = Lunar.map(s), t = 20;
    const ox = Math.max(0, Math.min(m.width*t - cv.width, (s.pos[0] + 0.5)*t - cv.width/2));
    const oy = Math.max(0, Math.min(m.height*t - cv.height, (s.pos[1] + 0.5)*t - cv.height/2));
    const xy = p => [(p[0] + 0.5)*t - ox, (p[1] + 0.5)*t - oy];

    terrain(ctx, m, t, ox, oy);

    const path = (ps, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ps.forEach((p, i) => {
        const [x, y] = xy(p);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    };

    path(s.aterrizaje.ida, '#d7a24b', 1);
    path(s.retorno.path, '#76d2e7', 2);

    // Huellas en el regolito
    ctx.fillStyle = '#b4c0c8';
    s.pasos.forEach(p => {
      const [x, y] = xy(p);
      ctx.fillRect(x - 3, y + 3, 2, 1);
      ctx.fillRect(x + 1, y + 5, 2, 1);
    });

    // Partículas de regolito flotando
    particles = particles.filter(part => {
      part.x += part.vx;
      part.y += part.vy;
      part.vida -= 0.04;
      if (part.vida <= 0) return false;
      const [px, py] = xy([part.x / t, part.y / t]);
      ctx.fillStyle = `rgba(185, 198, 214, ${Math.max(0, part.vida)})`;
      ctx.fillRect(px, py, part.size, part.size);
      return true;
    });

    const sprite = (name, p) => {
      const [x, y] = xy(p);
      ctx.fillStyle = '#202b3c';
      ctx.fillRect(x - 7, y + 4, 16, 4);
      UI.arte.pint(ctx, UI.arte[name], Math.round(x - UI.arte[name][0].length/2), Math.round(y - UI.arte[name].length/2));
    };

    // Módulo lunar con baliza parpadeante
    sprite('modulo', s.modulo);
    const [mx, my] = xy(s.modulo);
    const luzBaliza = Math.floor(Date.now() / 450) % 2 === 0 ? '#58c5d8' : '#e6a640';
    ctx.fillStyle = luzBaliza;
    ctx.fillRect(mx - 1, my - 13, 3, 3);
    ctx.fillStyle = '#f3d998';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('M · MÓDULO', mx - 25, my - 16);

    // Marcador de núcleo con pulso de radar
    const [tx, ty] = xy(m.target);
    const pulso = Math.sin(Date.now() / 280) * 3;
    ctx.strokeStyle = '#e2eaf2';
    ctx.strokeRect(tx - 8 - pulso/2, ty - 8 - pulso/2, 16 + pulso, 16 + pulso);
    ctx.fillStyle = '#1a2435';
    ctx.fillRect(tx - 5, ty - 5, 10, 10);
    if (!s.tomada) sprite('cristal', m.target);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.tomada ? '✓ EXTRAÍDO' : '◇ NÚCLEO', tx - 24, ty - 14);

    // Marcador extra original
    const [ex, ey] = xy(m.extra);
    if (!s.extraTomada) {
      sprite(s.revelada ? 'muestra' : 'roca', m.extra);
      ctx.fillStyle = '#9fd6ff';
      ctx.fillText(s.revelada ? 'MUESTRA' : '? ESCANEO', ex - 20, ey - 12);
    }

    // Puntos de interés y obstáculos geológicos adicionales
    const pois = typeof PUNTOS_INTERES_LUNARES !== 'undefined' ? PUNTOS_INTERES_LUNARES[m.id] : null;
    if (pois && pois.obstaculos) {
      pois.obstaculos.forEach(obs => {
        const [ox, oy] = xy(obs);
        ctx.fillStyle = 'rgba(10, 15, 25, 0.6)';
        ctx.fillRect(ox - 8, oy + 4, 16, 5);
        UI.arte.pint(ctx, UI.arte.roca, Math.round(ox - UI.arte.roca[0].length/2), Math.round(oy - UI.arte.roca.length/2));
        ctx.fillStyle = '#f0a53b';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('▲ ROCA', ox - 14, oy - 10);
      });
    }

    if (pois && pois.escaneos) {
      pois.escaneos.forEach(poi => {
        const yaEscaneado = s.escaneosExtra && s.escaneosExtra.includes(poi.id);
        const [px, py] = xy(poi.pos);
        const pulsoPoi = Math.sin(Date.now() / 300) * 2;
        ctx.strokeStyle = yaEscaneado ? '#52c785' : '#00f2fe';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 7 - pulsoPoi/2, py - 7 - pulsoPoi/2, 14 + pulsoPoi, 14 + pulsoPoi);
        ctx.fillStyle = yaEscaneado ? '#1c3d2e' : '#0c2e47';
        ctx.fillRect(px - 5, py - 5, 10, 10);
        ctx.fillStyle = yaEscaneado ? '#52c785' : '#00f2fe';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(yaEscaneado ? '✓ ' + poi.nombre.slice(0, 10) : '? ' + poi.nombre.slice(0, 10), px - 20, py - 10);
      });
    }

    // Astronauta con animación de caminata en 4 direcciones
    const dir = s.direccion || 'down';
    const frameIdx = s.animFrame || 0;
    const astroSprite = s.perforando ?
      SPRITES_ANIMADOS.perforando :
      (SPRITES_ANIMADOS.astro[dir] ? SPRITES_ANIMADOS.astro[dir][frameIdx] : UI.arte.astro);

    const [ax, ay] = xy(s.pos);
    ctx.fillStyle = '#202b3c';
    ctx.fillRect(ax - 5, ay + 6, 12, 3);
    UI.arte.pint(ctx, astroSprite, Math.round(ax - astroSprite[0].length/2), Math.round(ay - astroSprite.length/2));

    drawMap('l-mini', true);
  }

  function drawShip() {
    const cv = document.getElementById('l-ship');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(0, 0, 400, 150);

    // Estrellas en deriva espacial
    const offsetEstrellas = (Date.now() * 0.02) % 400;
    UI.arte.estrellas(ctx, 400, 150, 75);

    // Planeta / Luna al fondo
    ctx.fillStyle = '#8fa3cc';
    ctx.beginPath();
    ctx.arc(310, 70, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a6a82';
    ctx.fillRect(310, 50, 17, 10);
    ctx.fillRect(282, 78, 11, 8);

    // Nave espacial
    ctx.save();
    ctx.translate(90, 30);
    ctx.scale(4, 4);
    UI.arte.pint(ctx, UI.arte.cohete, 0, 0);

    // Llamarada oscilante del propulsor
    const flare = Math.sin(Date.now() / 60) > 0;
    if (flare) {
      UI.arte.pint(ctx, UI.arte.cohete ? [
        '..f..',
        '.fff.',
        'fffff',
        '.fff.',
        '..f..'
      ] : [], -4, 4);
    }
    ctx.restore();
  }

  function aplicarResaltadoTutorial() {
    const prev = root.querySelectorAll('.control-resaltado, .l-foco-paso');
    for (let i = 0; i < prev.length; i++) {
      prev[i].classList.remove('control-resaltado', 'l-foco-paso');
    }

    if (!s.tutorial.activo) return;
    const p = Lunar.guiaPaso(s);
    if (!p || !p.selector) return;

    try {
      const target = root.querySelector(p.selector);
      if (target) {
        target.classList.add('control-resaltado', 'l-foco-paso');
        if (s.etapa === 'hangar' || s.etapa === 'viaje') {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    } catch (e) {}
  }

  function render() {
    const focus = document.activeElement?.dataset;
    const focusAction = focus?.l, focusX = focus?.x;
    root.innerHTML = (intro ? introHTML() :
      header() +
      tutorial() +
      (s.etapa==='hangar' ? hangarHTML() :
       s.etapa==='viaje' ? travelHTML() :
       s.etapa==='superficie' ? surfaceHTML() : reportHTML()) +
      `<footer class="l-footer" role="status">${esc(message)}</footer>`) +
      modalHTML();

    if (intro) drawMap('l-hero', false, true);
    else if (s.etapa==='hangar') drawMap('l-map');
    else if (s.etapa==='superficie') drawSurface();
    else if (s.etapa==='viaje') drawShip();

    if (focusAction) {
      const el = Array.from(root.querySelectorAll('[data-l]')).find(e => e.dataset.l===focusAction && e.dataset.x===focusX);
      if (el) el.focus({preventScroll:true});
    }

    aplicarResaltadoTutorial();
  }

  function act(a, x) {
    let result;
    LunarAudio.click();

    if (a === 'sound') {
      const activo = LunarAudio.conmutar();
      message = activo ? 'Audio de telemetría NASA activado.' : 'Audio silenciado.';
      render();
      return;
    }
    if (a === 'tutorial_modal') {
      modal = 'tutorial_modal';
      tutorialStep = 0;
      render();
      return;
    }
    if (a === 'tutorial_step') {
      tutorialStep = Math.max(0, Math.min(3, Number(x)));
      render();
      return;
    }
    if (a === 'play' || a === 'tutorial') {
      intro = false;
      s.tutorial.activo = a === 'tutorial';
    }
    if (a === 'help') {
      if (intro) intro = false;
      s.tutorial.activo = true;
      modal = null;
    }
    if (a === 'skip') s.tutorial.activo = false;
    if (['credits','formula','inventory','pause'].includes(a)) {
      modal = a;
      keys = {};
    }
    if (a === 'close') modal = null;
    if (a === 'tutorial_step_hangar') {
      const pIndex = Math.max(0, Math.min(5, Number(x)));
      if (pIndex === 0) {
        s.tutorial.rutaElegida = false;
        s.tutorial.comparado = false;
        s.tutorial.catIndex = undefined;
      } else if (pIndex === 1) {
        s.tutorial.rutaElegida = true;
        s.tutorial.comparado = true;
        s.tutorial.catIndex = 0;
        s.tutorial.cat1 = false;
        category = 0; selected = 0;
      } else if (pIndex === 2) {
        s.tutorial.rutaElegida = true;
        s.tutorial.comparado = true;
        s.tutorial.catIndex = 1;
        s.tutorial.cat1 = true;
        s.tutorial.cat2 = false;
        category = 1; selected = 0;
      } else if (pIndex === 3) {
        s.tutorial.rutaElegida = true;
        s.tutorial.comparado = true;
        s.tutorial.catIndex = 2;
        s.tutorial.cat1 = true;
        s.tutorial.cat2 = true;
        s.tutorial.cat3 = false;
        category = 2; selected = 0;
      } else if (pIndex === 4) {
        s.tutorial.rutaElegida = true;
        s.tutorial.comparado = true;
        s.tutorial.catIndex = 3;
        s.tutorial.cat1 = true;
        s.tutorial.cat2 = true;
        s.tutorial.cat3 = true;
        s.tutorial.equipoVisto = false;
        category = 3; selected = 0;
      } else if (pIndex >= 5) {
        s.tutorial.rutaElegida = true;
        s.tutorial.comparado = true;
        s.tutorial.catIndex = 3;
        s.tutorial.cat1 = true;
        s.tutorial.cat2 = true;
        s.tutorial.cat3 = true;
        s.tutorial.equipoVisto = true;
      }
      render();
      return;
    }
    if (a === 'category') {
      category = Number(x);
      selected = 0;
      if (s.tutorial.activo) {
        s.tutorial.catIndex = category;
        if (category === 1) s.tutorial.cat1 = true;
        if (category === 2) s.tutorial.cat2 = true;
        if (category === 3) {
          s.tutorial.cat3 = true;
          s.tutorial.equipoVisto = true;
        }
      }
    }
    if (a === 'select') selected = Number(x);

    if (['ruta','equipo','sitio','cohete'].includes(a)) {
      const before = Lunar.proyectar(s);
      Lunar.cambiar(s, a, x);
      const after = Lunar.proyectar(s);
      message = `Proyección ${n(before.total)} → ${n(after.total)} Wh; reserva ${n(before.margen)} → ${n(after.margen)} Wh. ${a==='ruta'?'Cambió distancia y pendientes.':a==='equipo'?'Cambió energía disponible o masa.':'Condiciones recalculadas.'}`;
      if (a === 'ruta' && s.tutorial.activo) {
        s.tutorial.rutaElegida = true;
        s.tutorial.comparado = true;
        s.tutorial.catIndex = 0;
        category = 0;
        selected = 0;
      }
    }
    if (a === 'test') {
      const v = Lunar.probar(s);
      message = v.bloqueos.length ? v.bloqueos.join(' ') : v.riesgos.length ? 'Plan con riesgo: '+v.riesgos.join(' ') : 'Plan probado: cubre ida, tarea, regreso y reserva recomendada.';
    }
    if (a === 'launch') {
      result = Lunar.lanzar(s);
    }
    if (a === 'scanflight') {
      Lunar.escanearViaje(s);
      setTimeout(() => {
        const btnKeep = root.querySelector('[data-l="keep"]');
        if (btnKeep) {
          btnKeep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
    if (a === 'dismiss_notif') {
      notif = null;
      render();
      return;
    }
    if (a === 'back_to_hangar') {
      s.etapa = 'hangar';
      s.viaje = {escaneado:false, decidido:false, corrigio:false};
      message = 'Regresaste al Hangar. Equipa Combustible extra (+30 u) o el cohete Titán para habilitar la corrección.';
      render();
      return;
    }
    if (a === 'keep' || a === 'correct') {
      result = Lunar.decidir(s, a === 'correct');
      setTimeout(() => {
        const btnLand = root.querySelector('[data-l="land"]');
        if (btnLand) {
          btnLand.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          btnLand.focus({ preventScroll: false });
        }
      }, 60);
    }
    if (a === 'land') {
      Lunar.descender(s);
      message = 'WASD / flechas: mover · E: interactuar · I: inventario · M: sonido · Esc: pausa.';
    }
    if (a === 'interact') {
      const c = Lunar.contexto(s);
      if (!c) {
        result = Lunar.interactuar(s);
      } else {
        const accionPrevia = c.accion;
        const poiPrevio = c.poi;
        if (accionPrevia === 'perforar') LunarAudio.perforar();
        else if (accionPrevia === 'entregar') LunarAudio.exito();
        else if (accionPrevia === 'escanear' || accionPrevia === 'escanear_poi') LunarAudio.escanear();
        else LunarAudio.click();

        result = Lunar.interactuar(s);

        if (result && result.ok) {
          if (accionPrevia === 'escanear') {
            mostrarNotif('escaneo', '📡 ESCÁNER VIPER / LOLA', '¡ANOMALÍA ESPECTRAL DETECTADA!',
              'El sensor identificó una veta de regolito rico en minerales y volátiles a 0.2 m de profundidad.',
              '✓ <b>Nueva acción disponible:</b> Presiona <b>[E · Recoger]</b> para guardarla en bodega (+1.0 kg, costo 3 Wh).'
            );
          } else if (accionPrevia === 'perforar') {
            mostrarNotif('extraccion', '💎 TALADRO DE NÚCLEO', '¡NÚCLEO CIENTÍFICO EXTRAÍDO!',
              'Has perforado con éxito el cráter y obtenido la muestra principal (+1.0 kg en bodega).',
              '⚠️ <b>MISIÓN CRÍTICA:</b> Regresa al <b>MÓDULO LUNAR ▣</b> siguiendo la línea azul de retorno para salvar la misión.'
            );
          } else if (accionPrevia === 'recoger') {
            mostrarNotif('extraccion', '🧪 MUESTRA SECUNDARIA', '¡REGOLITO SUPERFICIAL RECOGIDO!',
              'Muestra asegurada en tu contenedor (+1.0 kg).',
              '⚖ <b>Aviso de ingeniería:</b> La masa transportada incrementa el consumo de cada paso hacia el módulo.'
            );
          } else if (accionPrevia === 'escanear_poi') {
            mostrarNotif('escaneo', '🔬 GEOLOGÍA LUNAR NASA', '¡HALLAZGO CIENTÍFICO IDENTIFICADO!',
              poiPrevio.nombre + ': ' + poiPrevio.hallazgo,
              '✓ Telemetría registrada en el informe forense (+ ' + poiPrevio.ciencia + ' pts de ciencia).'
            );
          }
        } else if (result && !result.ok) {
          LunarAudio.alerta();
          mostrarNotif('obstaculo', '⚠️ ACCIÓN NO POSIBLE', result.msg, null);
        }

        if (s.perforando) {
          setTimeout(() => { s.perforando = false; render(); }, 350);
        }
      }
    }
    if (a === 'next_mission') {
      s = Lunar.nuevo(s);
      Lunar.cambiar(s, 'sitio', x);
      modal = null;
      keys = {};
      message = 'Nueva zona lunar cargada. Evalúa la pendiente y diseña tu carga útil.';
    }
    if (a === 'repeat' || a === 'new') {
      const guide = s.tutorial.activo;
      s = Lunar.nuevo(a === 'repeat' ? s : null);
      s.tutorial.activo = guide;
      modal = null;
      keys = {};
      category = 0;
      selected = 0;
      message = 'Recursos listos. Ajusta tu plan de ingeniería y vuelve a probar.';
    }

    if (result) message = result.msg;
    render();
  }

  const directions = {
    ArrowUp: [0,-1], w: [0,-1],
    ArrowDown: [0,1], s: [0,1],
    ArrowLeft: [-1,0], a: [-1,0],
    ArrowRight: [1,0], d: [1,0]
  };

  function move(d) {
    const oldEtapa = s.etapa;
    const px = s.pos ? s.pos[0] * 20 + 10 : 0;
    const py = s.pos ? s.pos[1] * 20 + 10 : 0;
    const m = Lunar.map(s);
    const targetQ = s.pos ? [s.pos[0] + d[0], s.pos[1] + d[1]] : null;

    if (targetQ && Lunar.esObstaculo && Lunar.esObstaculo(m, targetQ)) {
      LunarAudio.alerta();
      mostrarNotif('obstaculo', '⛔ ROCA LUNAR INTRANSITABLE', 'Formación de roca basáltica de 3 metros',
        'No es posible atravesar este bloque de roca. Debes bordear el obstáculo para continuar.', null);
      render();
      return;
    }

    if (Lunar.mover(s, ...d)) {
      LunarAudio.paso();
      // Generar partículas de regolito al caminar
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + 4 + Math.random() * 4,
          vx: -d[0] * (Math.random() * 1.5 + 0.5),
          vy: -d[1] * (Math.random() * 1.5 + 0.5) - 0.5,
          vida: 1.0,
          size: Math.random() > 0.5 ? 2 : 1
        });
      }
      if (s.retorno && s.recursos.energiaWh < s.retorno.wh) {
        LunarAudio.alerta();
      }
      render();
    } else if (oldEtapa !== s.etapa) {
      render();
    }
  }

  function keydown(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && k !== 'Escape') return;

    if (k === 'Escape') {
      e.preventDefault();
      keys = {};
      modal = modal ? null : !intro ? 'pause' : null;
      render();
      return;
    }

    if (modal) {
      if (k === 'i' && modal === 'inventory') { act('close'); e.preventDefault(); return; }
      if (directions[k]) {
        e.preventDefault();
        if (modal === 'inventory' && !e.repeat) {
          if (['ArrowLeft','a','ArrowRight','d'].includes(k)) {
            category = (category + (['ArrowLeft','a'].includes(k) ? 3 : 1)) % 4;
            selected = 0;
          } else {
            selected = Math.max(0, selected + (['ArrowUp','w'].includes(k) ? -1 : 1));
          }
          render();
        }
        return;
      }
      return;
    }

    if (k === 'm') {
      e.preventDefault();
      act('sound');
      return;
    }

    if (s.etapa !== 'superficie' || intro) return;
    if (k === 'i') { e.preventDefault(); if (!e.repeat) act('inventory'); return; }
    if (k === 'e') { e.preventDefault(); if (!e.repeat) act('interact'); return; }
    if (directions[k]) {
      e.preventDefault();
      if (!keys[k] && !e.repeat) {
        keys = {};
        keys[k] = true;
        elapsed = 0;
        move(directions[k]);
      }
    }
  }

  function frame(time) {
    const dt = last ? Math.min(0.25, (time - last) / 1000) : 0;
    last = time;
    if (!modal && s.etapa === 'superficie' && !intro) {
      const k = Object.keys(keys).find(k => keys[k]);
      if (k) {
        elapsed += dt;
        while (elapsed >= R.pasoSegundos) {
          elapsed -= R.pasoSegundos;
          move(directions[k]);
          if (s.etapa !== 'superficie') break;
        }
      } else {
        elapsed = 0;
      }
      // Re-dibujar para animaciones continuas de partículas y balizas
      drawSurface();
    } else if (s.etapa === 'viaje' && !intro) {
      drawShip();
    }
    requestAnimationFrame(frame);
  }

  function iniciar() {
    root = document.getElementById('juego');
    root.classList.add('lunar');
    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-l]');
      if (b && !b.disabled) act(b.dataset.l, b.dataset.x);
    });
    root.addEventListener('change', e => {
      if (e.target.dataset.l === 'site') act('sitio', e.target.value);
      if (e.target.dataset.l === 'rocket') act('cohete', e.target.value);
    });
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', e => {
      delete keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    });
    window.addEventListener('blur', () => { keys = {}; elapsed = 0; });
    document.addEventListener('visibilitychange', () => { keys = {}; elapsed = 0; });

    const resize = () => root.style.transform = `scale(${Math.min((window.innerWidth || 1280) / 1280, (window.innerHeight || 720) / 720)})`;
    window.addEventListener('resize', resize);
    resize();
    render();
    requestAnimationFrame(frame);
  }

  return {
    iniciar,
    snapshot: () => JSON.parse(JSON.stringify(s))
  };
})();

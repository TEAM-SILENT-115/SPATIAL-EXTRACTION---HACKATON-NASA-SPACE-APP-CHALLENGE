/* Interfaz guiada: una decisión por pantalla y pocas opciones a la vez.
   Solo dibuja y recoge eventos; todas las reglas y cifras salen de Lunar. */
var LunarUI = (function () {
  'use strict';

  const R = REGLAS_LUNARES, TX = TEXTOS_LUNARES, ARTE = UI.arte;
  const ORDEN = ['Site01', 'Site04', 'Site11'];
  const RANGOS = ['F', 'B', 'A', 'A+', 'S', 'S+'];
  const COLOR = { directa: '#e6bd6a', ahorro: '#6dd6cf' };
  const NOMBRE_RUTA = { directa: 'Direct', ahorro: 'Economy' };
  const DIR = {
    ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0]
  };
  const CINE = { despegue: 3.2, descenso: 2.7, fin: 1.7 };

  const n = v => Number(v).toFixed(1);
  const n0 = v => Math.round(Number(v));
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let s = Lunar.nuevo();
  let root;
  let pantalla = 'titulo'; // titulo | niveles | briefing | plan | despegue | viaje | descenso | superficie | informe
  let paso = 0, elegidos = {}, modal = null, informe = null, fin = null, rutas = null;
  let keys = {}, elapsed = 0, last = 0, reloj = 0, t0 = 0;
  let particulas = [], flotantes = [], vis = null, ultimaAlerta = -9, sacudida = 0, contactoHecho = false, claveVista = '', alPrimario = false, hallazgo = null;

  /* ---------------- progreso guardado ---------------- */

  function leerRangos() {
    try { return JSON.parse(window.localStorage.getItem('mision_umbral_rangos')) || {}; } catch (e) { return {}; }
  }
  function guardarRango(sitio, rango) {
    const r = leerRangos();
    if (r[sitio] && RANGOS.indexOf(rango) <= RANGOS.indexOf(r[sitio])) return;
    r[sitio] = rango;
    try { window.localStorage.setItem('mision_umbral_rangos', JSON.stringify(r)); } catch (e) {}
  }
  function borrarProgreso() {
    try {
      window.localStorage.removeItem('mision_umbral_rangos');
      window.localStorage.removeItem('mision_umbral_desbloqueados');
    } catch (e) {}
    s = Lunar.nuevo();
  }

  const meta = (id) => SITIOS_LUNARES[id || s.sitio] || SITIOS_LUNARES.Site01;
  const sis = () => Lunar.sistemas(s);
  const abierto = id => Lunar.esDesbloqueado(s, id);

  /* ---------------- piezas de HTML ---------------- */

  function btn(a, texto, o) {
    o = o || {};
    return `<button class="btn ${o.cls || ''}${o.primario ? ' primario' : ''}" data-l="${a}" data-x="${o.x === undefined ? '' : o.x}"` +
      `${o.off ? ' disabled' : ''}${o.primario ? ' data-primario' : ''}${o.nonav ? '' : ' data-nav'}>${texto}</button>`;
  }

  function btnSonido() {
    const on = LunarAudio.estaActivo();
    return `<button class="btn mini" data-l="sonido" data-x="" title="Sound (M)">${on ? '♪ AUDIO' : '♪ MUTE'}</button>`;
  }

  function cabecera() {
    const m = meta(), etapas = ['PLAN', 'TRAVEL', 'EXPLORE', 'REPORT'];
    const idx = { briefing: 0, plan: 0, viaje: 1, superficie: 2, informe: 3 }[pantalla];
    return `<header class="u-cab">
      <div class="u-marca"><b>MISSION UMBRAL</b><span>LEVEL ${m.nivel} · ${m.nivelNombre}</span></div>
      <ol class="u-etapas">${etapas.map((e, i) =>
        `<li class="${i === idx ? 'actual' : i < idx ? 'hecha' : ''}"><i>${i < idx ? '✓' : i + 1}</i>${e}</li>`).join('')}</ol>
      <div class="u-cab-btns">${btn('ayuda', '? HELP', { cls: 'mini', nonav: true })}${btnSonido()}</div>
    </header>`;
  }

  function pieAida(texto) {
    return `<footer class="u-aida" role="status"><canvas id="u-aida" width="10" height="9"></canvas><b>AIDA</b><p>${esc(texto)}</p></footer>`;
  }

  function listaMision() {
    return `<ol class="u-mision">${TX.mision.map((p, i) => `<li><i>${i + 1}</i><b>${p[0]}</b><span>${esc(p[1])}</span></li>`).join('')}</ol>`;
  }

  /* ---------------- pantallas ---------------- */

  function tituloHTML() {
    return `<div class="u-titulo">
      <canvas id="u-esc-titulo" class="u-fondo"></canvas>
      <div class="u-titulo-caja">
        <p class="u-kicker">NASA SPACE APPS CHALLENGE</p>
        <h1>MISSION <em>UMBRAL</em></h1>
        <p class="u-lema">${esc(TX.lema)}</p>
        <div class="u-menu">
          ${btn('jugar', 'PLAY', { cls: 'grande', primario: true })}
          ${btn('ayuda', 'HOW TO PLAY', { cls: 'grande' })}
        </div>
      </div>
      <p class="u-pie">Real Lunar South Pole slopes (NASA LRO-LOLA) · Offline capable</p>
      <div class="u-esquina">${btnSonido()}${btn('creditos', 'CREDITS', { cls: 'mini', nonav: true })}</div>
    </div>`;
  }

  function nivelesHTML() {
    const rangos = leerRangos();
    return `<div class="u-niveles">
      <p class="u-kicker">THREE MISSIONS · THREE TIERS</p>
      <h1>CHOOSE YOUR MISSION</h1>
      <p class="u-sub">Each level introduces new systems. Complete one to unlock the next.</p>
      <div class="u-cartas">${ORDEN.map(id => {
        const m = meta(id), ok = abierto(id), previo = ORDEN[ORDEN.indexOf(id) - 1];
        return `<article class="u-carta ${ok ? '' : 'bloq'}">
          <header><small>LEVEL ${m.nivel}</small><b>${m.nivelNombre}</b><span>${m.estrellas}</span></header>
          <canvas class="u-mini" data-sitio="${id}" width="160" height="120"></canvas>
          <p class="u-sitio">${esc(m.nombre)} · ${esc(m.terreno)}</p>
          <p class="u-carta-lema">${esc(m.lema)}</p>
          <p class="u-decides"><small>YOU DECIDE</small>${esc(m.decides)}</p>
          ${ok
            ? `<p class="u-mejor">Best rank: <b>${rangos[id] || '—'}</b></p>` +
              btn('nivel', rangos[id] ? 'PLAY AGAIN' : 'PLAY', { x: id, cls: 'grande', primario: !rangos[id] })
            : `<p class="u-candado"><b>LOCKED</b>Complete level ${meta(previo).nivel} to unlock.</p>`}
        </article>`;
      }).join('')}</div>
      <div class="u-fila">${btn('volver_titulo', '◀ BACK')}</div>
    </div>` + pieAida(TX.aida.niveles);
  }

  function briefingHTML() {
    const m = meta();
    return cabecera() + `<main class="u-brief">
      <section class="u-brief-izq">
        <canvas id="u-esc-brief"></canvas>
        <p class="u-regla"><b>⚡</b>${esc(TX.regla)}</p>
      </section>
      <section class="u-brief-der">
        <p class="u-kicker">LEVEL ${m.nivel} · ${m.nivelNombre} · ${esc(m.nombre).toUpperCase()}</p>
        <h1>YOUR MISSION</h1>
        ${listaMision()}
        ${m.novedades.length ? `<div class="u-nuevo"><h3>NEW IN THIS LEVEL</h3><ul>${m.novedades.map(x =>
          `<li><b>${x[0]}</b>${esc(x[1])}</li>`).join('')}</ul></div>` : ''}
        <p class="u-decides2">In this level you decide: <b>${esc(m.decides.toLowerCase())}</b>.</p>
        <div class="u-fila izq">${btn('empezar_plan', 'PLAN MISSION ▶', { cls: 'grande', primario: true })}</div>
      </section>
    </main>` + pieAida(TX.aida.briefing);
  }

  /* --- plan: un paso, una decisión --- */

  const pasos = () => meta().pasos;
  const pasoId = () => pasos()[paso];

  function pasoElegido(id) {
    const t = Motor.totales(s);
    if (id === 'ruta' || id === 'cohete') return !!elegidos[id];
    if (id === 'bateria') return t.energia > 0;
    if (id === 'oxigeno') return s.equipo.some(x => Motor.obj(x).tipo === 'oxigeno');
    return true;
  }

  function chips(o) {
    return sis().carga ? [o.masa + ' kg', o.costo + ' cr'] : [];
  }

  function opciones(id) {
    const tiene = x => s.equipo.includes(x);
    if (id === 'ruta') {
      return ['directa', 'ahorro'].map(r => {
        const p = rutas[r];
        return {
          id: r, elegida: !!elegidos.ruta && s.ruta === r, color: r,
          titulo: r === 'directa' ? 'DIRECT ROUTE' : 'ECONOMY ROUTE',
          texto: r === 'directa' ? 'Shorter, but crosses steeper terrain.' : 'Takes a detour through gentler terrain.',
          datos: [n0(p.distancia) + ' m round trip', 'demands ' + n(p.total) + ' Wh']
        };
      });
    }
    if (id === 'bateria') {
      return ['bat100', 'bat160'].map(x => {
        const o = Motor.obj(x);
        return {
          id: x, elegida: tiene(x), titulo: 'BATTERY ' + o.energia + ' Wh',
          texto: x === 'bat100' ? 'Lightweight. Less power, but each step costs slightly less.'
            : 'Much more power, but weighs nearly double: each step costs slightly more.',
          datos: chips(o)
        };
      });
    }
    if (id === 'oxigeno') {
      return ['o2chico', 'o2grande'].map(x => {
        const o = Motor.obj(x);
        return {
          id: x, elegida: tiene(x), titulo: 'OXYGEN TANK ' + o.oxigeno + ' U',
          texto: x === 'o2chico' ? 'Lightweight. Check below if it covers journey demand.' : 'More air to walk further, in exchange for more mass and credits.',
          datos: chips(o)
        };
      });
    }
    if (id === 'cohete') {
      return DATOS.cohetes.map(c => ({
        id: c.id, elegida: !!elegidos.cohete && s.cohete === c.id, titulo: c.nombre.toUpperCase(),
        texto: c.combustibleBase >= DATOS.costos.maniobra
          ? 'Carries ' + c.combustibleBase + ' fuel: ready for descent correction.'
          : 'Carries ' + c.combustibleBase + ' fuel: correcting (requires ' + DATOS.costos.maniobra + ') needs extra fuel.',
        datos: ['payload up to ' + c.capacidadMasa + ' kg', c.costo + ' cr']
      }));
    }
    if (id === 'extras') {
      return [
        ['fuelextra', 'EXTRA FUEL', '+30 maneuvering fuel to correct descent and land closer.'],
        ['escaner', 'TERRAIN SCANNER', 'Reveals a second sample and records map scientific findings.'],
        ['cont2', 'DUAL CONTAINER', 'Stores 2 samples. Without it, capacity is limited to one.']
      ].map(x => ({ id: x[0], elegida: tiene(x[0]), titulo: x[1], texto: x[2], datos: chips(Motor.obj(x[0])), casilla: true }));
    }
    return [];
  }

  function valorPaso(id) {
    const eq = tipo => { const x = s.equipo.find(e => Motor.obj(e).tipo === tipo); return x ? Motor.obj(x).nombre : null; };
    if (id === 'ruta') return elegidos.ruta ? NOMBRE_RUTA[s.ruta] : null;
    if (id === 'bateria') return eq('bateria');
    if (id === 'oxigeno') return eq('oxigeno');
    if (id === 'cohete') return elegidos.cohete ? Motor.cohetePorId(s.cohete).nombre : null;
    if (id === 'extras') {
      const x = ['fuelextra', 'escaner', 'cont2'].filter(e => s.equipo.includes(e)).map(e => Motor.obj(e).nombre);
      return x.length ? x.join(' + ') : 'None';
    }
    return null;
  }

  function revisionHTML(v) {
    const lista = pasos().slice(0, -1).map((id, i) =>
      `<li><button class="u-linea" data-l="ir_paso" data-x="${i}" data-nav><small>${TX.pasos[id].corto}</small><b>${esc(valorPaso(id) || '— unselected —')}</b><i>CHANGE</i></button></li>`).join('');
    let caja;
    if (v.bloqueos.length) {
      caja = `<div class="u-veredicto bloqueo"><b>⛔ CANNOT LAUNCH LIKE THIS</b>${v.bloqueos.map(x => `<p>${esc(x)}</p>`).join('')}</div>`;
    } else if (v.riesgos.length) {
      caja = `<div class="u-veredicto riesgo"><b>⚠ LAUNCH PERMITTED, BUT RISKS EXIST</b>${v.riesgos.map(x => `<p>${esc(x)}</p>`).join('')}</div>`;
    } else {
      caja = `<div class="u-veredicto ok"><b>✓ SOLID PLAN</b><p>Sufficient power to travel, drill, and return with ample reserve.</p></div>`;
    }
    let nota = '';
    if (sis().combustible && !v.bloqueos.length && v.energia !== 'corrigiendo') {
      const margen = v.cerca ? v.t.energia - v.cerca.total : 0;
      nota = v.cerca
        ? `<p class="u-nota">If you correct descent in flight, journey drops to ${n(v.cerca.total)} Wh and you would have ${margen >= 0 ? n(margen) + ' Wh remaining' : 'a deficit of ' + n(-margen) + ' Wh'}.</p>`
        : `<p class="u-nota">With ${v.t.combustible} fuel you cannot correct descent (requires ${DATOS.costos.maniobra}).</p>`;
    }
    return `<ul class="u-resumen">${lista}</ul>${caja}${nota}`;
  }

  function planHTML() {
    const ids = pasos(), id = pasoId(), txt = TX.pasos[id], v = Lunar.evaluar(s), ultimo = paso === ids.length - 1;
    const pips = ids.map((x, i) => `<i class="${i === paso ? 'actual' : i < paso ? 'hecha' : ''}"></i>`).join('');
    const cuerpo = ultimo ? revisionHTML(v) : `<div class="u-opciones">${opciones(id).map((o, i) =>
      `<button class="u-opcion ${o.elegida ? 'elegida' : ''} ${o.color || ''}" data-l="opcion" data-x="${o.id}" data-nav aria-pressed="${o.elegida}">
        <span class="u-marca-op">${o.casilla ? (o.elegida ? '☑' : '☐') : (o.elegida ? '▶' : i + 1)}</span>
        <span class="u-op-cuerpo"><b>${o.color ? '<i class="u-traza"></i>' : ''}${o.titulo}</b><span>${esc(o.texto)}</span></span>
        <span class="u-chips">${o.datos.map(d => `<i>${esc(d)}</i>`).join('')}</span>
      </button>`).join('')}</div>`;
    const faltan = ids.slice(0, -1).filter(x => !pasoElegido(x));
    const nav = ultimo
      ? btn('paso_ant', '◀ BACK') + (sis().formulas ? btn('calculo', 'VIEW CALCULATION') : '') +
        btn('lanzar', v.riesgos.length ? 'LAUNCH WITH RISK ▲' : 'LAUNCH ▲', { cls: 'grande', primario: true, off: !!v.bloqueos.length || !!faltan.length })
      : (paso > 0 ? btn('paso_ant', '◀ BACK') : btn('niveles', '◀ LEVELS')) +
        btn('paso_sig', 'NEXT ▶', { cls: 'grande', primario: true, off: !pasoElegido(id) });
    return cabecera() + `<main class="u-plan">
      <section class="u-plan-mapa">
        <canvas id="u-mapa" width="560" height="420" aria-label="Slope map of site"></canvas>
        <div class="u-leyenda">
          <span><i class="l-suave"></i>Gentle</span><span><i class="l-emp"></i>Steep: costs more</span><span><i class="l-no"></i>Impassable</span><span><i class="l-roca"></i>Boulder: detour</span>
        </div>
      </section>
      <section class="u-plan-paso">
        <div class="u-pips"><b>STEP ${paso + 1} OF ${ids.length}</b>${pips}</div>
        <h2>${esc(txt.titulo)}</h2>
        <p class="u-ayuda">${esc(txt.ayuda)}</p>
        ${cuerpo}
        <div class="u-nav">${nav}</div>
      </section>
    </main>${medidorHTML(v)}` + pieAida(aidaPlan(v, id));
  }

  function aidaPlan(v, id) {
    const t = v.t, p = v.p;
    if (id === 'revision') {
      if (v.bloqueos.length) return 'Cannot launch with this plan. Resolve the warnings above.';
      if (v.energia === 'corrigiendo' && v.riesgos.length === 1) return 'Your plan relies on in-flight descent correction. You have the fuel: remember to trigger it.';
      if (v.riesgos.length) return 'You can launch like this, but I would not bet my salary on it. Your call.';
      return 'Solid plan. Ready for liftoff whenever you are.';
    }
    if (id === 'bateria' && t.energia) {
      return p.margen < 0 ? 'With that battery you will fall short by ' + n(-p.margen) + ' Wh to return. Check the gauge.'
        : p.margen < p.reserva ? 'Sufficient, but tight: only ' + n(p.margen) + ' Wh remaining.'
        : 'With that battery you will have ' + n(p.margen) + ' Wh remaining upon return.';
    }
    if (id === 'ruta' && elegidos.ruta) return 'That route demands ' + n(p.total) + ' Wh across travel, drilling, and return.';
    if (id === 'oxigeno' && t.oxigeno) {
      return t.oxigeno < p.ox ? 'That tank does not cover journey demand.' : 'The journey demands ' + n0(p.ox) + ' oxygen and you carry ' + t.oxigeno + '. Excess oxygen also adds mass.';
    }
    return TX.aida[id];
  }

  function medidorHTML(v) {
    const p = v.p, t = v.t, si = sis();
    const max = (t.energia ? Math.max(t.energia, p.total + p.reserva) : p.total * 1.5) * 1.04;
    const pc = x => (lim(x / max, 0, 1) * 100).toFixed(2) + '%';
    let veredicto;
    if (!t.energia) veredicto = '<b class="u-neutro">NO BATTERY EQUIPPED</b>';
    else if (p.margen < 0) veredicto = `<b class="alerta">✖ SHORT BY ${n(-p.margen)} Wh</b>`;
    else if (p.margen < p.reserva) veredicto = `<b class="ambar">⚠ TIGHT: ${n(p.margen)} Wh SURPLUS</b>`;
    else veredicto = `<b class="ok">✓ ${n(p.margen)} Wh SURPLUS</b>`;
    const seg = (cls, desde, ancho, etq) => `<div class="u-seg ${cls}" style="left:${pc(desde)};width:${pc(ancho)}"><span>${etq}</span></div>`;
    const resto = t.energia ? (p.margen >= 0
      ? `<div class="u-sobra" style="left:${pc(p.total)};width:${pc(p.margen)}"><span>${p.margen / max > 0.06 ? 'SURPLUS' : ''}</span></div>`
      : `<div class="u-falta" style="left:${pc(t.energia)};width:${pc(-p.margen)}"><span>${-p.margen / max > 0.06 ? 'DEFICIT' : ''}</span></div>`) : '';
    const mini = (titulo, frac, texto, estado) =>
      `<div class="u-mini-m ${estado}"><small>${titulo}</small><div class="u-mini-pista"><i style="width:${(lim(frac, 0, 1) * 100).toFixed(1)}%"></i></div><b>${texto}</b></div>`;
    let minis = '';
    if (si.oxigeno) {
      minis += mini('OXYGEN', t.oxigeno ? p.ox / t.oxigeno : 0,
        t.oxigeno ? `demands ${n0(p.ox)} of ${t.oxigeno} ${t.oxigeno >= p.ox ? '✓' : '✖'}` : 'no tank', !t.oxigeno ? '' : t.oxigeno >= p.ox ? 'ok' : 'rojo');
    }
    if (si.carga) {
      const mOk = s.masa.usada <= s.masa.capacidad, cOk = s.presupuesto.gastado <= s.presupuesto.total;
      minis += mini('MASS', s.masa.usada / s.masa.capacidad, `${s.masa.usada} of ${s.masa.capacidad} kg ${mOk ? '✓' : '✖'}`, mOk ? 'ok' : 'rojo');
      minis += mini('CREDITS', s.presupuesto.gastado / s.presupuesto.total, `${s.presupuesto.gastado} of ${s.presupuesto.total} ${cOk ? '✓' : '✖'}`, cOk ? 'ok' : 'rojo');
    }
    if (si.combustible) {
      const ok = t.combustible >= DATOS.costos.maniobra;
      minis += mini('FUEL', t.combustible / 70, `${t.combustible} · correct needs ${DATOS.costos.maniobra} ${ok ? '✓' : '—'}`, ok ? 'ok' : '');
    }
    return `<section class="u-medidor">
      <div class="u-med-top"><b>ENERGY</b><span>Journey demands <b>${n(p.total)} Wh</b>${t.energia ? ` · carrying <b>${t.energia} Wh</b>` : ''}</span>${veredicto}</div>
      <div class="u-pista">
        ${seg('ida', 0, p.a.wh, 'OUTBOUND ' + n0(p.a.wh))}${seg('perf', p.a.wh, p.tarea, 'DRILL ' + n0(p.tarea))}${seg('vuelta', p.a.wh + p.tarea, p.b.wh, 'RETURN ' + n0(p.b.wh))}
        ${resto}
        ${t.energia ? `<div class="u-cap" style="left:${pc(t.energia)}"><span>BATTERY ${t.energia}</span></div>` : ''}
      </div>
      ${minis ? `<div class="u-minis">${minis}</div>` : ''}
    </section>`;
  }

  /* --- viaje --- */

  function viajeHTML() {
    const m = Lunar.map(s);
    let panel, aida = TX.aida.viaje;
    if (!sis().combustible || s.viaje.decidido) {
      panel = `<p class="u-viaje-txt">${s.viaje.corrigio ? '✓ Descent corrected: landing closer to the crater.'
        : sis().combustible ? '✓ Nominal descent trajectory maintained.' : 'Autonomous flight to descent point. What you planned is what you have down there.'}</p>
        <div class="u-fila">${btn('descender', 'DESCEND ▼', { cls: 'grande', primario: true })}</div>`;
    } else {
      const a = Lunar.proyectar(s), b = Lunar.proyectar(s, s.ruta, m.nearModule), e = s.recursos.energiaWh, puede = s.recursos.combustible >= DATOS.costos.maniobra;
      const tarjeta = (accion, titulo, texto, p, off, pie) => {
        const sobra = e - p.total;
        return `<button class="u-opcion" data-l="${accion}" data-x="" data-nav ${off ? 'disabled' : ''}>
          <span class="u-marca-op">${accion === 'mantener' ? 1 : 2}</span>
          <span class="u-op-cuerpo"><b>${titulo}</b><span>${texto}</span><span class="${sobra >= 0 ? 'ok' : 'alerta'}">Walk ${n0(p.distancia)} m · journey demands ${n(p.total)} Wh · ${sobra >= 0 ? n(sobra) + ' Wh surplus ✓' : n(-sobra) + ' Wh deficit ✖'}</span>${pie ? `<span class="alerta">${pie}</span>` : ''}</span>
        </button>`;
      };
      panel = `<p class="u-viaje-txt">In-flight radar located a landing site closer to the crater. You have <b>${s.recursos.combustible}</b> fuel.</p>
        <div class="u-opciones dos">
          ${tarjeta('mantener', 'HOLD NOMINAL DESCENT', 'Conserves fuel.', a, false)}
          ${tarjeta('corregir', 'CORRECT DESCENT', 'Burns ' + DATOS.costos.maniobra + ' fuel and lands closer.', b, !puede,
            puede ? '' : 'Unavailable: insufficient fuel. Must be budgeted in the hangar.')}
        </div>`;
      aida = TX.aida.viajeDecision;
    }
    return cabecera() + `<main class="u-viaje">
      <canvas id="u-esc-viaje"></canvas>
      <section class="u-viaje-panel"><h1>EN ROUTE TO ${esc(meta().nombre).toUpperCase()}</h1>${panel}</section>
    </main>` + pieAida(aida);
  }

  function cineHTML(texto) {
    return `<div class="u-cine"><canvas id="u-esc-cine" class="u-fondo"></canvas>
      <p class="u-cine-texto" id="u-cine-texto">${texto}</p>
      <button class="btn mini u-saltar" data-l="saltar" data-x="">SKIP ▶</button></div>`;
  }

  /* --- superficie --- */

  function estadoRetorno() {
    const sobra = s.recursos.energiaWh - s.retorno.wh;
    const oxMal = sis().oxigeno && s.recursos.oxigeno < s.retorno.ox;
    return { sobra, estado: sobra < 0 || oxMal ? 'rojo' : sobra < s.plan.reserva ? 'ambar' : 'ok' };
  }

  function hudHTML() {
    const r = s.retorno, e = s.recursos.energiaWh, ini = Math.max(1, s.plan.energia), er = estadoRetorno();
    const cap = Motor.totales(s).capacidadMuestras, en = Lunar.contexto(s);
    const objetivo = s.tomada ? '② Return to module and deliver'
      : en && en.accion === 'perforar' ? '① At the crater: drill core' : '① Reach crater and drill core';
    const llevas = s.muestras.recogidas.length;
    return `<div class="u-obj"><small>OBJECTIVE</small><b>${objetivo}</b></div>
      <div class="u-gauge ${er.estado}">
        <div class="u-g-top"><span>ENERGY <b>${n(e)}</b> Wh</span>
          <span>return costs <b>${n(r.wh)}</b> · ${er.sobra >= 0 ? 'surplus: <b>' + n(er.sobra) + '</b> ' + (er.estado === 'ambar' ? '⚠' : '✓') : 'deficit: <b>' + n(-er.sobra) + '</b> ✖'}</span></div>
        <div class="u-g-pista"><i class="u-g-fill" style="width:${(lim(e / ini, 0, 1) * 100).toFixed(1)}%"></i><i class="u-g-volver" style="width:${(lim(r.wh / ini, 0, 1) * 100).toFixed(1)}%"></i>${r.wh / ini > 0.02 ? `<em style="left:${(lim(r.wh / ini, 0, 1) * 100).toFixed(1)}%">◀ FOR RETURN</em>` : ''}</div>
      </div>
      ${sis().oxigeno ? `<div class="u-dato ${s.recursos.oxigeno < r.ox ? 'rojo' : ''}"><small>OXYGEN</small><b>${n0(s.recursos.oxigeno)}</b><span>return demands ${n0(r.ox)}</span></div>` : ''}
      <div class="u-dato ${llevas ? 'lleva' : ''}"><small>SAMPLES</small><b>${llevas} of ${cap}</b><span>${llevas ? 'pending delivery' : 'empty container'}</span></div>`;
  }

  function aidaSuperficie() {
    const er = estadoRetorno(), c = Lunar.contexto(s);
    if (er.estado === 'rojo') return TX.aida.sinRetorno;
    if (er.estado === 'ambar') return TX.aida.justo;
    if (s.pasos.length <= 1) return TX.aida.caminar;
    if (s.tomada) return TX.aida.volver;
    if (c && c.accion === 'perforar') return TX.aida.enCrater;
    return TX.aida.alCrater;
  }

  function accHTML() {
    const c = Lunar.contexto(s), pv = Lunar.preverAccion(s);
    const etq = { perforar: 'DRILL', escanear: 'SCAN', recoger: 'COLLECT', escanear_poi: 'SCAN FINDING' };
    let centro = '', texto = aidaSuperficie(), clase = '';
    if (c && c.accion === 'entregar') {
      if (s.muestras.recogidas.length) {
        centro = btn('accion', 'E · DELIVER', { cls: 'grande', primario: true });
        texto = 'You are at the module. Deliver the sample to secure it.';
      } else if (s.pasos.length > 1) {
        centro = btn('accion', 'E · CONCLUDE WITHOUT SAMPLE');
        texto = 'You are at the module without samples. Keep exploring or conclude here.';
      }
    } else if (c && c.falta) {
      centro = btn('accion', 'E · ' + etq[c.accion], { off: true });
      texto = c.falta + '. Must be equipped in the hangar.';
      clase = 'alerta';
    } else if (c) {
      centro = btn('accion', 'E · ' + etq[c.accion] + ' (' + c.wh + ' Wh)', pv.margen >= 0 ? { cls: 'grande', primario: true } : { cls: 'grande peligro' });
      texto = pv.margen >= 0
        ? 'Costs ' + c.wh + ' Wh. Afterwards you will have ' + n(pv.margen) + ' Wh left to return ✓'
        : 'Costs ' + c.wh + ' Wh. Afterwards you will be SHORT BY ' + n(-pv.margen) + ' Wh to return ✖';
      clase = pv.margen >= 0 ? 'ok' : 'alerta';
      if (c.aviso) { texto = c.aviso; clase = 'ambar'; }
      if (c.poi && pv.margen >= 0) texto = 'Scientific signal. Scanning costs ' + c.wh + ' Wh; you will still have ' + n(pv.margen) + ' Wh left to return ✓';
    }
    const cruz = [['w', '▲'], ['a', '◀'], ['s', '▼'], ['d', '▶']].map(k =>
      `<button class="btn u-cruz-${k[0]}" data-l="mv" data-x="${k[0]}" aria-label="Move">${k[1]}</button>`).join('');
    return `<div class="u-acc-aida ${clase}"><canvas id="u-aida" width="10" height="9"></canvas><p>${esc(texto)}</p></div>
      <div class="u-acc-centro">${centro}</div>
      <div class="u-cruz">${cruz}</div>
      ${btn('pausa', 'ESC · PAUSE', { cls: 'mini' })}`;
  }

  function superficieHTML() {
    return cabecera() + `<main class="u-sup">
      <div class="u-hud" id="u-hud">${hudHTML()}</div>
      <div class="u-campo">
        <canvas id="u-campo" tabindex="0" aria-label="Lunar surface. Arrow keys or WASD to move, E to act"></canvas>
        <div class="u-minimapa"><canvas id="u-mini-sup" width="160" height="120"></canvas><span>MAP</span></div>
        <div class="u-hallazgo" id="u-hallazgo" hidden></div>
        <div class="u-fin" id="u-fin" hidden></div>
      </div>
      <div class="u-acc" id="u-acc">${accHTML()}</div>
    </main>`;
  }

  function mostrarHallazgo(poi) {
    hallazgo = { poi, t0: reloj };
    const caja = document.getElementById('u-hallazgo');
    if (!caja) return;
    caja.hidden = false;
    caja.innerHTML = `<small>FINDING LOGGED · +${poi.ciencia} SCIENCE</small><b>${esc(poi.nombre)}</b><p>${esc(poi.hallazgo)}</p>`;
  }

  function refrescarSuperficie() {
    const hud = document.getElementById('u-hud'), acc = document.getElementById('u-acc');
    if (!hud || !acc) return render();
    hud.innerHTML = hudHTML();
    acc.innerHTML = accHTML();
  }

  /* --- informe --- */

  function informeHTML() {
    const r = informe, f = r.final, m = meta(), ini = Math.max(1, s.plan.energia);
    const previsto = s.aterrizaje ? s.aterrizaje.total : s.plan.total;
    const consejo = r.resultado === 'exito' && !m.desbloquea
      ? (f.rango === 'S+' ? 'Maximum rank on the most challenging tier. Mission Umbral completed.' : 'You cleared the final level. Rank S+ requires retrieving both samples and retaining your reserve.')
      : r.resumen.consejo;
    const sig = m.desbloquea && abierto(m.desbloquea) ? meta(m.desbloquea) : null;
    const exito = r.resultado === 'exito';
    const botones = (exito && sig ? btn('siguiente_nivel', 'NEXT LEVEL: ' + sig.nivelNombre + ' ▶', { x: sig.id, cls: 'grande', primario: true }) : '') +
      btn('repetir', exito && sig ? 'REPEAT' : 'REPEAT CHANGING PLAN ▶', { cls: exito && sig ? '' : 'grande', primario: !(exito && sig) }) +
      btn('detalle', 'DETAILS') + btn('niveles', 'LEVELS');
    const antes = s.anterior ? `<p class="u-antes">Previous attempt: rank <b>${s.anterior.final.rango}</b>, ${n(s.anterior.restante)} Wh remaining → now: rank <b>${f.rango}</b>, ${n(r.restante)} Wh remaining.</p>` : '';
    return cabecera() + `<main class="u-inf" style="--c:${f.color}">
      <section class="u-inf-rango">
        <canvas id="u-emblema" width="14" height="11"></canvas>
        <b>${f.rango}</b><small>RANK</small>
      </section>
      <section class="u-inf-texto">
        <p class="u-kicker">MISSION REPORT · LEVEL ${m.nivel} · ${esc(m.nombre).toUpperCase()}</p>
        <h1>${esc(f.titulo)}</h1>
        <ul class="u-frases">${r.resumen.frases.map(x => `<li>${esc(x)}</li>`).join('')}${r.hallazgos
          ? `<li>${r.cienciaHallazgos ? 'Logged ' + (r.hallazgos === 1 ? '1 scientific finding' : r.hallazgos + ' scientific findings') + ': +' + r.cienciaHallazgos + ' science.' : 'Scanned data was lost with telemetry.'}</li>` : ''}</ul>
        <div class="u-inf-barra">
          <div class="u-g-pista"><i class="u-gastado" style="width:${(lim(r.consumo / ini, 0, 1) * 100).toFixed(1)}%"></i><em class="${previsto / ini > 0.85 ? 'izq' : ''}" style="left:${(lim(previsto / ini, 0, 1) * 100).toFixed(1)}%">PLAN</em></div>
          <p>Out of <b>${n(ini)} Wh</b> you spent <b>${n(r.consumo)}</b> (plan estimated ${n(previsto)}) with <b>${n(r.restante)} Wh</b> remaining.</p>
        </div>
        <p class="u-leccion"><b>LESSON</b>${esc(f.leccion)}</p>
        ${antes}
        ${r.nuevoDesbloqueo ? `<p class="u-desbloqueo">★ LEVEL ${meta(r.nuevoDesbloqueo).nivel} UNLOCKED: ${meta(r.nuevoDesbloqueo).nivelNombre}</p>` : ''}
        <p class="u-consejo">▶ ${esc(consejo)}</p>
        <div class="u-fila izq">${botones}</div>
      </section>
    </main>` + pieAida(TX.aida.finales[f.id] || '');
  }

  /* --- modales --- */

  function modalHTML() {
    if (!modal) return '';
    let c = '';
    if (modal === 'ayuda') {
      c = `<h2>HOW TO PLAY</h2>${listaMision()}
        <p class="u-regla"><b>⚡</b>${esc(TX.regla)}</p>
        <dl class="u-ctl">${TX.controles.map(k => `<dt>${k[0]}</dt><dd>${esc(k[1])}</dd>`).join('')}</dl>
        <div class="u-fila">${btn('cerrar', 'UNDERSTOOD', { cls: 'grande', primario: true })}${btn('glosario', 'GLOSSARY')}${btn('creditos', 'DATA & CREDITS')}${btn('borrar', 'RESET PROGRESS')}</div>`;
    } else if (modal === 'glosario') {
      const txt = x => esc(x.replace('{reserva}', Math.round(R.reserva * 100)).replace('{pendiente}', R.pendienteMax));
      c = `<h2>GLOSSARY: TERMS & IMPLICATIONS</h2>
        <dl class="u-glosario">${TX.glosario.map(g => `<dt>${g[0]}</dt><dd>${txt(g[1])}</dd>`).join('')}</dl>
        <div class="u-fila">${btn('cerrar', 'UNDERSTOOD', { cls: 'grande', primario: true })}</div>`;
    } else if (modal === 'borrar') {
      c = `<h2>RESET PROGRESS?</h2><p>Tiers 2 and 3 will lock again and recorded ranks will clear. Useful for a fresh playthrough.</p>
        <div class="u-fila">${btn('cerrar', 'NO, GO BACK', { cls: 'grande', primario: true })}${btn('borrar_si', 'YES, RESET')}</div>`;
    } else if (modal === 'pausa') {
      c = `<h2>MISSION PAUSED</h2><p>No resources drain while paused.</p>
        <p class="u-nota">On board: ${esc(s.equipo.map(id => Motor.obj(id)).filter(o => sis().oxigeno || o.tipo !== 'oxigeno').map(o => o.nombre).join(' · '))}.</p>
        <div class="u-fila">${btn('cerrar', 'RESUME', { cls: 'grande', primario: true })}${btn('ayuda', 'HOW TO PLAY')}${btn('abandonar', 'ABORT MISSION')}</div>`;
    } else if (modal === 'confirmar_fin') {
      c = `<h2>CONCLUDE WITHOUT SAMPLE?</h2><p>If you conclude the mission now, you return safely but without the crater core.</p>
        <div class="u-fila">${btn('cerrar', 'KEEP EXPLORING', { cls: 'grande', primario: true })}${btn('fin_si', 'CONCLUDE HERE')}</div>`;
    } else if (modal === 'calculo') {
      c = `<h2>WHERE THE NUMBERS COME FROM</h2>
        <p>Energy per step = meters × ${R.whMetro} Wh × (1 + mass ÷ ${R.masaReferencia} kg) × (1 + slope ÷ ${R.pendienteReferencia}°)².</p>
        <p>Two factors dominate consumption: loaded <b>mass</b> and, most heavily, <b>slope incline</b>, which scales quadratically.</p>
        <p>Drilling drains ${R.acciones.perforar.wh} Wh, scanning ${R.acciones.escanear.wh} Wh, and collecting ${R.acciones.recoger.wh} Wh. Oxygen depletes by ${R.oxMetro} per meter.</p>
        <p>Recommended reserve is ${Math.round(R.reserva * 100)}% of total trip requirement.</p>
        <p class="u-nota">Calibrated gameplay rules designed to teach tradeoffs, not NASA flight specifications.</p>
        <div class="u-fila">${btn('cerrar', 'CLOSE', { cls: 'grande', primario: true })}</div>`;
    } else if (modal === 'creditos') {
      c = `<h2>DATA & CREDITS</h2>
        <p><b>WHAT IS REAL.</b> ${esc(TX.real)}</p>
        <p><b>WHAT IS GAME MECHANICS.</b> ${esc(TX.juego)}</p>
        <p class="u-nota">${esc(TX.fuente)}</p>
        <p>Mission Umbral is a project created for the NASA Space Apps Challenge 2026. Original art, code, and audio by the team.</p>
        <div class="u-fila">${btn('cerrar', 'CLOSE', { cls: 'grande', primario: true })}</div>`;
    } else if (modal === 'detalle') {
      const r = informe, f = r.final;
      c = `<h2>MISSION DETAILS</h2>
        <p class="u-epilogo">«${esc(f.epilogo)}»</p>
        <table class="u-tabla">
          <tr><th></th><th>Plan</th><th>Actual</th></tr>
          <tr><td>Distance walked</td><td>${n0(s.plan.distancia)} m</td><td>${n0(r.distancia)} m</td></tr>
          <tr><td>Energy consumed</td><td>${n(s.plan.total)} Wh</td><td>${n(r.consumo)} Wh</td></tr>
          <tr><td>Energy remaining</td><td>${n(s.plan.margen)} Wh</td><td>${n(r.restante)} Wh</td></tr>
        </table>
        <p>Walking consumed ${n(s.movimientoWh)} Wh; drilling and actions, ${n(s.accionesWh)} Wh. Recommended reserve: ${n(s.plan.reserva)} Wh.</p>
        ${sis().combustible ? `<p class="u-nota">${esc(r.causa)}</p>` : ''}
        <div class="u-fila">${btn('cerrar', 'CLOSE', { cls: 'grande', primario: true })}</div>`;
    }
    return `<div class="velo"><section class="panel modal u-modal" role="dialog" aria-modal="true">${c}</section></div>`;
  }

  /* ---------------- dibujo en canvas ---------------- */

  function lienzo(id, k) {
    const cv = document.getElementById(id);
    if (!cv) return null;
    if (k) {
      const w = Math.max(1, Math.floor(cv.clientWidth / k)), h = Math.max(1, Math.floor(cv.clientHeight / k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    }
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  function spr(ctx, filas, x, y, k) {
    if (!k || k === 1) return ARTE.pint(ctx, filas, Math.round(x), Math.round(y));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(k, k);
    ARTE.pint(ctx, filas, 0, 0);
    ctx.restore();
  }

  // Sprites de recursos lunares (rocas, hielo, sondas…): usan su propia paleta.
  function sprRecurso(ctx, nombre, cx, cy, k) {
    const filas = SPRITES_RECURSOS_LUNARES[nombre], pal = SPRITES_RECURSOS_LUNARES.paleta;
    if (!filas) return;
    const x0 = Math.round(cx - filas[0].length * k / 2), y0 = Math.round(cy - filas.length * k / 2);
    for (let r = 0; r < filas.length; r++) {
      for (let c = 0; c < filas[r].length; c++) {
        const color = pal[filas[r][c]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x0 + c * k, y0 + r * k, k, k);
      }
    }
  }
  const pois = () => (typeof PUNTOS_INTERES_LUNARES !== 'undefined' && PUNTOS_INTERES_LUNARES[s.sitio]) || { obstaculos: [], escaneos: [] };

  // Nebulosas tenues de fondo: manchas de píxeles que respiran despacio.
  const NEBULOSAS = [[0.18, 0.3, 46, '110,84,190'], [0.72, 0.22, 58, '52,120,170'], [0.5, 0.62, 40, '150,70,140']];
  function nebulosas(ctx, w, h) {
    NEBULOSAS.forEach((nb, i) => {
      const cx = nb[0] * w, cy = nb[1] * h, r = nb[2], a = 0.05 + 0.02 * Math.sin(reloj * 0.4 + i * 2);
      ctx.fillStyle = 'rgba(' + nb[3] + ',' + a.toFixed(3) + ')';
      for (let y = -r; y <= r; y += 4) {
        const m = Math.floor(Math.sqrt(r * r - y * y) * (0.75 + 0.25 * Math.sin(y * 0.21 + i)));
        ctx.fillRect(Math.round(cx - m), Math.round(cy + y * 0.6), m * 2, 4);
      }
    });
  }

  const ESTRELLAS = Array.from({ length: 110 }, (_, i) => ({
    x: (i * 53 + 11) % 331, y: (i * 37 + 5) % 181, f: (i * 0.7) % 6.28, v: 0.7 + (i % 5) * 0.4, g: i % 9 === 0
  }));

  function cielo(ctx, w, h, deriva) {
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(0, 0, w, h);
    nebulosas(ctx, w, h);
    for (const e of ESTRELLAS) {
      if (e.y >= h) continue;
      const x = (((e.x - (deriva || 0) * (e.g ? 1.7 : 1)) % w) + w) % w;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(reloj * e.v + e.f));
      ctx.fillStyle = 'rgba(220,233,248,' + a.toFixed(2) + ')';
      ctx.fillRect(Math.floor(x), e.y, e.g ? 2 : 1, 1);
      if (e.g && a > 0.9) ctx.fillRect(Math.floor(x), e.y - 1, 1, 3);
    }
  }

  // Suelo lunar de perfil para el título y el descenso.
  function suelo(ctx, w, h, alto) {
    const y0 = h - alto;
    ctx.fillStyle = '#8fa3cc';
    ctx.fillRect(0, y0, w, alto);
    ctx.fillStyle = '#cfe0f4';
    ctx.fillRect(0, y0, w, 1);
    ctx.fillStyle = '#5a6fa0';
    for (let i = 0; i < 9; i++) {
      const x = (i * 71 + 23) % w, y = y0 + 6 + (i * 13) % Math.max(1, alto - 10);
      ctx.fillRect(x, y, 14 + (i % 3) * 6, 2);
      ctx.fillRect(x + 2, y + 2, 10 + (i % 3) * 6, 1);
    }
    ctx.fillStyle = '#a8b8d8';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 29 + 7) % w, y0 + 3 + (i * 17) % Math.max(1, alto - 4), 2, 1);
    return y0;
  }

  function llama(ctx, x, y, largo, k) {
    const f = Math.floor(reloj * 22) % 2;
    ctx.fillStyle = '#f2b544';
    ctx.fillRect(x - 2 * k, y, 4 * k, (largo + f) * k);
    ctx.fillStyle = '#f2f5fb';
    ctx.fillRect(x - k, y, 2 * k, Math.max(1, largo - 2 + f) * k);
    ctx.fillStyle = '#e05c5c';
    ctx.fillRect(x - k, y + (largo + f) * k, 2 * k, k);
  }

  function dibujarTitulo() {
    const ctx = lienzo('u-esc-titulo', 4);
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height;
    cielo(ctx, w, h, reloj * 1.5);
    // estrella fugaz cada pocos segundos
    const tf = reloj % 7;
    if (tf < 0.7) {
      ctx.fillStyle = '#dce9f8';
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(w * 0.2 + tf * 190 - i * 3), Math.round(18 + tf * 50 - i), 2, 1);
    }
    // la Tierra, lejos
    ctx.fillStyle = '#3f7fd0';
    for (let y = -9; y <= 9; y++) { const m = Math.floor(Math.sqrt(81 - y * y)); ctx.fillRect(44 - m, 38 + y, m * 2, 1); }
    ctx.fillStyle = '#dce9f8';
    ctx.fillRect(38, 33, 7, 2); ctx.fillRect(44, 41, 6, 2); ctx.fillRect(40, 37, 3, 1);
    const y0 = suelo(ctx, w, h, 34);
    // módulo con baliza
    const mx = Math.round(w * 0.74);
    spr(ctx, ARTE.modulo, mx, y0 - 17, 2);
    ctx.fillStyle = Math.floor(reloj * 2.2) % 2 ? '#58c5d8' : '#e6a640';
    ctx.fillRect(mx + 13, y0 - 21, 2, 3);
    // astronauta paseando
    const tramo = w * 0.42, f = (reloj * 16) % (tramo * 2), ida = f < tramo;
    const ax = Math.round(w * 0.2 + (ida ? f : tramo * 2 - f));
    const cuadros = SPRITES_ANIMADOS.astro[ida ? 'right' : 'left'];
    ctx.fillStyle = 'rgba(11,16,38,.35)';
    ctx.fillRect(ax + 1, y0 + 1, 12, 2);
    spr(ctx, cuadros[1 + Math.floor(reloj * 7) % 2], ax, y0 - 21, 2);
  }

  const cacheTerreno = {};
  function terreno(m, T) {
    const clave = m.id + ':' + T;
    if (cacheTerreno[clave]) return cacheTerreno[clave];
    const cv = document.createElement('canvas');
    cv.width = m.width * T; cv.height = m.height * T;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        const p = m.slopes[y][x], px = x * T, py = y * T;
        if (p === null || p > R.pendienteMax) {
          ctx.fillStyle = '#121a30';
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#2a3654';
          for (let i = 0; i < 3; i++) ctx.fillRect(px + (x * 5 + y * 3 + i * 7) % Math.max(1, T - 2), py + (x * 3 + y * 7 + i * 5) % Math.max(1, T - 1), Math.max(1, T >> 3) + 1, 1);
          continue;
        }
        const v = Math.round(154 - p * 3.3);
        ctx.fillStyle = 'rgb(' + (v - 18) + ',' + (v - 5) + ',' + (v + 18) + ')';
        ctx.fillRect(px, py, T, T);
        ctx.fillStyle = p > 15 ? 'rgba(18,26,48,.5)' : 'rgba(220,233,248,.55)';
        ctx.fillRect(px + (x * 7 + y * 3) % Math.max(1, T - 2), py + (y * 7 + x * 3) % Math.max(1, T - 1), T >= 16 ? 2 : 1, 1);
        if (p > 15 && T >= 8) {
          ctx.fillStyle = 'rgba(18,26,48,.42)';
          const sep = T >= 16 ? 6 : 5;
          for (let d = -T; d < T; d += sep) {
            for (let i = 0; i < T; i++) { const yy = i + d; if (yy >= 0 && yy < T) ctx.fillRect(px + i, py + T - 1 - yy, 1, 1); }
          }
        }
      }
    }
    const rocas = (typeof PUNTOS_INTERES_LUNARES !== 'undefined' && PUNTOS_INTERES_LUNARES[m.id] ? PUNTOS_INTERES_LUNARES[m.id].obstaculos : []);
    rocas.forEach(o => {
      const cx = (o[0] + 0.5) * T, cy = (o[1] + 0.5) * T;
      if (T < 8) { ctx.fillStyle = '#1e293b'; ctx.fillRect(o[0] * T, o[1] * T, T, T); return; }
      ctx.fillStyle = 'rgba(11,16,38,.45)';
      ctx.fillRect(Math.round(cx - T * 0.45), Math.round(cy + T * 0.25), Math.round(T * 0.9), Math.max(2, T >> 3));
      sprRecurso(ctx, 'roca_3d', cx, cy, T >= 20 ? 2 : 1);
    });
    cacheTerreno[clave] = cv;
    return cv;
  }

  function trazo(ctx, puntos, color, ancho, guiones, desfase) {
    if (!puntos || puntos.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = ancho;
    ctx.setLineDash(guiones || []);
    ctx.lineDashOffset = desfase || 0;
    ctx.beginPath();
    puntos.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dibujarMinis() {
    root.querySelectorAll('canvas.u-mini').forEach(cv => {
      const m = MAPAS_NASA.find(x => x.id === cv.dataset.sitio), ctx = cv.getContext('2d'), T = 4;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(terreno(m, T), 0, 0);
      const on = Math.floor(reloj * 2) % 2;
      ctx.fillStyle = '#e6bd6a';
      ctx.fillRect(m.module[0] * T - 1, m.module[1] * T - 1, 6, 6);
      ctx.fillStyle = on ? '#ffffff' : '#9fd6ff';
      ctx.fillRect(m.target[0] * T - 1, m.target[1] * T - 1, 6, 6);
    });
  }

  function dibujarBriefing() {
    const ctx = lienzo('u-esc-brief', 2);
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, T = 9.5, t = reloj % T;
    cielo(ctx, w, h, 0);
    const y0 = suelo(ctx, w, h, 46);
    const xm = 26, xc = w - 46, x1 = xm + 22, x2 = xc - 8;
    // cráter con el núcleo
    ctx.fillStyle = '#232c4e';
    ctx.fillRect(xc - 16, y0, 34, 5); ctx.fillRect(xc - 11, y0 + 5, 24, 4);
    spr(ctx, ARTE.modulo, xm - 10, y0 - 17, 2);
    ctx.fillStyle = Math.floor(reloj * 2.2) % 2 ? '#58c5d8' : '#e6a640';
    ctx.fillRect(xm + 3, y0 - 21, 2, 3);
    // fases: ir, perforar, volver, entregar
    let fase, x, energia, cuadro;
    if (t < 3.2) { fase = 0; const k = t / 3.2; x = x1 + (x2 - x1) * k; energia = 1 - 0.3 * k; cuadro = SPRITES_ANIMADOS.astro.right[1 + Math.floor(reloj * 7) % 2]; }
    else if (t < 4.6) { fase = 1; x = x2 + (Math.floor(reloj * 20) % 2); energia = 0.7 - 0.22 * ((t - 3.2) / 1.4); cuadro = SPRITES_ANIMADOS.perforando; }
    else if (t < 7.8) { fase = 2; const k = (t - 4.6) / 3.2; x = x2 - (x2 - x1) * k; energia = 0.48 - 0.32 * k; cuadro = SPRITES_ANIMADOS.astro.left[1 + Math.floor(reloj * 7) % 2]; }
    else { fase = 3; x = x1; energia = 0.16; cuadro = SPRITES_ANIMADOS.astro.down[0]; }
    if (fase < 2) spr(ctx, ARTE.cristal, xc - 5, y0 - 16, 2);
    if (fase === 1) {
      ctx.fillStyle = '#f2b544';
      for (let i = 0; i < 4; i++) ctx.fillRect(xc - 6 + ((i * 7 + Math.floor(reloj * 30)) % 14), y0 - 3 - (i * 3 + Math.floor(reloj * 24)) % 9, 1, 1);
    }
    ctx.fillStyle = 'rgba(11,16,38,.35)';
    ctx.fillRect(Math.round(x) + 1, y0 + 1, 12, 2);
    spr(ctx, cuadro, x, y0 - 21, 2);
    if (fase >= 2) spr(ctx, ARTE.cristal, x + 4, y0 - 32 + (fase === 3 ? 0 : Math.round(Math.sin(reloj * 6))), 1);
    // barra de energía con la zona "volver"
    const bx = 14, bw = w - 28, by = 12;
    const vuelve = fase === 0 ? 0.3 * (t / 3.2) : fase === 1 ? 0.3 : fase === 2 ? 0.3 * (1 - (t - 4.6) / 3.2) : 0;
    ctx.fillStyle = '#dce9f8'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = '#0b1026'; ctx.fillRect(bx - 1, by - 1, bw + 2, 10);
    ctx.fillStyle = '#6fd08c'; ctx.fillRect(bx, by, Math.round(bw * energia), 8);
    ctx.fillStyle = '#0b1026';
    for (let i = 0; i < Math.round(bw * vuelve); i += 4) ctx.fillRect(bx + i, by, 2, 8);
    ctx.fillStyle = '#e4a33c'; ctx.fillRect(bx + Math.round(bw * vuelve), by - 3, 1, 14);
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#dce9f8';
    ctx.fillText('ENERGY', bx, by + 20);
    if (vuelve > 0.02) { ctx.fillStyle = '#e4a33c'; ctx.fillText('◀ FOR RETURN', Math.max(bx + 44, bx + Math.round(bw * vuelve) + 3), by + 20); }
    if (fase === 3) { ctx.fillStyle = '#6fd08c'; ctx.fillText('✓ SAMPLE DELIVERED', x1 + 20, y0 - 26); }
    // resalta en la lista el paso que se está viendo
    root.querySelectorAll('.u-brief .u-mision li').forEach((li, i) => li.classList.toggle('viva', i === Math.min(fase, 2)));
  }

  function dibujarMapaPlan() {
    const ctx = lienzo('u-mapa');
    if (!ctx || !rutas) return;
    const m = Lunar.map(s), T = 14, c = p => [(p[0] + 0.5) * T, (p[1] + 0.5) * T];
    ctx.drawImage(terreno(m, T), 0, 0);
    const hayRuta = !!elegidos.ruta;
    ['directa', 'ahorro'].forEach(r => {
      const sel = hayRuta && s.ruta === r, pts = rutas[r].ida.map(c);
      ctx.globalAlpha = hayRuta && !sel ? 0.35 : 1;
      trazo(ctx, pts, '#0b1026', sel ? 7 : 6);
      trazo(ctx, pts, COLOR[r], sel ? 4 : 3, sel ? [9, 6] : hayRuta ? [3, 6] : [8, 5], -reloj * (sel ? 22 : 8));
      ctx.globalAlpha = 1;
    });
    const [mx, my] = c(m.module), [tx, ty] = c(m.target);
    spr(ctx, ARTE.modulo, mx - 14, my - 14, 2);
    const pulso = Math.sin(reloj * 5) * 2;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.strokeRect(tx - 9 - pulso / 2, ty - 9 - pulso / 2, 18 + pulso, 18 + pulso);
    spr(ctx, ARTE.cristal, tx - 7, ty - 9, 2);
    ctx.font = 'bold 13px monospace';
    const rotulo = (txt, x, y) => { ctx.fillStyle = '#0b1026'; ctx.fillRect(x - 3, y - 12, txt.length * 8 + 6, 16); ctx.fillStyle = '#dce9f8'; ctx.fillText(txt, x, y); };
    rotulo('MODULE', lim(mx - 24, 4, 500), my + 28);
    rotulo('CRATER', lim(tx - 24, 4, 500), ty - 18);
    // el viajero recorre la ruta elegida, ida y vuelta, para que se vea el plan entero
    if (hayRuta) {
      const todo = rutas[s.ruta].ida.concat(rutas[s.ruta].vuelta), i = (reloj * 9) % (todo.length - 1), a = todo[Math.floor(i)], b = todo[Math.floor(i) + 1];
      const f = i - Math.floor(i), x = (a[0] + (b[0] - a[0]) * f + 0.5) * T, y = (a[1] + (b[1] - a[1]) * f + 0.5) * T;
      ctx.fillStyle = '#0b1026'; ctx.fillRect(Math.round(x) - 6, Math.round(y) - 6, 12, 12);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
    }
  }

  function dibujarViaje() {
    const ctx = lienzo('u-esc-viaje', 4);
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, t = reloj - t0;
    cielo(ctx, w, h, reloj * 26);
    // la Luna crece al acercarse
    const rad = Math.round(20 + Math.min(1, t / 9) * 14), lx = w - 62, ly = Math.round(h / 2);
    ctx.fillStyle = '#8fa3cc';
    for (let y = -rad; y <= rad; y++) { const m = Math.floor(Math.sqrt(rad * rad - y * y)); ctx.fillRect(lx - m, ly + y, m * 2, 1); }
    ctx.fillStyle = '#cfe0f4';
    ctx.fillRect(lx - Math.round(rad * 0.6), ly - Math.round(rad * 0.7), Math.round(rad * 0.5), 2);
    ctx.fillStyle = '#5a6fa0';
    ctx.fillRect(lx + Math.round(rad * 0.15), ly - Math.round(rad * 0.1), Math.round(rad * 0.35), Math.round(rad * 0.2));
    ctx.fillRect(lx - Math.round(rad * 0.45), ly + Math.round(rad * 0.3), Math.round(rad * 0.3), Math.round(rad * 0.15));
    // trayectoria y nave (el sprite apunta hacia arriba: se gira 90°)
    const nx = Math.round(w * 0.24), ny = Math.round(h / 2 + Math.sin(reloj * 2.2) * 2);
    ctx.fillStyle = '#e4a33c';
    for (let x = nx + 22; x < lx - rad - 4; x += 6) ctx.fillRect(x + Math.floor(reloj * 10) % 6, ny + (s.viaje.corrigio ? Math.round((x - nx) / 22) : 0), 2, 1);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(Math.PI / 2);
    ctx.scale(2, 2);
    ARTE.pint(ctx, ARTE.cohete, -4, -7);
    ctx.restore();
    const f = Math.floor(reloj * 24) % 3;
    ctx.fillStyle = '#f2b544'; ctx.fillRect(nx - 22 - f * 3, ny - 3, 9 + f * 3, 6);
    ctx.fillStyle = '#f2f5fb'; ctx.fillRect(nx - 18, ny - 1, 5, 2);
    ctx.fillStyle = '#e05c5c'; ctx.fillRect(nx - 26 - f * 3, ny - 1, 4, 2);
  }

  function dibujarDespegue() {
    const ctx = lienzo('u-esc-cine', 4);
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, t = reloj - t0, vuelo = Math.max(0, t - 1);
    const tiembla = t > 0.9 && t < 1.9 ? Math.round(Math.sin(reloj * 80)) : 0;
    ctx.save();
    ctx.translate(tiembla, 0);
    cielo(ctx, w, h, 0);
    ctx.fillStyle = '#121a3e'; ctx.fillRect(-2, h - 60, w + 4, 60);
    ctx.fillStyle = '#1a2350'; ctx.fillRect(-2, h - 26, w + 4, 26);
    ctx.fillStyle = '#5a6fa0'; ctx.fillRect(-2, h - 26, w + 4, 1);
    const cx = Math.round(w / 2), base = h - 26;
    // torre y plataforma
    ctx.fillStyle = '#5a6fa0';
    ctx.fillRect(cx - 30, base - 62, 3, 62); ctx.fillRect(cx - 22, base - 62, 3, 62);
    for (let y = base - 58; y < base; y += 9) ctx.fillRect(cx - 30, y, 11, 1);
    ctx.fillRect(cx - 22, base - 40, 12, 2);
    ctx.fillStyle = '#9fb6dd'; ctx.fillRect(cx - 20, base - 3, 40, 3);
    const y = base - 42 - vuelo * vuelo * 46;
    if (t > 0.6) {
      // humo que se abre desde la base
      for (let i = 0; i < 16; i++) {
        const edad = ((t - 0.6) * 1.3 + i * 0.17) % 1.5, lado = i % 2 ? 1 : -1;
        ctx.fillStyle = 'rgba(159,182,221,' + (0.55 * (1 - edad / 1.5)).toFixed(2) + ')';
        const tam = 3 + Math.round(edad * 7);
        ctx.fillRect(cx + lado * Math.round(4 + edad * 34 + (i % 4) * 3) - tam / 2, base - 2 - tam + (i % 3), tam, tam);
      }
    }
    if (t > 0.9) {
      const largo = Math.min(7 + Math.min(10, vuelo * 9), Math.max(1, Math.floor((base - 3 - (Math.round(y) + 39)) / 3)));
      llama(ctx, cx, Math.round(y) + 39, largo, 3);
    }
    spr(ctx, ARTE.cohete, cx - 12, y, 3);
    ctx.restore();
    const txt = document.getElementById('u-cine-texto');
    if (txt) txt.textContent = t < 0.33 ? '3' : t < 0.66 ? '2' : t < 1 ? '1' : 'LIFTOFF';
  }

  function dibujarDescenso() {
    const ctx = lienzo('u-esc-cine', 4);
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, t = reloj - t0, T = 2.0, k = Math.min(1, t / T);
    const tiembla = t > T && t < T + 0.25 ? Math.round(Math.sin(reloj * 90)) : 0;
    ctx.save();
    ctx.translate(0, tiembla);
    cielo(ctx, w, h, 0);
    const y0 = suelo(ctx, w, h, 40), cx = Math.round(w / 2);
    const y = -24 + (y0 - 18 + 24) * (1 - Math.pow(1 - k, 2.4));
    ctx.fillStyle = 'rgba(11,16,38,' + (0.15 + 0.3 * k).toFixed(2) + ')';
    ctx.fillRect(cx - Math.round(8 + 8 * k), y0 + 1, Math.round(16 + 16 * k), 2);
    if (k < 1) llama(ctx, cx, Math.round(y) + 18, 5 + Math.round(3 * (1 - k)), 2);
    spr(ctx, ARTE.modulo, cx - 14, y, 2);
    if (t > T) {
      const e = (t - T) / 0.7;
      for (let i = 0; i < 14; i++) {
        const lado = i % 2 ? 1 : -1;
        ctx.fillStyle = 'rgba(207,224,244,' + Math.max(0, 0.7 - e * 0.7).toFixed(2) + ')';
        ctx.fillRect(cx + lado * Math.round(12 + e * (14 + i * 3)), y0 - 2 - Math.round(e * (i % 4) * 2), 3, 2);
      }
      if (!contactoHecho) { contactoHecho = true; LunarAudio.contacto(); }
    }
    ctx.restore();
    const txt = document.getElementById('u-cine-texto');
    if (txt) txt.textContent = t < T ? 'DESCENT' : 'TOUCHDOWN';
  }

  function dibujarSuperficie(dt) {
    const ctx = lienzo('u-campo', 2);
    if (!ctx || !s.pos) return;
    const W = ctx.canvas.width, H = ctx.canvas.height, m = Lunar.map(s), T = 24;
    if (!vis) vis = { x: s.pos[0], y: s.pos[1] };
    const k = Math.min(1, dt * 15);
    vis.x += (s.pos[0] - vis.x) * k;
    vis.y += (s.pos[1] - vis.y) * k;
    const andando = Math.abs(s.pos[0] - vis.x) + Math.abs(s.pos[1] - vis.y) > 0.04;
    let ox = lim((vis.x + 0.5) * T - W / 2, 0, m.width * T - W), oy = lim((vis.y + 0.5) * T - H / 2, 0, m.height * T - H);
    if (sacudida > 0) { sacudida -= dt; ox += Math.round(Math.sin(reloj * 90) * 2); }
    ox = Math.round(ox); oy = Math.round(oy);
    const xy = p => [Math.round((p[0] + 0.5) * T - ox), Math.round((p[1] + 0.5) * T - oy)];
    const er = estadoRetorno();

    ctx.fillStyle = '#0b1026';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(terreno(m, T), -ox, -oy);

    // una sola guía a la vez: al cráter antes de perforar, al módulo después
    if (!s.tomada) {
      trazo(ctx, s.aterrizaje.ida.map(xy), '#0b1026', 4);
      trazo(ctx, s.aterrizaje.ida.map(xy), '#e6bd6a', 2, [5, 5], -reloj * 12);
    }
    if (s.tomada || er.estado !== 'ok') {
      trazo(ctx, s.retorno.path.map(xy), '#0b1026', 4);
      trazo(ctx, s.retorno.path.map(xy), '#76d2e7', 2, [7, 4], -reloj * 16);
    }

    // huellas
    ctx.fillStyle = 'rgba(18,26,48,.55)';
    s.pasos.forEach(p => { const [x, y] = xy(p); ctx.fillRect(x - 4, y + 3, 3, 2); ctx.fillRect(x + 2, y + 6, 3, 2); });

    ctx.font = 'bold 8px monospace';
    const rotulo = (txt, x, y, color) => {
      const a = txt.length * 5 + 6, x0 = Math.round(x - a / 2), y0 = Math.round(y);
      ctx.fillStyle = 'rgba(11,16,38,.9)'; ctx.fillRect(x0, y0 - 8, a, 11);
      ctx.fillStyle = color || '#dce9f8'; ctx.fillText(txt, x0 + 3, y0);
    };

    // cráter y núcleo
    const [tx, ty] = xy(m.target);
    ctx.fillStyle = '#1a2435';
    ctx.fillRect(tx - 16, ty - 7, 32, 16); ctx.fillRect(tx - 11, ty - 11, 22, 24);
    const pulso = Math.sin(reloj * 5) * 3;
    ctx.strokeStyle = '#e2eaf2'; ctx.lineWidth = 1;
    ctx.strokeRect(tx - 14 - pulso / 2 + 0.5, ty - 14 - pulso / 2 + 0.5, 28 + pulso, 28 + pulso);
    if (!s.tomada) spr(ctx, ARTE.cristal, tx - 7, ty - 11, 2);
    rotulo(s.tomada ? '✓ DRILLED' : 'CRATER', tx, ty - 20, s.tomada ? '#6fd08c' : '#ffffff');

    // muestra extra (solo si el nivel trae escáner)
    if (sis().escaner && !s.extraTomada) {
      const [ex, ey] = xy(m.extra);
      spr(ctx, s.revelada ? ARTE.muestra : ARTE.roca, ex - 6, ey - (s.revelada ? 9 : 4), 2);
      rotulo(s.revelada ? 'SAMPLE' : '? SIGNAL', ex, ey - 14, '#9fd6ff');
    }

    // hallazgos científicos: señales que el escáner puede registrar
    if (sis().escaner) {
      pois().escaneos.forEach(poi => {
        const hecho = (s.escaneosExtra || []).includes(poi.id), [hx, hy] = xy(poi.pos);
        if (hx < -40 || hx > W + 40 || hy < -40 || hy > H + 40) return;
        const lat = Math.sin(reloj * 4 + poi.pos[0]) * 2;
        ctx.strokeStyle = hecho ? 'rgba(111,208,140,.8)' : 'rgba(125,249,255,.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx - 12 - lat / 2 + 0.5, hy - 12 - lat / 2 + 0.5, 24 + lat, 24 + lat);
        sprRecurso(ctx, poi.tipo, hx, hy, 2);
        rotulo(hecho ? '✓ LOGGED' : '? FINDING', hx, hy - 18, hecho ? '#6fd08c' : '#7df9ff');
      });
    }

    // módulo con baliza
    const [mx, my] = xy(s.modulo);
    ctx.fillStyle = 'rgba(11,16,38,.4)'; ctx.fillRect(mx - 15, my + 7, 30, 4);
    spr(ctx, ARTE.modulo, mx - 14, my - 10, 2);
    ctx.fillStyle = Math.floor(reloj * 2.2) % 2 ? '#58c5d8' : '#e6a640';
    ctx.fillRect(mx - 1, my - 15, 3, 4);
    rotulo('MODULE', mx, my - 19, '#f3d998');

    // polvo
    particulas = particulas.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vida -= dt * 2.4;
      if (p.vida <= 0) return false;
      ctx.fillStyle = (p.color || 'rgba(207,224,244,') + Math.max(0, p.vida).toFixed(2) + ')';
      ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.t, p.t);
      return true;
    });

    // astronauta: respira quieto, camina al moverse, tiembla al perforar
    const ax = Math.round((vis.x + 0.5) * T - ox), ay = Math.round((vis.y + 0.5) * T - oy);
    let cuadro, dx = 0, dy = 0;
    if (s.perforando) {
      cuadro = SPRITES_ANIMADOS.perforando; dx = Math.floor(reloj * 30) % 2;
      if (Math.random() < 0.6) particulas.push({ x: (vis.x + 0.5) * T + 4, y: (vis.y + 0.5) * T + 8, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.6, vida: 0.7, t: 1, color: 'rgba(242,181,68,' });
    } else {
      const cuadros = SPRITES_ANIMADOS.astro[s.direccion || 'down'] || SPRITES_ANIMADOS.astro.down;
      cuadro = andando ? cuadros[1 + Math.floor(reloj * 9) % 2] : cuadros[0];
      if (!andando) dy = Math.round(Math.sin(reloj * 2.6) * 0.6);
    }
    ctx.fillStyle = 'rgba(11,16,38,.45)'; ctx.fillRect(ax - 6, ay + 8, 13, 3);
    spr(ctx, cuadro, ax - 7 + dx, ay - 13 + dy, 2);
    if (s.muestras.recogidas.length) spr(ctx, ARTE.cristal, ax - 3, ay - 26 + Math.round(Math.sin(reloj * 4)), 1);

    // cifras que flotan (lo que acaba de costar algo)
    flotantes = flotantes.filter(f => {
      f.y -= dt * 16; f.vida -= dt * 0.9;
      if (f.vida <= 0) return false;
      ctx.globalAlpha = Math.min(1, f.vida * 2);
      rotulo(f.txt, Math.round(f.x - ox), Math.round(f.y - oy), f.color);
      ctx.globalAlpha = 1;
      return true;
    });

    // flecha hacia el objetivo cuando queda fuera de la vista
    const meta2 = s.tomada ? s.modulo : m.target, [px, py] = xy(meta2);
    if (px < 10 || px > W - 10 || py < 10 || py > H - 10) {
      const bx = lim(px, 22, W - 22), by = lim(py, 20, H - 16), ang = Math.atan2(py - by, px - bx);
      const metros = Math.round(Math.hypot(meta2[0] - s.pos[0], meta2[1] - s.pos[1]) * m.cellMeters);
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(ang);
      ctx.fillStyle = Math.floor(reloj * 3) % 2 ? '#ffffff' : '#e4a33c';
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      rotulo((s.tomada ? 'MODULE ' : 'CRATER ') + metros + ' m', lim(bx, 46, W - 46), lim(by + (py > by ? -12 : 18), 12, H - 6));
    }

    // marco de aviso: ámbar si vas justo, rojo si ya no alcanza
    if (er.estado !== 'ok') {
      const a = (er.estado === 'rojo' ? 0.3 : 0.16) * (0.6 + 0.4 * Math.sin(reloj * (er.estado === 'rojo' ? 9 : 4)));
      ctx.fillStyle = (er.estado === 'rojo' ? 'rgba(224,92,92,' : 'rgba(228,163,60,') + a.toFixed(2) + ')';
      ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6); ctx.fillRect(0, 6, 6, H - 12); ctx.fillRect(W - 6, 6, 6, H - 12);
    }

    // minimapa
    const mini = lienzo('u-mini-sup');
    if (mini) {
      const t4 = 4;
      mini.drawImage(terreno(m, t4), 0, 0);
      if (s.tomada) trazo(mini, s.retorno.path.map(p => [(p[0] + 0.5) * t4, (p[1] + 0.5) * t4]), '#76d2e7', 1);
      if (sis().escaner) pois().escaneos.forEach(poi => {
        mini.fillStyle = (s.escaneosExtra || []).includes(poi.id) ? '#6fd08c' : '#7df9ff';
        mini.fillRect(poi.pos[0] * t4, poi.pos[1] * t4, 3, 3);
      });
      mini.fillStyle = '#e6bd6a'; mini.fillRect(s.modulo[0] * t4 - 1, s.modulo[1] * t4 - 1, 5, 5);
      if (!s.tomada) { mini.fillStyle = '#ffffff'; mini.fillRect(m.target[0] * t4 - 1, m.target[1] * t4 - 1, 5, 5); }
      mini.fillStyle = Math.floor(reloj * 4) % 2 ? '#ff7785' : '#ffffff';
      mini.fillRect(s.pos[0] * t4 - 1, s.pos[1] * t4 - 1, 5, 5);
    }
  }

  function dibujarEmblema() {
    const ctx = lienzo('u-emblema');
    if (!ctx || !informe) return;
    const filas = SPRITES_ANIMADOS.emblemas[informe.final.rango] || SPRITES_ANIMADOS.emblemas.S;
    ctx.clearRect(0, 0, 14, 11);
    ARTE.pint(ctx, filas, 0, 0);
    // brillo que cruza el emblema
    const x = Math.floor((reloj * 9) % 30) - 6;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let y = 0; y < filas.length; y++) { const xx = x - y; if (xx >= 0 && xx < 14 && filas[y][xx] && filas[y][xx] !== '.') ctx.fillRect(xx, y, 1, 1); }
  }

  function dibujarAida() {
    const ctx = lienzo('u-aida');
    if (!ctx) return;
    ctx.clearRect(0, 0, 10, 9);
    ARTE.pint(ctx, SPRITE_AIDA[reloj % 3.4 < 0.16 ? 1 : 0], 0, 0);
  }

  /* ---------------- flujo ---------------- */

  function vista() {
    if (pantalla === 'titulo') return tituloHTML();
    if (pantalla === 'niveles') return nivelesHTML();
    if (pantalla === 'briefing') return briefingHTML();
    if (pantalla === 'plan') return planHTML();
    if (pantalla === 'despegue') return cineHTML('3');
    if (pantalla === 'viaje') return viajeHTML();
    if (pantalla === 'descenso') return cineHTML('DESCENT');
    if (pantalla === 'superficie') return superficieHTML();
    return informeHTML();
  }

  function render() {
    const act0 = document.activeElement && root.contains(document.activeElement) ? document.activeElement.dataset : null;
    const fl = act0 && act0.l, fx = act0 && act0.x;
    if (pantalla === 'plan') rutas = { directa: Lunar.proyectar(s, 'directa'), ahorro: Lunar.proyectar(s, 'ahorro') };
    root.innerHTML = vista() + modalHTML();
    root.dataset.pantalla = pantalla;
    // Al cambiar de pantalla o de paso el foco va a la acción principal (Enter
    // sigue el camino feliz); dentro de la misma pantalla se queda donde estaba.
    const clave = pantalla + ':' + paso + ':' + modal;
    let foco = null;
    if (modal) foco = root.querySelector('.u-modal [data-primario]');
    else if (fl && clave === claveVista && !alPrimario) foco = Array.from(root.querySelectorAll('[data-l]')).find(e => e.dataset.l === fl && e.dataset.x === fx && !e.disabled);
    if (!foco && !modal && pantalla !== 'superficie') foco = root.querySelector('[data-primario]:not(:disabled)');
    claveVista = clave;
    alPrimario = false;
    if (foco) foco.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement !== document.body && !root.contains(document.activeElement)) document.activeElement.blur();
    dibujar(0);
  }

  function ir(p) {
    pantalla = p;
    t0 = reloj;
    keys = {};
    if (p === 'despegue') LunarAudio.despegue();
    if (p === 'viaje') {
      Lunar.escanearViaje(s);
      if (!sis().combustible) Lunar.decidir(s, false);
    }
    if (p === 'descenso') contactoHecho = false;
    if (p === 'superficie') { vis = null; particulas = []; flotantes = []; fin = null; hallazgo = null; ultimaAlerta = -9; }
    render();
  }

  function empezarNivel(sitio, previo) {
    const repetir = !!(previo && previo.sitio === sitio && previo.etapa === 'informe');
    s = Lunar.iniciarNivel(sitio, repetir ? previo : { desbloqueados: s.desbloqueados });
    informe = null; fin = null; modal = null; elegidos = {};
    if (repetir) {
      pasos().forEach(id => { elegidos[id] = true; });
      paso = pasos().length - 1; // directo a la revisión: se cambia una cosa y se relanza
      ir('plan');
    } else {
      paso = 0;
      ir('briefing');
    }
  }

  function elegir(id, x) {
    if (id === 'ruta') { Lunar.cambiar(s, 'ruta', x); elegidos.ruta = true; }
    else if (id === 'cohete') { Lunar.cambiar(s, 'cohete', x); elegidos.cohete = true; }
    else if (id === 'extras') {
      // el contenedor doble sustituye al simple; al quitarlo vuelve el simple
      if (x === 'cont2' && s.equipo.includes('cont2')) Lunar.cambiar(s, 'equipo', 'cont1');
      else Lunar.cambiar(s, 'equipo', x);
    } else if (!s.equipo.includes(x)) Lunar.cambiar(s, 'equipo', x); // batería y oxígeno: una u otra
  }

  function cerrarFin() {
    informe = Lunar.informe(s);
    guardarRango(s.sitio, informe.final.rango);
    pantalla = 'informe';
    fin = null;
    render();
  }

  function comprobarFin() {
    if (s.etapa !== 'informe' || fin) return;
    keys = {};
    const tipo = s.resultado === 'varado' ? 'varado' : s.tomada ? 'exito' : 'sin';
    fin = { t0: reloj, tipo };
    if (tipo === 'exito') LunarAudio.exito(); else if (tipo === 'varado') LunarAudio.fallo();
    const caja = document.getElementById('u-fin');
    if (caja) {
      caja.hidden = false;
      caja.className = 'u-fin ' + tipo;
      caja.innerHTML = tipo === 'exito' ? '<b>SAMPLE DELIVERED!</b><span>Lander ascending for Earth return</span>'
        : tipo === 'varado' ? '<b>SIGNAL LOST</b><span>Depleted ' + (s.agotado === 'oxigeno' ? 'oxygen' : 'power') + '</span>'
        : '<b>MISSION CONCLUDED</b><span>Returned without the core</span>';
    }
    refrescarSuperficie();
  }

  function mover(d) {
    if (fin || modal || s.etapa !== 'superficie') return;
    const antes = s.recursos.energiaWh, px = (s.pos[0] + 0.5) * 24, py = (s.pos[1] + 0.5) * 24;
    if (Lunar.mover(s, d[0], d[1])) {
      LunarAudio.paso();
      const gasto = antes - s.recursos.energiaWh;
      for (let i = 0; i < 3; i++) {
        particulas.push({ x: px + (Math.random() - 0.5) * 8, y: py + 8 + Math.random() * 4, vx: -d[0] * (0.3 + Math.random() * 0.6), vy: -d[1] * (0.3 + Math.random() * 0.6) - 0.2, vida: 0.9, t: Math.random() > 0.5 ? 2 : 1 });
      }
      // un paso caro (terreno empinado) deja ver su precio
      flotantes = flotantes.filter(f => !f.paso);
      if (gasto >= 1.5) flotantes.push({ paso: true, x: (s.pos[0] + 0.5) * 24, y: (s.pos[1] + 0.5) * 24 - 22, vida: 0.8, txt: 'STEEP −' + n(gasto) + ' Wh', color: gasto >= 2.2 ? '#ff9d9d' : '#f3d998' });
      if (estadoRetorno().estado === 'rojo' && reloj - ultimaAlerta > 1.6) { ultimaAlerta = reloj; LunarAudio.alerta(); }
      refrescarSuperficie();
    } else if (s.etapa === 'superficie' && Lunar.esObstaculo(Lunar.map(s), [s.pos[0] + d[0], s.pos[1] + d[1]])) {
      flotantes = flotantes.filter(f => !f.paso);
      flotantes.push({ paso: true, x: px + d[0] * 24, y: py + d[1] * 24 - 16, vida: 0.9, txt: 'BOULDER: DETOUR', color: '#f3d998' });
    }
    comprobarFin();
  }

  function accion() {
    if (fin || s.etapa !== 'superficie') return;
    const c = Lunar.contexto(s);
    if (!c) return;
    if (c.accion === 'entregar' && !s.muestras.recogidas.length) {
      if (s.pasos.length > 1) { modal = 'confirmar_fin'; render(); }
      return;
    }
    const px = (s.pos[0] + 0.5) * 24, py = (s.pos[1] + 0.5) * 24;
    const r = Lunar.interactuar(s);
    if (r.ok && c.accion !== 'entregar') {
      if (c.accion === 'perforar') { LunarAudio.perforar(); sacudida = 0.35; setTimeout(() => { s.perforando = false; }, 700); }
      else if (c.accion === 'escanear' || c.accion === 'escanear_poi') LunarAudio.escanear();
      else LunarAudio.elegir();
      flotantes.push({ x: px, y: py - 20, vida: 1.4, txt: '−' + c.wh + ' Wh', color: '#f3d998' });
      if (c.accion === 'escanear_poi') { flotantes.push({ x: px, y: py - 32, vida: 1.6, txt: '+' + c.poi.ciencia + ' SCIENCE', color: '#7df9ff' }); mostrarHallazgo(c.poi); }
      else if (c.accion !== 'escanear') flotantes.push({ x: px, y: py - 32, vida: 1.6, txt: '+1 SAMPLE', color: '#6fd08c' });
    } else if (!r.ok) {
      flotantes.push({ x: px, y: py - 20, vida: 1.6, txt: 'ACTION BLOCKED', color: '#ff9d9d' });
    }
    refrescarSuperficie();
    comprobarFin();
  }

  function act(a, x) {
    if (a === 'mv') { if (DIR[x]) mover(DIR[x]); return; }
    if (a === 'accion') { accion(); return; }
    if (a === 'opcion') LunarAudio.elegir(); else LunarAudio.click();

    if (a === 'sonido') LunarAudio.conmutar();
    else if (a === 'jugar') pantalla = 'niveles';
    else if (a === 'volver_titulo') pantalla = 'titulo';
    else if (a === 'niveles') { modal = null; pantalla = 'niveles'; }
    else if (['ayuda', 'glosario', 'creditos', 'calculo', 'detalle', 'borrar'].includes(a)) { modal = a; keys = {}; }
    else if (a === 'pausa') { if (!fin) { modal = 'pausa'; keys = {}; } }
    else if (a === 'cerrar') modal = null;
    else if (a === 'borrar_si') { borrarProgreso(); modal = null; pantalla = 'titulo'; }
    else if (a === 'abandonar') { modal = null; pantalla = 'niveles'; }
    else if (a === 'fin_si') { modal = null; Lunar.interactuar(s); render(); comprobarFin(); return; }
    else if (a === 'nivel' || a === 'siguiente_nivel') { if (abierto(x)) empezarNivel(x, null); return; }
    else if (a === 'repetir') { empezarNivel(s.sitio, s); return; }
    else if (a === 'empezar_plan') { paso = 0; ir('plan'); return; }
    else if (a === 'opcion') { elegir(pasoId(), x); alPrimario = pasoId() !== 'extras'; }
    else if (a === 'paso_sig') { if (pasoElegido(pasoId())) paso = Math.min(pasos().length - 1, paso + 1); }
    else if (a === 'paso_ant') paso = Math.max(0, paso - 1);
    else if (a === 'ir_paso') paso = lim(Number(x), 0, pasos().length - 1);
    else if (a === 'lanzar') {
      Lunar.probar(s);
      if (Lunar.lanzar(s).ok) { ir('despegue'); return; }
    }
    else if (a === 'saltar') { ir(pantalla === 'despegue' ? 'viaje' : 'superficie'); return; }
    else if (a === 'mantener' || a === 'corregir') Lunar.decidir(s, a === 'corregir');
    else if (a === 'descender') { if (Lunar.descender(s)) { ir('descenso'); return; } }
    render();
  }

  /* ---------------- teclado ---------------- */

  function tecla(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (k === 'Escape') {
      e.preventDefault();
      keys = {};
      if (modal) act('cerrar'); else if (pantalla === 'superficie') act('pausa');
      return;
    }
    if (k === 'm' && !e.repeat) { act('sonido'); return; }
    const enBoton = document.activeElement && document.activeElement.tagName === 'BUTTON' && root.contains(document.activeElement);
    if (modal) {
      if (k === 'Enter' && !enBoton) { e.preventDefault(); const b = root.querySelector('.u-modal [data-primario]'); if (b) b.click(); }
      return;
    }
    if (pantalla === 'despegue' || pantalla === 'descenso') {
      if (k === 'Enter' || k === ' ') { e.preventDefault(); if (!e.repeat) act('saltar'); }
      return;
    }
    if (pantalla === 'superficie') {
      if (enBoton) document.activeElement.blur();
      if (k === 'e' || k === 'Enter' || k === ' ') { e.preventDefault(); if (!e.repeat) accion(); return; }
      if (DIR[k]) {
        e.preventDefault();
        if (!keys[k] && !e.repeat) { keys = {}; keys[k] = true; elapsed = 0; mover(DIR[k]); }
      }
      return;
    }
    // menús: flechas para moverse entre opciones, Enter para la acción principal, 1-9 para elegir
    if (k === 'Enter') {
      if (enBoton) return; // el navegador ya pulsa el botón enfocado
      e.preventDefault();
      const b = root.querySelector('[data-primario]:not(:disabled)');
      if (b) b.click();
      return;
    }
    if (DIR[k] && e.key.length > 1) {
      e.preventDefault();
      const nav = Array.from(root.querySelectorAll('[data-nav]:not(:disabled)'));
      if (!nav.length) return;
      const i = nav.indexOf(document.activeElement), d = (k === 'ArrowDown' || k === 'ArrowRight') ? 1 : -1;
      nav[(i + d + nav.length) % nav.length].focus({ preventScroll: true });
      return;
    }
    if (/^[1-9]$/.test(k)) {
      const ops = root.querySelectorAll('.u-opcion:not(:disabled)');
      if (ops[Number(k) - 1]) ops[Number(k) - 1].click();
    }
  }

  /* ---------------- bucle ---------------- */

  function dibujar(dt) {
    if (pantalla === 'titulo') dibujarTitulo();
    else if (pantalla === 'niveles') dibujarMinis();
    else if (pantalla === 'briefing') dibujarBriefing();
    else if (pantalla === 'plan') dibujarMapaPlan();
    else if (pantalla === 'despegue') dibujarDespegue();
    else if (pantalla === 'viaje') dibujarViaje();
    else if (pantalla === 'descenso') dibujarDescenso();
    else if (pantalla === 'superficie') dibujarSuperficie(dt);
    else if (pantalla === 'informe') dibujarEmblema();
    dibujarAida();
  }

  function frame(time) {
    const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    reloj += dt;
    try {
      if (pantalla === 'despegue' && reloj - t0 > CINE.despegue) ir('viaje');
      else if (pantalla === 'descenso' && reloj - t0 > CINE.descenso) ir('superficie');
      else if (pantalla === 'superficie') {
        if (hallazgo && reloj - hallazgo.t0 > 7) { hallazgo = null; const caja = document.getElementById('u-hallazgo'); if (caja) caja.hidden = true; }
        if (fin) { if (reloj - fin.t0 > CINE.fin) cerrarFin(); }
        else if (!modal) {
          const k = Object.keys(keys).find(x => keys[x]);
          if (k) {
            elapsed += dt;
            while (elapsed >= R.pasoSegundos && !fin) { elapsed -= R.pasoSegundos; mover(DIR[k]); }
          } else elapsed = 0;
        }
      }
      dibujar(dt);
    } catch (err) {
      if (!frame.avisado) { frame.avisado = true; console.error(err); }
    }
    window.requestAnimationFrame(frame);
  }

  function iniciar() {
    root = document.getElementById('juego');
    root.classList.add('lunar');
    // index.html?niveles=todos abre los tres niveles (demo y video); no se guarda
    if (/[?&]niveles=todos/.test(window.location.search || '')) s.desbloqueados = ORDEN.slice();
    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-l]');
      if (b && !b.disabled) act(b.dataset.l, b.dataset.x);
    });
    window.addEventListener('keydown', tecla);
    window.addEventListener('keyup', e => { delete keys[e.key.length === 1 ? e.key.toLowerCase() : e.key]; });
    window.addEventListener('blur', () => { keys = {}; elapsed = 0; });
    document.addEventListener('visibilitychange', () => { keys = {}; elapsed = 0; });
    const escalar = () => { root.style.transform = 'scale(' + Math.min((window.innerWidth || 1280) / 1280, (window.innerHeight || 720) / 720) + ')'; };
    window.addEventListener('resize', escalar);
    escalar();
    render();
    window.requestAnimationFrame(frame);
  }

  return {
    iniciar,
    snapshot: () => JSON.parse(JSON.stringify(s)),
    vista: () => ({ pantalla, paso, pasoId: pantalla === 'plan' ? pasoId() : null, modal, fin: fin ? fin.tipo : null })
  };
})();

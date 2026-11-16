/* Top-down extension: catalog/accounting reused from Motor; no DOM. */
var Lunar = (function () {
  'use strict';
  const R = REGLAS_LUNARES;
  const eq = (a,b) => a[0]===b[0] && a[1]===b[1];
  const key = p => p.join(',');
  const map = s => MAPAS_NASA.find(m=>m.id===s.sitio) || MAPAS_NASA[0];
  const n1 = v => Number(v).toFixed(1);

  // Sistemas que el nivel pone en juego. Sin nivel (Lunar.nuevo a secas)
  // están todos activos: así el motor conserva su comportamiento original.
  const TODOS = {oxigeno:true, carga:true, combustible:true, escaner:true, formulas:true};
  const sistemas = s => s.sistemas || TODOS;

  function cargarDesbloqueados() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const guardado = window.localStorage.getItem('mision_umbral_desbloqueados');
        if (guardado) {
          const arr = JSON.parse(guardado);
          if (Array.isArray(arr) && arr.includes('Site01')) return arr;
        }
      }
    } catch (e) {}
    return ['Site01'];
  }

  function guardarDesbloqueados(arr) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mision_umbral_desbloqueados', JSON.stringify(arr));
      }
    } catch (e) {}
  }

  function nuevo(previous) {
    const s = Motor.nuevoEstado();
    Motor.elegirCohete(s, previous ? previous.cohete : 'halcon');
    (previous ? previous.equipo : ['bat160','o2chico','taladro','cont1']).forEach(id=>Motor.equipar(s,id));
    const desbloqueados = previous?.desbloqueados?.slice() || cargarDesbloqueados();
    Object.assign(s, {
      sitio: previous ? previous.sitio : 'Site01',
      ruta: previous ? previous.ruta : 'ahorro',
      pos: null, modulo: null, pasos: [], recorrido: 0, gastado: 0, accionesWh: 0, movimientoWh: 0,
      tomada: false, revelada: false, extraTomada: false, retorno: null, prueba: false,
      direccion: 'down', animFrame: 0, perforando: false,
      desbloqueados: desbloqueados,
      sistemas: previous && previous.sistemas ? {...previous.sistemas} : {...TODOS},
      modoNivel: !!(previous && previous.modoNivel),
      tutorial: {activo: false, comparado: false, probado: false, movido: false, interactuado: false},
      anterior: previous ? informe(previous) : null,
      registro: [], margenRoto: null, final: null, nuevoDesbloqueo: null
    });
    if (previous) s.presupuesto.total = previous.presupuesto.total;
    return s;
  }

  // Prepara una misión del nivel que corresponde al sitio: activa solo los
  // sistemas de ese nivel, fija su presupuesto y deja en la nave el equipo
  // que el jugador todavía no decide. Si "previous" es una partida terminada
  // del mismo nivel, conserva sus decisiones para repetir cambiando una.
  function iniciarNivel(sitio, previous) {
    const meta = SITIOS_LUNARES[sitio] || SITIOS_LUNARES.Site01;
    const repetir = !!(previous && previous.modoNivel && previous.sitio === meta.id && previous.plan && previous.etapa === 'informe');
    const s = nuevo(repetir ? previous : null);
    if (previous && previous.desbloqueados) s.desbloqueados = previous.desbloqueados.slice();
    s.sitio = meta.id;
    s.modoNivel = true;
    s.sistemas = {...meta.sistemas};
    s.presupuesto.total = meta.presupuesto;
    if (!repetir) {
      s.equipo.slice().forEach(id => Motor.quitar(s, id));
      Motor.elegirCohete(s, meta.cohete);
      meta.kit.forEach(id => Motor.equipar(s, id));
      s.ruta = 'ahorro';
      s.anterior = null;
    }
    return s;
  }

  function esObstaculo(m, p) {
    const poi = typeof PUNTOS_INTERES_LUNARES !== 'undefined' ? PUNTOS_INTERES_LUNARES[m.id] : null;
    return poi && poi.obstaculos && poi.obstaculos.some(o => o[0] === p[0] && o[1] === p[1]);
  }

  function transitable(m, p) {
    const [x,y] = p;
    return x>=0 && y>=0 && x<m.width && y<m.height && m.slopes[y][x]!==null && m.slopes[y][x]<=R.pendienteMax && !esObstaculo(m, p);
  }

  function masa(s, muestras) {
    return s.masa.usada + (muestras===undefined ? s.muestras.recogidas.length : muestras) * R.muestraKg;
  }

  function costo(m, a, b, kg) {
    const metros = Math.hypot(b[0]-a[0], b[1]-a[1]) * m.cellMeters;
    const pendiente = (m.slopes[a[1]][a[0]] + m.slopes[b[1]][b[0]]) / 2;
    return {
      metros,
      pendiente,
      wh: metros * R.whMetro * (1 + kg / R.masaReferencia) * Math.pow(1 + pendiente / R.pendienteReferencia, 2),
      ox: metros * R.oxMetro
    };
  }

  // Dijkstra on four-connected cells. The same edge cost powers plans and movement.
  function camino(m, start, end, kg, modo='ahorro') {
    if (!transitable(m,start) || !transitable(m,end)) return [];
    const dist = new Map([[key(start), 0]]), prev = new Map(), open = [{p:start, d:0}];
    while (open.length) {
      let i = 0;
      for (let j=1; j<open.length; j++) if (open[j].d < open[i].d) i = j;
      const {p, d} = open.splice(i, 1)[0];
      if (d !== dist.get(key(p))) continue;
      if (eq(p, end)) {
        const out = [p];
        while (prev.has(key(out[0]))) out.unshift(prev.get(key(out[0])));
        return out;
      }
      for (const delta of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const q = [p[0]+delta[0], p[1]+delta[1]];
        if (!transitable(m, q)) continue;
        const c = costo(m, p, q, kg), nd = d + (modo==='directa' ? c.metros : c.wh);
        if (nd < (dist.get(key(q)) ?? Infinity) - 1e-9) {
          dist.set(key(q), nd);
          prev.set(key(q), p);
          open.push({p:q, d:nd});
        }
      }
    }
    return [];
  }

  function medir(m, path, kg) {
    const out = {wh:0, ox:0, metros:0, max:0, media:0};
    for (let i=1; i<path.length; i++) {
      const c = costo(m, path[i-1], path[i], kg);
      out.wh += c.wh; out.ox += c.ox; out.metros += c.metros;
      out.max = Math.max(out.max, c.pendiente);
      out.media += c.pendiente;
    }
    out.media /= Math.max(1, path.length-1);
    return out;
  }

  function proyectar(s, ruta=s.ruta, origen=map(s).module) {
    const m = map(s), ida = camino(m, origen, m.target, masa(s,0), ruta);
    const vuelta = camino(m, m.target, origen, masa(s,1), ruta);
    const a = medir(m, ida, masa(s,0)), b = medir(m, vuelta, masa(s,1));
    const tarea = R.acciones.perforar.wh, total = a.wh + tarea + b.wh, t = Motor.totales(s);
    return {
      ida, vuelta, a, b, tarea, total, ox: a.ox + b.ox + R.acciones.perforar.ox,
      distancia: a.metros + b.metros, reserva: total * R.reserva, margen: t.energia - total,
      viable: ida.length > 0 && vuelta.length > 0
    };
  }

  function evaluar(s) {
    const p = proyectar(s), t = Motor.totales(s), bloqueos = [], riesgos = [];
    const sis = sistemas(s);
    if (s.masa.usada > s.masa.capacidad) bloqueos.push('Payload exceeds launch capacity by ' + (s.masa.usada - s.masa.capacidad) + ' kg. Remove equipment or choose a larger rocket.');
    if (s.presupuesto.gastado > s.presupuesto.total) bloqueos.push('Equipment exceeds budget by ' + (s.presupuesto.gastado - s.presupuesto.total) + ' credits. Remove items.');
    if (!p.viable) bloqueos.push('No traversable path exists to the crater.');
    if (!t.energia) bloqueos.push('Missing battery: without power you cannot leave the lander.');
    if (!t.oxigeno) bloqueos.push('Missing oxygen: without it you cannot leave the lander.');
    if (!t.taladro) riesgos.push('Without Core Drill you cannot retrieve the target core.');
    if (!t.capacidadMuestras) riesgos.push('Without container you cannot store samples.');
    if (s.masa.usada + R.muestraKg > s.masa.capacidad) riesgos.push('No payload capacity left for 1 kg sample.');
    // Con combustible para corregir, el descenso cercano puede salvar un plan corto.
    const cerca = sis.combustible && t.combustible >= DATOS.costos.maniobra ? proyectar(s, s.ruta, map(s).nearModule) : null;
    const salva = !!(cerca && t.energia - cerca.total >= 0);
    let energia = 'ok';
    if (t.energia && p.margen < 0) {
      energia = salva ? 'corrigiendo' : 'falta';
      riesgos.push(salva
        ? 'Only sufficient if you correct descent in flight: saving ' + n1(t.energia - cerca.total) + ' Wh. Without correcting you are short by ' + n1(-p.margen) + ' Wh.'
        : 'Along this route battery power is INSUFFICIENT for round trip: short by ' + n1(-p.margen) + ' Wh.');
    } else if (t.energia && p.margen < p.reserva) {
      energia = 'justo';
      riesgos.push('Very tight margin: only ' + n1(p.margen) + ' Wh surplus with ' + n1(p.reserva) + ' Wh recommended. Any detour will strand you.');
    }
    if (sis.oxigeno && t.oxigeno && t.oxigeno < p.ox) riesgos.push('Oxygen is INSUFFICIENT for round trip: carrying ' + t.oxigeno + ' but ' + n1(p.ox) + ' required.');
    return {p, t, bloqueos, riesgos, energia, cerca};
  }

  function esDesbloqueado(s, id) {
    return s.desbloqueados && s.desbloqueados.includes(id);
  }

  function cambiar(s, tipo, id) {
    if (s.etapa !== 'hangar') return;
    if (tipo === 'ruta' && ['directa','ahorro'].includes(id)) {
      s.ruta = id;
      s.tutorial.comparado = true;
    }
    if (tipo === 'sitio' && MAPAS_NASA.some(m => m.id === id)) {
      s.sitio = id;
    }
    if (tipo === 'cohete') Motor.elegirCohete(s, id);
    if (tipo === 'equipo') {
      const o = Motor.obj(id);
      if (!o) return;
      if (s.equipo.includes(id)) Motor.quitar(s, id);
      else {
        if (['bateria','oxigeno','contenedor'].includes(o.tipo)) {
          s.equipo.slice().filter(x => Motor.obj(x).tipo === o.tipo).forEach(x => Motor.quitar(s, x));
        }
        Motor.equipar(s, id);
      }
      if (o.tipo === 'bateria') s.tutorial.comparado = true;
    }
    s.prueba = false;
  }

  function probar(s) {
    if (s.etapa === 'hangar') {
      s.prueba = true;
      s.tutorial.probado = true;
    }
    return evaluar(s);
  }

  function lanzar(s) {
    if (s.etapa !== 'hangar' || !s.prueba) return {ok:false, msg:'Click TEST PLAN before launching.'};
    const v = evaluar(s);
    if (v.bloqueos.length) return {ok:false, msg:v.bloqueos.join(' ')};
    s.plan = JSON.parse(JSON.stringify({...v.p, sitio:s.sitio, ruta:s.ruta, equipo:s.equipo, masa:s.masa.usada, energia:v.t.energia}));
    s.recursos = {energiaWh:v.t.energia, oxigeno:v.t.oxigeno, combustible:v.t.combustible};
    s.etapa = 'viaje';
    return {ok:true, msg:'Plan confirmed. Scan landing area.'};
  }

  function escanearViaje(s) {
    if (s.etapa === 'viaje') s.viaje.escaneado = true;
  }

  function decidir(s, corregir) {
    if (s.etapa !== 'viaje' || !s.viaje.escaneado || s.viaje.decidido) return {ok:false, msg:'Scan first.'};
    if (corregir && s.recursos.combustible < DATOS.costos.maniobra) return {ok:false, msg:'Requires 30 units of maneuvering fuel.'};
    s.viaje.decidido = true;
    s.viaje.corrigio = corregir;
    if (corregir) s.recursos.combustible -= DATOS.costos.maniobra;
    s.modulo = (corregir ? map(s).nearModule : map(s).module).slice();
    s.aterrizaje = proyectar(s, s.ruta, s.modulo);
    return {ok:true, msg:corregir ? 'Correction executed: lander positioned closer to crater.' : 'Nominal descent trajectory maintained.'};
  }

  function descender(s) {
    if (s.etapa !== 'viaje' || !s.viaje.decidido) return false;
    s.etapa = 'superficie';
    s.pos = s.modulo.slice();
    s.pasos = [s.pos.slice()];
    actualizarRetorno(s);
    return true;
  }

  function actualizarRetorno(s) {
    const m = map(s), path = camino(m, s.pos, s.modulo, masa(s));
    s.retorno = {...medir(m, path, masa(s)), path};
    if (s.recursos.energiaWh + 1e-8 < s.retorno.wh && !s.margenRoto) {
      s.margenRoto = {
        pos: s.pos.slice(),
        accion: s.registro.at(-1)?.accion || 'detour',
        falta: s.retorno.wh - s.recursos.energiaWh
      };
    }
  }

  function gastar(s, wh, ox, accion) {
    if (!sistemas(s).oxigeno) ox = 0; // en los niveles sin oxígeno, respirar no es un límite
    if (s.recursos.energiaWh + 1e-8 < wh || s.recursos.oxigeno + 1e-8 < ox) return false;
    s.recursos.energiaWh = Math.max(0, s.recursos.energiaWh - wh);
    s.recursos.oxigeno = Math.max(0, s.recursos.oxigeno - ox);
    s.gastado += wh;
    s.registro.push({accion, wh, pos: s.pos.slice()});
    return true;
  }

  function comprobarAgotado(s) {
    if (eq(s.pos, s.modulo)) return;
    const m = map(s);
    const costes = [[1,0],[-1,0],[0,1],[0,-1]]
      .map(d => [s.pos[0]+d[0], s.pos[1]+d[1]])
      .filter(p => transitable(m, p))
      .map(p => costo(m, s.pos, p, masa(s)));
    const sinOx = !sistemas(s).oxigeno;
    if (!costes.some(c => c.wh <= s.recursos.energiaWh + 1e-8 && (sinOx || c.ox <= s.recursos.oxigeno + 1e-8))) {
      s.agotado = costes.some(c => c.wh <= s.recursos.energiaWh + 1e-8) ? 'oxigeno' : 'energia';
      s.resultado = 'varado';
      s.etapa = 'informe';
    }
  }

  function mover(s, dx, dy) {
    if (s.etapa !== 'superficie' || Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const m = map(s), q = [s.pos[0]+dx, s.pos[1]+dy];
    if (!transitable(m, q)) return false;
    const c = costo(m, s.pos, q, masa(s));
    if (!gastar(s, c.wh, c.ox, 'desplazamiento')) {
      comprobarAgotado(s);
      return false;
    }
    s.direccion = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    s.animFrame = (s.animFrame + 1) % 3;
    s.pos = q;
    s.pasos.push(q.slice());
    s.recorrido += c.metros;
    s.movimientoWh += c.wh;
    s.tutorial.movido = true;
    actualizarRetorno(s);
    comprobarAgotado(s);
    return true;
  }

  function contexto(s) {
    if (s.etapa !== 'superficie') return null;
    if (eq(s.pos, s.modulo)) {
      return {accion:'entregar', texto: s.muestras.recogidas.length ? 'Deliver samples' : 'Conclude mission without samples', wh: 0};
    }
    if (eq(s.pos, map(s).target) && !s.tomada) {
      return {accion:'perforar', texto:'Drill', wh: R.acciones.perforar.wh, falta: !Motor.totales(s).taladro ? 'Missing Core Drill' : null};
    }
    if (sistemas(s).escaner && eq(s.pos, map(s).extra) && !s.extraTomada) {
      return {
        accion: s.revelada ? 'recoger' : 'escanear',
        texto: s.revelada ? 'Collect' : 'Scan',
        wh: R.acciones[s.revelada ? 'recoger' : 'escanear'].wh,
        falta: !s.revelada && !Motor.totales(s).escaner ? 'Missing Terrain Scanner' : null,
        // Con un solo hueco, la muestra extra dejaría fuera al núcleo.
        aviso: s.revelada && !s.tomada && Motor.totales(s).capacidadMuestras - s.muestras.recogidas.length <= 1
          ? 'Only 1 container slot left: collecting this leaves no room for crater core.' : null
      };
    }
    const pois = sistemas(s).escaner && typeof PUNTOS_INTERES_LUNARES !== 'undefined' ? PUNTOS_INTERES_LUNARES[s.sitio] : null;
    if (pois && pois.escaneos) {
      const pExtra = pois.escaneos.find(p => eq(s.pos, p.pos));
      if (pExtra && (!s.escaneosExtra || !s.escaneosExtra.includes(pExtra.id))) {
        return {
          accion: 'escanear_poi',
          texto: 'Scan ' + pExtra.nombre,
          wh: R.acciones.escanear.wh,
          poi: pExtra,
          falta: !Motor.totales(s).escaner ? 'Missing Terrain Scanner' : null
        };
      }
    }
    return null;
  }

  function interactuar(s) {
    const c = contexto(s);
    if (!c) return {ok:false, msg:'Approach the center of a marker.'};
    if (c.accion === 'entregar') {
      s.muestras.entregadas = s.muestras.recogidas.slice();
      s.resultado = s.tomada ? 'exito' : s.muestras.entregadas.length ? 'parcial' : 'sin_muestra';
      s.etapa = 'informe';
      return {ok:true, msg:'Samples secured in the lander module.'};
    }
    if (c.falta) return {ok:false, msg: c.falta + '. Must be equipped in the hangar.'};
    if (c.accion !== 'escanear' && c.accion !== 'escanear_poi' && (s.muestras.recogidas.length >= Motor.totales(s).capacidadMuestras || masa(s) + R.muestraKg > s.masa.capacidad)) {
      return {ok:false, msg:'No container capacity or payload allowance for 1 kg more.'};
    }
    const cost = R.acciones[c.accion === 'escanear_poi' ? 'escanear' : c.accion];
    if (!gastar(s, cost.wh, cost.ox, c.accion)) {
      return {ok:false, msg:'Insufficient resources for this action. Try returning to module.'};
    }
    s.accionesWh += cost.wh;
    s.tutorial.interactuado = true;
    if (c.accion === 'perforar') {
      s.tomada = true;
      s.muestras.recogidas.push('Crater Core');
      s.perforando = true;
    }
    if (c.accion === 'escanear') s.revelada = true;
    if (c.accion === 'recoger') {
      s.extraTomada = true;
      s.muestras.recogidas.push('Surface Regolith');
    }
    if (c.accion === 'escanear_poi') {
      if (!s.escaneosExtra) s.escaneosExtra = [];
      s.escaneosExtra.push(c.poi.id);
      s.cienciaExtra = (s.cienciaExtra || 0) + c.poi.ciencia;
      actualizarRetorno(s);
      comprobarAgotado(s);
      return {
        ok: true,
        accion: 'escanear_poi',
        poi: c.poi,
        msg: 'Finding registered: ' + c.poi.nombre + '. ' + c.poi.hallazgo
      };
    }
    actualizarRetorno(s);
    comprobarAgotado(s);
    return {
      ok: true,
      msg: c.accion === 'escanear' ? 'Sample revealed. Check reserve before collecting.' : 'Sample stowed. Only secured once delivered to module.'
    };
  }

  function preverAccion(s) {
    const c = contexto(s);
    if (!c || c.accion === 'entregar') return null;
    const soloEscanea = c.accion === 'escanear' || c.accion === 'escanear_poi';
    const kg = masa(s) + (soloEscanea ? 0 : R.muestraKg), m = map(s);
    const path = camino(m, s.pos, s.modulo, kg), regreso = medir(m, path, kg);
    return {
      regreso: regreso.wh,
      margen: s.recursos.energiaWh - c.wh - regreso.wh,
      oxMargen: s.recursos.oxigeno - R.acciones[soloEscanea ? 'escanear' : c.accion].ox - regreso.ox
    };
  }

  function evaluarFinal(s) {
    if (s.resultado === 'varado') {
      return FINALES_LUNARES.forense;
    }
    const plan = s.plan || {};
    const reserva = plan.reserva || 15;
    const restante = s.recursos.energiaWh;
    const entregadas = s.muestras.entregadas.length;
    const tieneNucleo = s.tomada;
    const sitio = s.sitio;

    // Sin núcleo entregado -> aborto o parcial
    if (!tieneNucleo) {
      return FINALES_LUNARES.tactico;
    }

    // Éxito con 2 muestras y margen >= reserva recomendada
    if (entregadas >= 2 && restante >= reserva) {
      return FINALES_LUNARES.pionero;
    }

    // Terreno exigente con escaneo o muestra extra
    if ((sitio === 'Site04' || sitio === 'Site11') && (entregadas >= 2 || s.revelada || (s.escaneosExtra || []).length) && restante >= reserva * 0.4) {
      return FINALES_LUNARES.revolucion;
    }

    // Margen al límite absoluto (<=8 Wh o margen roto que logró regresar)
    if (restante <= 8 || restante < reserva * 0.35 || s.margenRoto) {
      return FINALES_LUNARES.in_extremis;
    }

    // Éxito estándar con ingeniería equilibrada
    return FINALES_LUNARES.maestro;
  }

  function desbloquearSiguiente(s) {
    if (s.resultado !== 'exito' && !s.muestras.entregadas.length) return null;
    const sitioMeta = SITIOS_LUNARES[s.sitio];
    if (sitioMeta && sitioMeta.desbloquea) {
      const siguiente = sitioMeta.desbloquea;
      if (!s.desbloqueados.includes(siguiente)) {
        s.desbloqueados.push(siguiente);
        guardarDesbloqueados(s.desbloqueados);
        return siguiente;
      }
    }
    return null;
  }

  function informe(s) {
    // Los hallazgos escaneados solo puntúan si la expedición vuelve.
    const hallazgos = (s.escaneosExtra || []).length, cienciaHallazgos = s.resultado === 'varado' ? 0 : (s.cienciaExtra || 0);
    const ciencia = s.muestras.entregadas.length * 100 + cienciaHallazgos, plan = s.plan;
    const reservaCumplida = s.resultado === 'exito' && s.recursos.energiaWh + 1e-8 >= plan.reserva;
    const fin = evaluarFinal(s);
    s.final = fin;
    const nuevoDesbloqueo = desbloquearSiguiente(s);
    s.nuevoDesbloqueo = nuevoDesbloqueo;

    let causa = s.viaje.corrigio ?
      'Descent correction burned 30 maneuvering fuel and reduced path consumption from ' + plan.total.toFixed(1) + ' to ' + s.aterrizaje.total.toFixed(1) + ' Wh.' :
      'Nominal descent maintained trajectory and conserved fuel.';
    if (s.margenRoto) {
      causa += ' Return safety margin breached after ' + s.margenRoto.accion + ' at [' + s.margenRoto.pos + ']; lacked ' + s.margenRoto.falta.toFixed(1) + ' Wh.';
    }
    if (s.resultado === 'varado') {
      causa += ' Retry with a larger battery, the economy route, or avoiding detours.';
    }
    if (!s.tomada) {
      causa += s.equipo.includes('taladro') ? ' Did not retrieve the mission target core.' : ' Missing Core Drill in loadout.';
    }
    if (s.accionesWh > R.acciones.perforar.wh) {
      causa += ' Extra actions consumed ' + (s.accionesWh - R.acciones.perforar.wh).toFixed(1) + ' Wh beyond the core.';
    }

    return {
      ciencia,
      hallazgos,
      cienciaHallazgos,
      reservaCumplida,
      resumen: resumenJugador(s),
      causa,
      distancia: s.recorrido,
      consumo: s.gastado,
      restante: s.recursos.energiaWh,
      resultado: s.resultado,
      plan,
      entregadas: s.muestras.entregadas.length,
      final: fin,
      nuevoDesbloqueo
    };
  }

  // Lo mismo que "causa", contado para quien juega por primera vez: qué pasó,
  // por qué y qué probar ahora. Sin jerga y con las cifras de esa partida.
  function resumenJugador(s) {
    const plan = s.plan, restante = s.recursos.energiaWh, frases = [];
    const acciones = {desplazamiento:'taking another step', perforar:'drilling', escanear:'scanning', recoger:'collecting the extra sample'};
    let consejo;
    if (s.resultado === 'varado') {
      const falta = s.agotado === 'oxigeno' ? 'oxygen' : 'power';
      frases.push('Depleted ' + falta + ' at ' + Math.round(s.retorno ? s.retorno.metros : 0) + ' m from module. Sample remains on the lunar surface.');
      if (plan.margen < 0) {
        frases.push('The plan already came up short from the hangar: required ' + n1(plan.total) + ' Wh with only ' + n1(plan.energia) + ' Wh loaded.');
      } else if (s.margenRoto) {
        frases.push('Crossed the point of no return when ' + (acciones[s.margenRoto.accion] || 'diverting') + ': return cost exceeded remaining resources.');
      }
      consejo = s.agotado === 'oxigeno'
        ? 'Try with a larger oxygen tank or a shorter route.'
        : 'Try with a larger battery, the economy route, or avoiding detours.';
    } else if (!s.tomada) {
      frases.push('Returned safely to the lander module, but without the crater core.');
      frases.push('Recognizing when to abort is sound engineering: crew and spacecraft remain safe.');
      consejo = 'Repeat mission: reach the crater, drill the core, and return.';
    } else {
      frases.push((s.muestras.entregadas.length > 1 ? 'Retrieved crater core and extra sample' : 'Retrieved crater core')
        + ' and returned with ' + n1(restante) + ' Wh surplus.');
      // Lo caminado de más frente al plan (el plan cambia si se corrigió el descenso).
      const previsto = s.aterrizaje ? s.aterrizaje.total : plan.total;
      if (s.gastado > previsto * 1.08 + R.acciones.escanear.wh + R.acciones.recoger.wh) {
        frases.push('Consumed ' + n1(s.gastado - previsto) + ' Wh more than planned: each detour adds energy cost.');
      }
      if (s.viaje.corrigio && s.aterrizaje) {
        frases.push('Correcting descent shortened surface distance: flight plan dropped from ' + n1(plan.total) + ' to ' + n1(s.aterrizaje.total) + ' Wh.');
      }
      // sobrar más de lo que pidió el viaje entero es haber cargado de más
      if (restante > plan.total) {
        frases.push('Surplus energy was huge: carried more battery and mass than necessary.');
        consejo = 'Try a lighter loadout: excess payload mass penalizes every meter walked.';
      } else if (restante + 1e-8 >= plan.reserva) {
        frases.push('Final reserve exceeded recommendation (' + n1(plan.reserva) + ' Wh): healthy safety margin.');
        consejo = 'Great engineering balance. Advance to the next level or tweak loadout to compare.';
      } else {
        frases.push('Returned on very tight margin: recommended reserve was ' + n1(plan.reserva) + ' Wh.');
        consejo = 'One false step would have stranded the rover. Try a larger battery or lower payload mass.';
      }
    }
    return {frases, consejo};
  }

  function guiaPaso(s) {
    if (s.etapa === 'hangar') {
      // Step 1: Section 01 - Route
      if (!s.tutorial.rutaElegida && !s.tutorial.comparado) {
        return {
          paso: 1,
          total: 6,
          fase: '01 / SITE AND ROUTE',
          selector: 'button[data-l="ruta"][data-x="directa"]',
          badge: 'STEP 1 OF 6',
          texto: 'Click [ DIRECT ROUTE ] in Section 01 to evaluate the shortest path.',
          detalle: 'Observe how distance and slopes affect estimated energy consumption.'
        };
      }

      // Step 2: Section 02 - Category 0: Tools
      if (!s.tutorial.cat1 && (s.tutorial.catIndex === 0 || s.tutorial.catIndex === undefined)) {
        return {
          paso: 2,
          total: 6,
          fase: '02 / TOOLS',
          selector: 'button[data-l="category"][data-x="1"]',
          badge: 'STEP 2 OF 6',
          texto: 'TOOLS: Core Drill is required to extract samples and Scanner detects scientific signals. Click [ ENERGY ].',
          detalle: 'Without a drill you cannot extract samples inside the crater.'
        };
      }

      // Step 3: Section 02 - Category 1: Energy
      if (!s.tutorial.cat2 && s.tutorial.catIndex === 1) {
        return {
          paso: 3,
          total: 6,
          fase: '02 / ENERGY',
          selector: 'button[data-l="category"][data-x="2"]',
          badge: 'STEP 3 OF 6',
          texto: 'ENERGY: Batteries (100 Wh or 160 Wh) provide range for traversal and drilling. Click [ LIFE SUPPORT ].',
          detalle: 'More battery grants range, but added mass increases consumption per meter.'
        };
      }

      // Step 4: Section 02 - Category 2: Life Support
      if (!s.tutorial.cat3 && s.tutorial.catIndex === 2) {
        return {
          paso: 4,
          total: 6,
          fase: '02 / LIFE SUPPORT',
          selector: 'button[data-l="category"][data-x="3"]',
          badge: 'STEP 4 OF 6',
          texto: 'LIFE SUPPORT: O₂ tanks for breathing and maneuvering fuel to correct descent. Click [ SAMPLES ].',
          detalle: 'Carrying extra fuel enables trajectory correction during descent.'
        };
      }

      // Step 5: Section 02 - Category 3: Samples
      if (!s.tutorial.equipoVisto && s.tutorial.catIndex === 3) {
        return {
          paso: 5,
          total: 6,
          fase: '02 / SAMPLES',
          selector: 'button[data-l="test"]',
          badge: 'STEP 5 OF 6',
          texto: 'SAMPLES: Containers to store rock and regolith. Loadout ready! Click [ TEST PLAN ] in Section 03.',
          detalle: 'Each collected sample weighs 1 kg and increases return energy cost.'
        };
      }

      // Step 6: Section 03 - Test plan / Launch
      if (!s.prueba) {
        return {
          paso: 6,
          total: 6,
          fase: '03 / TEST PLAN',
          selector: 'button[data-l="test"]',
          badge: 'STEP 6 OF 6',
          texto: 'Click [ TEST PLAN ] in Section 03 to calculate telemetry, reserve, and power balance.',
          detalle: 'Simulation validates whether battery and oxygen sustain the selected route.'
        };
      }
      return {
        paso: 6,
        total: 6,
        fase: '03 / AUTHORIZE LIFTOFF',
        selector: 'button[data-l="launch"]',
        badge: 'AUTHORIZED',
        texto: 'Telemetry validated! Click [ LAUNCH ] in Section 03 to lift off toward the Moon.',
        detalle: 'Spacecraft will transit to lunar orbit with the tested loadout.'
      };
    }
    if (s.etapa === 'viaje') {
      if (!s.viaje.escaneado) {
        return {
          paso: 1,
          total: 2,
          fase: 'IN FLIGHT · TELEMETRY',
          selector: 'button[data-l="scanflight"]',
          badge: 'STEP 1 OF 2',
          texto: 'Click [ SCAN DESCENT ] to assess closest landing site to target.',
          detalle: 'Orbital radar computes exact distance to the destination crater.'
        };
      }
      if (!s.viaje.decidido) {
        return {
          paso: 2,
          total: 2,
          fase: 'IN FLIGHT · TRAJECTORY',
          selector: 'button[data-l="keep"]',
          badge: 'STEP 2 OF 2',
          texto: 'Click [ MAINTAIN ] to confirm direct nominal descent.',
          detalle: 'Or select Correct if you carry 30 fuel to land closer.'
        };
      }
      return {
        paso: 2,
        total: 2,
        fase: 'DESCENT AUTHORIZED',
        selector: 'button[data-l="land"]',
        badge: 'READY',
        texto: 'Trajectory locked. Click [ DESCEND TO SURFACE ] to begin exploration.',
        detalle: 'Spacecraft initiates touchdown burn at the Lunar South Pole.'
      };
    }
    if (s.etapa === 'superficie') {
      if (!s.tutorial.movido) {
        return {
          paso: 1,
          total: 3,
          fase: 'LUNAR SURFACE · MOVEMENT',
          selector: '#l-field',
          badge: 'STEP 1 OF 3',
          texto: 'Use WASD or ARROW keys to navigate your astronaut on the lunar terrain.',
          detalle: 'Each meter drains Wh power and oxygen. Avoid dark boulders ▲.'
        };
      }
      if (!s.tomada) {
        return {
          paso: 2,
          total: 3,
          fase: 'LUNAR SURFACE · EXTRACTION',
          selector: '#l-field',
          badge: 'STEP 2 OF 3',
          texto: 'Follow amber trajectory line to crater ◇ and press [ E ] to drill core.',
          detalle: 'Scientific sample required for mission success.'
        };
      }
      return {
        paso: 3,
        total: 3,
        fase: 'LUNAR SURFACE · RETURN',
        selector: '#l-field',
        badge: 'STEP 3 OF 3',
        texto: 'Core on board! Follow cyan return path to module ▣ and press [ E ] to secure and win.',
        detalle: 'Reach module with power and oxygen before resources deplete.'
      };
    }
    return {
      paso: 1,
      total: 1,
      fase: 'MISSION REPORT',
      selector: 'button[data-l="repeat"], button[data-l="new"]',
      badge: 'DEBRIEF',
      texto: 'Review engineering balance and click [ NEW MISSION ] for the next challenge.',
      detalle: ''
    };
  }

  function guia(s) {
    const p = guiaPaso(s);
    return 'AIDA: ' + p.texto;
  }

  return {
    nuevo, map, masa, costo, transitable, camino, medir, proyectar, evaluar,
    cambiar, probar, lanzar, escanearViaje, decidir, descender, mover,
    contexto, interactuar, preverAccion, informe, guia, guiaPaso, eq, esObstaculo,
    evaluarFinal, esDesbloqueado, desbloquearSiguiente,
    iniciarNivel, sistemas
  };
})();

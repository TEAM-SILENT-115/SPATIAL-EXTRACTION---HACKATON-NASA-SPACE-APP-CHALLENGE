/* Top-down extension: catalog/accounting reused from Motor; no DOM. */
var Lunar = (function () {
  'use strict';
  const R = REGLAS_LUNARES;
  const eq = (a,b) => a[0]===b[0] && a[1]===b[1];
  const key = p => p.join(',');
  const map = s => MAPAS_NASA.find(m=>m.id===s.sitio) || MAPAS_NASA[0];

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
      tutorial: {activo: false, comparado: false, probado: false, movido: false, interactuado: false},
      anterior: previous ? informe(previous) : null,
      registro: [], margenRoto: null, final: null, nuevoDesbloqueo: null
    });
    return s;
  }

  function transitable(m, p) {
    const [x,y] = p;
    return x>=0 && y>=0 && x<m.width && y<m.height && m.slopes[y][x]!==null && m.slopes[y][x]<=R.pendienteMax;
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
    if (s.masa.usada > s.masa.capacidad) bloqueos.push('Carga útil excedida. Reduce kg o elige Titán.');
    if (s.presupuesto.gastado > s.presupuesto.total) bloqueos.push('Presupuesto excedido. Retira equipo.');
    if (!p.viable) bloqueos.push('No existe recorrido transitable.');
    if (!t.energia || !t.oxigeno) bloqueos.push('Necesitas batería y soporte vital para operar.');
    if (!t.taladro) riesgos.push('Sin Taladro de núcleo no podrás recuperar el objetivo.');
    if (!t.capacidadMuestras) riesgos.push('Sin contenedor no podrás guardar muestras.');
    if (s.masa.usada + R.muestraKg > s.masa.capacidad) riesgos.push('No queda carga útil para la muestra de 1 kg.');
    if (p.margen < p.reserva) riesgos.push('Energía por debajo del total más reserva recomendada.');
    if (t.oxigeno < p.ox) riesgos.push('El oxígeno no cubre ida, trabajo y regreso.');
    return {p, t, bloqueos, riesgos};
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
    if (s.etapa !== 'hangar' || !s.prueba) return {ok:false, msg:'Pulsa PROBAR PLAN antes de lanzar.'};
    const v = evaluar(s);
    if (v.bloqueos.length) return {ok:false, msg:v.bloqueos.join(' ')};
    s.plan = JSON.parse(JSON.stringify({...v.p, sitio:s.sitio, ruta:s.ruta, equipo:s.equipo, masa:s.masa.usada, energia:v.t.energia}));
    s.recursos = {energiaWh:v.t.energia, oxigeno:v.t.oxigeno, combustible:v.t.combustible};
    s.etapa = 'viaje';
    return {ok:true, msg:'Plan sellado. Escanea el punto de descenso.'};
  }

  function escanearViaje(s) {
    if (s.etapa === 'viaje') s.viaje.escaneado = true;
  }

  function decidir(s, corregir) {
    if (s.etapa !== 'viaje' || !s.viaje.escaneado || s.viaje.decidido) return {ok:false, msg:'Primero escanea.'};
    if (corregir && s.recursos.combustible < DATOS.costos.maniobra) return {ok:false, msg:'Faltan 30 unidades de combustible de maniobra.'};
    s.viaje.decidido = true;
    s.viaje.corrigio = corregir;
    if (corregir) s.recursos.combustible -= DATOS.costos.maniobra;
    s.modulo = (corregir ? map(s).nearModule : map(s).module).slice();
    s.aterrizaje = proyectar(s, s.ruta, s.modulo);
    return {ok:true, msg:corregir ? 'Corrección aplicada: módulo más cerca del objetivo.' : 'Descenso previsto conservado.'};
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
        accion: s.registro.at(-1)?.accion || 'desvío',
        falta: s.retorno.wh - s.recursos.energiaWh
      };
    }
  }

  function gastar(s, wh, ox, accion) {
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
    if (!costes.some(c => c.wh <= s.recursos.energiaWh + 1e-8 && c.ox <= s.recursos.oxigeno + 1e-8)) {
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
      return {accion:'entregar', texto: s.muestras.recogidas.length ? 'Entregar muestras' : 'Cerrar misión sin muestras', wh: 0};
    }
    if (eq(s.pos, map(s).target) && !s.tomada) {
      return {accion:'perforar', texto:'Perforar', wh: R.acciones.perforar.wh, falta: !Motor.totales(s).taladro ? 'Falta Taladro de núcleo' : null};
    }
    if (eq(s.pos, map(s).extra) && !s.extraTomada) {
      return {
        accion: s.revelada ? 'recoger' : 'escanear',
        texto: s.revelada ? 'Recoger' : 'Escanear',
        wh: R.acciones[s.revelada ? 'recoger' : 'escanear'].wh,
        falta: !s.revelada && !Motor.totales(s).escaner ? 'Falta Escáner de terreno' : null
      };
    }
    return null;
  }

  function interactuar(s) {
    const c = contexto(s);
    if (!c) return {ok:false, msg:'Acércate al centro de un marcador.'};
    if (c.accion === 'entregar') {
      s.muestras.entregadas = s.muestras.recogidas.slice();
      s.resultado = s.tomada ? 'exito' : s.muestras.entregadas.length ? 'parcial' : 'sin_muestra';
      s.etapa = 'informe';
      return {ok:true, msg:'Muestras aseguradas en el módulo.'};
    }
    if (c.falta) return {ok:false, msg: c.falta + '. Debías equiparlo en la agencia.'};
    if (c.accion !== 'escanear' && (s.muestras.recogidas.length >= Motor.totales(s).capacidadMuestras || masa(s) + R.muestraKg > s.masa.capacidad)) {
      return {ok:false, msg:'No hay capacidad de contenedor o carga útil para 1 kg más.'};
    }
    const cost = R.acciones[c.accion];
    if (!gastar(s, cost.wh, cost.ox, c.accion)) {
      return {ok:false, msg:'Recursos insuficientes para esta acción. Puedes intentar regresar.'};
    }
    s.accionesWh += cost.wh;
    s.tutorial.interactuado = true;
    if (c.accion === 'perforar') {
      s.tomada = true;
      s.muestras.recogidas.push('Núcleo del cráter');
      s.perforando = true;
    }
    if (c.accion === 'escanear') s.revelada = true;
    if (c.accion === 'recoger') {
      s.extraTomada = true;
      s.muestras.recogidas.push('Regolito superficial');
    }
    actualizarRetorno(s);
    comprobarAgotado(s);
    return {
      ok: true,
      msg: c.accion === 'escanear' ? 'Muestra revelada. Evalúa el margen antes de recogerla.' : 'Muestra guardada. Solo cuenta al entregarla en el módulo.'
    };
  }

  function preverAccion(s) {
    const c = contexto(s);
    if (!c || c.accion === 'entregar') return null;
    const kg = masa(s) + (c.accion === 'escanear' ? 0 : R.muestraKg), m = map(s);
    const path = camino(m, s.pos, s.modulo, kg), regreso = medir(m, path, kg);
    return {
      regreso: regreso.wh,
      margen: s.recursos.energiaWh - c.wh - regreso.wh,
      oxMargen: s.recursos.oxigeno - R.acciones[c.accion].ox - regreso.ox
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
    if ((sitio === 'Site04' || sitio === 'Site11') && (entregadas >= 2 || s.revelada) && restante >= reserva * 0.4) {
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
    const ciencia = s.muestras.entregadas.length * 100, plan = s.plan;
    const reservaCumplida = s.resultado === 'exito' && s.recursos.energiaWh + 1e-8 >= plan.reserva;
    const fin = evaluarFinal(s);
    s.final = fin;
    const nuevoDesbloqueo = desbloquearSiguiente(s);
    s.nuevoDesbloqueo = nuevoDesbloqueo;

    let causa = s.viaje.corrigio ?
      'La corrección gastó 30 de combustible y redujo la proyección de ' + plan.total.toFixed(1) + ' a ' + s.aterrizaje.total.toFixed(1) + ' Wh.' :
      'Mantener conservó el combustible y el recorrido previsto.';
    if (s.margenRoto) {
      causa += ' El margen de regreso se rompió tras ' + s.margenRoto.accion + ' en [' + s.margenRoto.pos + ']; faltaban ' + s.margenRoto.falta.toFixed(1) + ' Wh.';
    }
    if (s.resultado === 'varado') {
      causa += ' Repite con más batería, la ruta de ahorro o menos desvíos.';
    }
    if (!s.tomada) {
      causa += s.equipo.includes('taladro') ? ' No recuperaste el núcleo marcado como objetivo.' : ' Faltó el Taladro de núcleo elegido en la agencia.';
    }
    if (s.accionesWh > R.acciones.perforar.wh) {
      causa += ' Las acciones extra consumieron ' + (s.accionesWh - R.acciones.perforar.wh).toFixed(1) + ' Wh además del núcleo.';
    }

    return {
      ciencia,
      reservaCumplida,
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

  function guia(s) {
    if (s.etapa === 'hangar') {
      if (!s.tutorial.comparado) return 'AIDA: Compara ingeniería: elige la otra ruta o cambia la batería. Observa cómo cambia la reserva estimada.';
      if (!s.prueba) return 'AIDA: Has cambiado el plan. Pulsa PROBAR PLAN: revisa consumo, reserva y riesgos antes de comprometerte.';
      return 'AIDA: Si aceptas los riesgos visibles, pulsa LANZAR. El equipo y la ruta quedarán sellados.';
    }
    if (s.etapa === 'viaje') {
      return !s.viaje.escaneado ?
        'AIDA: Pulsa ESCANEAR DESCENSO. Luego compara combustible y distancia antes de decidir.' :
        !s.viaje.decidido ?
        'AIDA: Mantener conserva combustible; corregir acerca el módulo. Elige según tu equipo.' :
        'AIDA: Pulsa DESCENDER para comprobar tu plan en el terreno.';
    }
    if (s.etapa === 'superficie') {
      return !s.tutorial.movido ?
        'AIDA: Usa WASD o flechas para caminar. Sigue la línea ámbar hasta el núcleo ◇. Pulsa I para ver el inventario.' :
        !s.tomada ?
        'AIDA: Sitúate sobre el marcador ◇ y pulsa E para perforar. La línea azul indica tu ruta de retorno óptima.' :
        'AIDA: ¡Núcleo asegurado! Sigue la línea azul de regreso al módulo ▣ y pulsa E para entregar y ganar.';
    }
    return 'AIDA: Misión finalizada. Revisa la causa raíz y tu rango de ingeniería. ¡Prueba otra ruta o desbloquea el siguiente sitio!';
  }

  return {
    nuevo, map, masa, costo, transitable, camino, medir, proyectar, evaluar,
    cambiar, probar, lanzar, escanearViaje, decidir, descender, mover,
    contexto, interactuar, preverAccion, informe, guia, eq,
    evaluarFinal, esDesbloqueado, desbloquearSiguiente
  };
})();

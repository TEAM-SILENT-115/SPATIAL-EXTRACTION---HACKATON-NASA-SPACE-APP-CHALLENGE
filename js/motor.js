/* ============================================================
   MISIÓN UMBRAL — MOTOR DE SIMULACIÓN
   Funciones puras sobre el estado del juego. Sin DOM.
   Cada acción devuelve { ok, msg } y muta el estado recibido.
   ============================================================ */

var Motor = (function () {

  var C = DATOS.costos;

  // ---------- utilidades ----------

  function obj(id) {
    for (var i = 0; i < DATOS.objetos.length; i++) {
      if (DATOS.objetos[i].id === id) return DATOS.objetos[i];
    }
    return null;
  }

  function cohetePorId(id) {
    for (var i = 0; i < DATOS.cohetes.length; i++) {
      if (DATOS.cohetes[i].id === id) return DATOS.cohetes[i];
    }
    return null;
  }

  function otraZona(zona) {
    return zona === 'llanura' ? 'crater' : 'llanura';
  }

  // ---------- estado ----------

  function nuevoEstado() {
    return {
      etapa: 'hangar', // 'hangar' | 'viaje' | 'superficie' | 'informe'
      presupuesto: { total: DATOS.presupuestoTotal, gastado: 0 },
      masa: { capacidad: 0, usada: 0 },
      cohete: null,
      objetivo: 'crater_profunda',
      zonaAterrizaje: 'llanura',
      equipo: [],
      recursos: { energiaWh: 0, oxigeno: 0, combustible: 0 },
      plan: null,
      real: { consumido: { energiaWh: 0, oxigeno: 0, combustible: 0 }, eventos: [] },
      posicion: 0,
      terrenoRocosoActivo: false,
      viaje: { escaneado: false, decidido: false, corrigio: false },
      muestras: { recogidas: [], entregadas: [] },
      sitios: null,
      historial: [],
      resultado: null, // 'exito' | 'parcial' | 'varado'
      varadoEn: null
    };
  }

  // Totales que aporta el equipo elegido (antes de lanzar).
  function totales(estado) {
    var t = { energia: 0, oxigeno: 0, combustible: 0, capacidadMuestras: 0, taladro: false, escaner: false };
    estado.equipo.forEach(function (id) {
      var o = obj(id);
      if (!o) return;
      if (o.energia) t.energia += o.energia;
      if (o.oxigeno) t.oxigeno += o.oxigeno;
      if (o.combustible) t.combustible += o.combustible;
      if (o.capacidad) t.capacidadMuestras += o.capacidad;
      if (o.id === 'taladro') t.taladro = true;
      if (o.id === 'escaner') t.escaner = true;
    });
    if (estado.cohete) t.combustible += cohetePorId(estado.cohete).combustibleBase;
    return t;
  }

  // ---------- hangar ----------

  function elegirCohete(estado, id) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'Solo en el hangar.' };
    var nuevo = cohetePorId(id);
    if (!nuevo) return { ok: false, msg: 'Cohete desconocido.' };
    if (estado.cohete === id) return { ok: true, msg: 'Ese cohete ya está elegido.' };
    if (estado.cohete) {
      estado.presupuesto.gastado -= cohetePorId(estado.cohete).costo;
    }
    estado.cohete = id;
    estado.presupuesto.gastado += nuevo.costo;
    estado.masa.capacidad = nuevo.capacidadMasa;
    return { ok: true, msg: 'Cohete ' + nuevo.nombre + ' seleccionado.' };
  }

  function equipar(estado, id) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'Solo en el hangar.' };
    var o = obj(id);
    if (!o) return { ok: false, msg: 'Objeto desconocido.' };
    if (estado.equipo.indexOf(id) !== -1) return { ok: false, msg: 'Ya está equipado.' };
    estado.equipo.push(id);
    estado.presupuesto.gastado += o.costo;
    estado.masa.usada += o.masa;
    return { ok: true, msg: o.nombre + ' equipado (+' + o.masa + ' masa, +' + o.costo + ' créditos).' };
  }

  function quitar(estado, id) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'Solo en el hangar.' };
    var i = estado.equipo.indexOf(id);
    if (i === -1) return { ok: false, msg: 'No está equipado.' };
    var o = obj(id);
    estado.equipo.splice(i, 1);
    estado.presupuesto.gastado -= o.costo;
    estado.masa.usada -= o.masa;
    return { ok: true, msg: o.nombre + ' retirado (se devuelven masa y créditos).' };
  }

  function fijarObjetivo(estado, objetivo) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'Solo en el hangar.' };
    if (!DATOS.objetivos[objetivo]) return { ok: false, msg: 'Objetivo desconocido.' };
    estado.objetivo = objetivo;
    return { ok: true, msg: 'Objetivo: ' + DATOS.objetivos[objetivo].nombre };
  }

  function fijarZona(estado, zona) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'Solo en el hangar.' };
    if (!DATOS.mapa[zona]) return { ok: false, msg: 'Zona desconocida.' };
    estado.zonaAterrizaje = zona;
    return { ok: true, msg: 'Zona de aterrizaje: ' + DATOS.mapa[zona].nombre };
  }

  // ---------- cálculo de rutas ----------

  // ¿Hasta qué paso hay que llegar para cumplir el objetivo?
  function pasoObjetivo(zona, objetivo) {
    var m = DATOS.mapa[zona];
    if (objetivo === 'crater_profunda') return m.pasosACrater;
    return Math.max.apply(null, m.muestras);
  }

  // Costo en energía de moverse de "desde" a "hasta" (pasos contiguos
  // o no). Cuenta el recargo rocoso por cada paso de destino rocoso y
  // la subida al salir del cráter.
  function costoTramoEnergia(zona, desde, hasta, rocoso) {
    var m = DATOS.mapa[zona];
    var total = 0;
    var dir = hasta > desde ? 1 : -1;
    var pos = desde;
    while (pos !== hasta) {
      var destino = pos + dir;
      total += C.pasoEnergia;
      if (rocoso && m.rocosos.indexOf(destino) !== -1) total += m.riesgoWh;
      // subida al abandonar el cráter rumbo al módulo
      if (pos === m.pasosACrater && dir === -1) total += m.salidaCrater;
      pos = destino;
    }
    return total;
  }

  function costoTramoOxigeno(desde, hasta) {
    return Math.abs(hasta - desde) * C.pasoOxigeno;
  }

  // Desglose del plan para una zona+objetivo, en escenario normal o adverso.
  function desglose(zona, objetivo, adverso) {
    var destino = pasoObjetivo(zona, objetivo);
    var m = DATOS.mapa[zona];
    var tareaE, tareaOx, tareaNombre;
    if (objetivo === 'crater_profunda') {
      tareaE = C.perforar; tareaOx = C.perforarOx; tareaNombre = 'Perforar';
    } else {
      tareaE = 2 * C.recoger; tareaOx = 2 * C.recogerOx; tareaNombre = 'Recoger ×2';
    }
    var pasaPorCrater = (objetivo === 'crater_profunda');
    var ida = costoTramoEnergia(zona, 0, destino, adverso);
    var regreso = costoTramoEnergia(zona, destino, 0, adverso);
    if (!pasaPorCrater) {
      // si no entra al cráter no paga la subida (costoTramoEnergia solo
      // la aplica cuando el camino parte del paso del cráter)
    }
    return {
      zona: zona,
      objetivo: objetivo,
      adverso: !!adverso,
      pasos: destino,
      tareaNombre: tareaNombre,
      energia: { ida: ida, tarea: tareaE, regreso: regreso, total: ida + tareaE + regreso },
      oxigeno: {
        ida: costoTramoOxigeno(0, destino),
        tarea: tareaOx,
        regreso: costoTramoOxigeno(destino, 0),
        total: costoTramoOxigeno(0, destino) + tareaOx + costoTramoOxigeno(destino, 0)
      }
    };
  }

  // Recomendación del simulador: escenario adverso + margen.
  function recomendacion(estado) {
    var normal = desglose(estado.zonaAterrizaje, estado.objetivo, false);
    var adverso = desglose(estado.zonaAterrizaje, estado.objetivo, true);
    return {
      normal: normal,
      adverso: adverso,
      energiaRecomendada: Math.ceil(adverso.energia.total * (1 + C.margenRecomendado)),
      oxigenoRecomendado: Math.ceil(adverso.oxigeno.total * (1 + C.margenRecomendado))
    };
  }

  // Proyección [ PROBAR ]: compara lo que llevas con ambos escenarios.
  function probar(estado) {
    var t = totales(estado);
    var r = recomendacion(estado);
    function evaluar(d) {
      return {
        desglose: d,
        margenEnergia: t.energia - d.energia.total,
        margenOxigeno: t.oxigeno - d.oxigeno.total,
        alcanza: t.energia >= d.energia.total && t.oxigeno >= d.oxigeno.total
      };
    }
    return { llevas: t, normal: evaluar(r.normal), adverso: evaluar(r.adverso), recomendacion: r };
  }

  // ---------- lanzamiento ----------

  function lanzar(estado) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'Ya lanzaste.' };
    if (!estado.cohete) return { ok: false, msg: 'Bloqueado: elige un cohete primero.' };
    if (estado.masa.usada > estado.masa.capacidad) {
      return { ok: false, msg: 'Bloqueado: la carga excede la capacidad del cohete por ' + (estado.masa.usada - estado.masa.capacidad) + ' de masa.' };
    }
    if (estado.presupuesto.gastado > estado.presupuesto.total) {
      return { ok: false, msg: 'Bloqueado: el presupuesto está excedido por ' + (estado.presupuesto.gastado - estado.presupuesto.total) + ' créditos.' };
    }
    var t = totales(estado);
    var r = recomendacion(estado);
    estado.recursos.energiaWh = t.energia;
    estado.recursos.oxigeno = t.oxigeno;
    estado.recursos.combustible = t.combustible;
    estado.plan = {
      estimadoIda: r.normal.energia.ida,
      estimadoTarea: r.normal.energia.tarea,
      estimadoRegreso: r.normal.energia.regreso,
      totalPrevisto: r.normal.energia.total,
      totalAdverso: r.adverso.energia.total,
      margenReservado: t.energia - r.normal.energia.total,
      energiaInicial: t.energia,
      oxigenoInicial: t.oxigeno,
      combustibleInicial: t.combustible
    };
    var co = cohetePorId(estado.cohete);
    estado.historial.push({ decision: 'Cohete ' + co.nombre, efecto: 'Capacidad ' + co.capacidadMasa + ' de masa, ' + co.combustibleBase + ' de combustible de maniobra.' });
    estado.historial.push({ decision: 'Equipo: ' + (estado.equipo.map(function (id) { return obj(id).nombre; }).join(', ') || 'nada'), efecto: 'Energía ' + t.energia + ' Wh, O₂ ' + t.oxigeno + ', espacio para ' + t.capacidadMuestras + ' muestra(s).' });
    estado.historial.push({ decision: 'Objetivo: ' + DATOS.objetivos[estado.objetivo].nombre + ' aterrizando en ' + DATOS.mapa[estado.zonaAterrizaje].nombre, efecto: 'Plan: ' + r.normal.energia.total + ' Wh previstos (adverso ' + r.adverso.energia.total + ' Wh).' });
    estado.historial.push({ decision: 'Margen reservado al lanzar: ' + estado.plan.margenReservado + ' Wh', efecto: estado.plan.margenReservado >= (r.adverso.energia.total - r.normal.energia.total) ? 'Cubre el escenario adverso.' : 'No cubre el escenario adverso (necesitaría ' + (r.adverso.energia.total - r.normal.energia.total) + ' Wh).' });
    estado.etapa = 'viaje';
    return { ok: true, msg: '¡Despegue! Las decisiones del hangar quedan selladas.' };
  }

  // ---------- viaje ----------

  function escanearViaje(estado) {
    if (estado.etapa !== 'viaje') return { ok: false, msg: 'Solo durante el viaje.' };
    if (estado.viaje.escaneado) return { ok: false, msg: 'Ya escaneaste.' };
    estado.viaje.escaneado = true;
    return { ok: true, msg: DATOS.textos.eventoViaje };
  }

  // Proyección lado a lado de las dos opciones tras el evento.
  function proyeccionesViaje(estado) {
    var actual = desglose(estado.zonaAterrizaje, estado.objetivo, true);   // quedarse: terreno rocoso
    var otra = desglose(otraZona(estado.zonaAterrizaje), estado.objetivo, false); // corregir: terreno normal
    return {
      mantener: { zona: estado.zonaAterrizaje, d: actual, combustible: 0 },
      corregir: { zona: otraZona(estado.zonaAterrizaje), d: otra, combustible: C.maniobra, posible: estado.recursos.combustible >= C.maniobra }
    };
  }

  function corregir(estado) {
    if (estado.etapa !== 'viaje' || !estado.viaje.escaneado) return { ok: false, msg: 'Primero escanea.' };
    if (estado.viaje.decidido) return { ok: false, msg: 'La trayectoria ya está decidida.' };
    if (estado.recursos.combustible < C.maniobra) {
      return { ok: false, msg: 'Sin combustible suficiente: la maniobra pide ' + C.maniobra + ' y tienes ' + estado.recursos.combustible + '. Esta opción no está disponible para ti.' };
    }
    estado.recursos.combustible -= C.maniobra;
    estado.real.consumido.combustible += C.maniobra;
    estado.zonaAterrizaje = otraZona(estado.zonaAterrizaje);
    estado.terrenoRocosoActivo = false;
    estado.viaje.decidido = true;
    estado.viaje.corrigio = true;
    estado.real.eventos.push('Corrección de trayectoria (−' + C.maniobra + ' combustible)');
    estado.historial.push({ decision: 'Corregir trayectoria hacia ' + DATOS.mapa[estado.zonaAterrizaje].nombre, efecto: 'Gastó ' + C.maniobra + ' de combustible y acortó el recorrido en superficie.' });
    return { ok: true, msg: 'Trayectoria corregida hacia ' + DATOS.mapa[estado.zonaAterrizaje].nombre + '.' };
  }

  function mantener(estado) {
    if (estado.etapa !== 'viaje' || !estado.viaje.escaneado) return { ok: false, msg: 'Primero escanea.' };
    if (estado.viaje.decidido) return { ok: false, msg: 'La trayectoria ya está decidida.' };
    estado.terrenoRocosoActivo = true;
    estado.viaje.decidido = true;
    estado.real.eventos.push('Mantuvo trayectoria: terreno rocoso en ' + DATOS.mapa[estado.zonaAterrizaje].nombre);
    estado.historial.push({ decision: 'Mantener trayectoria hacia ' + DATOS.mapa[estado.zonaAterrizaje].nombre, efecto: 'Conservó el combustible, pero cada paso rocoso costará +' + DATOS.mapa[estado.zonaAterrizaje].riesgoWh + ' Wh.' });
    return { ok: true, msg: 'Trayectoria mantenida. El terreno rocoso espera abajo.' };
  }

  function descender(estado) {
    if (estado.etapa !== 'viaje') return { ok: false, msg: 'Solo durante el viaje.' };
    if (!estado.viaje.decidido) return { ok: false, msg: 'Antes de descender: escanea y decide la trayectoria.' };
    var m = DATOS.mapa[estado.zonaAterrizaje];
    var n = Math.max(m.pasosACrater, Math.max.apply(null, m.muestras));
    estado.sitios = [];
    for (var i = 0; i <= n; i++) {
      var tipo = 'vacio';
      if (i === 0) tipo = 'modulo';
      else if (i === m.pasosACrater) tipo = 'crater';
      else if (m.muestras.indexOf(i) !== -1) tipo = 'muestra';
      estado.sitios.push({
        paso: i,
        tipo: tipo,
        rocoso: estado.terrenoRocosoActivo && m.rocosos.indexOf(i) !== -1,
        revelado: i === 0,
        recogida: false,
        perforada: false,
        vetaRevelada: false,
        vetaExtraida: false
      });
    }
    estado.posicion = 0;
    estado.etapa = 'superficie';
    return { ok: true, msg: 'Descenso completado en ' + m.nombre + '. El reloj de recursos corre.' };
  }

  // ---------- superficie ----------

  function gastar(estado, wh, ox) {
    estado.recursos.energiaWh -= wh;
    estado.recursos.oxigeno -= ox;
    estado.real.consumido.energiaWh += wh;
    estado.real.consumido.oxigeno += ox;
  }

  function comprobarVarado(estado) {
    if (estado.recursos.energiaWh < 0 || estado.recursos.oxigeno < 0) {
      var falta = estado.recursos.energiaWh < 0 ? 'energía' : 'oxígeno';
      estado.recursos.energiaWh = Math.max(0, estado.recursos.energiaWh);
      estado.recursos.oxigeno = Math.max(0, estado.recursos.oxigeno);
      estado.resultado = 'varado';
      estado.varadoEn = estado.posicion;
      estado.historial.push({ decision: 'La expedición se quedó sin ' + falta, efecto: 'Varada a ' + estado.posicion + ' paso(s) del módulo. Las muestras a bordo no cuentan.' });
      estado.etapa = 'informe';
      return true;
    }
    return false;
  }

  function sitioActual(estado) {
    return estado.sitios[estado.posicion];
  }

  function capacidadLibre(estado) {
    return totales(estado).capacidadMuestras - estado.muestras.recogidas.length;
  }

  // Costo estimado de volver al módulo desde la posición actual.
  function costoRegreso(estado) {
    if (estado.etapa !== 'superficie' || estado.posicion === 0) {
      return { energia: 0, oxigeno: 0 };
    }
    return {
      energia: costoTramoEnergia(estado.zonaAterrizaje, estado.posicion, 0, estado.terrenoRocosoActivo),
      oxigeno: costoTramoOxigeno(estado.posicion, 0)
    };
  }

  function avanzar(estado, dir) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    var destino = estado.posicion + (dir >= 0 ? 1 : -1);
    if (destino < 0 || destino >= estado.sitios.length) return { ok: false, msg: 'No hay camino en esa dirección.' };
    var e = costoTramoEnergia(estado.zonaAterrizaje, estado.posicion, destino, estado.terrenoRocosoActivo);
    gastar(estado, e, C.pasoOxigeno);
    estado.posicion = destino;
    if (comprobarVarado(estado)) return { ok: true, msg: 'Las reservas se agotaron en el camino.' };
    return { ok: true, msg: 'Te desplazas (−' + e + ' Wh, −' + C.pasoOxigeno + ' O₂).' };
  }

  function escanearSuperficie(estado) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    if (!totales(estado).escaner) return { ok: false, msg: 'No llevas escáner de terreno: no puedes escanear aquí.' };
    var s = sitioActual(estado);
    gastar(estado, C.escanearSup, C.escanearSupOx);
    if (comprobarVarado(estado)) return { ok: true, msg: 'Las reservas se agotaron.' };
    s.revelado = true;
    var msg;
    if (s.tipo === 'crater' && s.perforada && !s.vetaRevelada) {
      s.vetaRevelada = true;
      msg = 'El escáner detecta una VETA aún más profunda. Perforarla costaría ' + C.veta + ' Wh más.';
    } else if (s.tipo === 'crater') {
      msg = 'Cráter: hay una muestra profunda. Exige taladro (' + C.perforar + ' Wh).';
    } else if (s.tipo === 'muestra' && !s.recogida) {
      msg = 'Muestra superficial detectada en este punto (' + C.recoger + ' Wh recogerla).';
    } else if (s.tipo === 'modulo') {
      msg = 'Tu módulo de descenso. Aquí terminan y cuentan las muestras.';
    } else {
      msg = 'Nada de valor en este punto.';
    }
    return { ok: true, msg: msg };
  }

  function recoger(estado) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    var s = sitioActual(estado);
    if (s.tipo !== 'muestra' || s.recogida) return { ok: false, msg: 'Aquí no hay muestra superficial por recoger.' };
    if (capacidadLibre(estado) < 1) return { ok: false, msg: 'Sin espacio en el contenedor.' };
    gastar(estado, C.recoger, C.recogerOx);
    if (comprobarVarado(estado)) return { ok: true, msg: 'Las reservas se agotaron.' };
    s.recogida = true;
    s.revelado = true;
    estado.muestras.recogidas.push({ id: 'superficial-' + s.paso, nombre: 'Muestra superficial (paso ' + s.paso + ')', tipo: 'superficial' });
    estado.historial.push({ decision: 'Recogió muestra superficial en el paso ' + s.paso, efecto: '−' + C.recoger + ' Wh. Solo contará si vuelve al módulo.' });
    return { ok: true, msg: 'Muestra superficial a bordo. Recuerda: solo cuenta si regresas.' };
  }

  function perforar(estado) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    var s = sitioActual(estado);
    if (s.tipo !== 'crater') return { ok: false, msg: 'Solo se puede perforar en el cráter.' };
    if (!totales(estado).taladro) return { ok: false, msg: 'No llevas taladro: la muestra profunda queda fuera de tu alcance.' };
    if (!s.perforada) {
      if (capacidadLibre(estado) < 1) return { ok: false, msg: 'Sin espacio en el contenedor.' };
      gastar(estado, C.perforar, C.perforarOx);
      if (comprobarVarado(estado)) return { ok: true, msg: 'Las reservas se agotaron perforando.' };
      s.perforada = true;
      s.revelado = true;
      estado.muestras.recogidas.push({ id: 'profunda', nombre: 'Muestra profunda del cráter', tipo: 'profunda' });
      estado.historial.push({ decision: 'Perforó la muestra profunda', efecto: '−' + C.perforar + ' Wh. Solo contará si vuelve al módulo.' });
      return { ok: true, msg: 'Muestra profunda extraída (−' + C.perforar + ' Wh).' };
    }
    if (s.vetaRevelada && !s.vetaExtraida) {
      if (capacidadLibre(estado) < 1) return { ok: false, msg: 'Sin espacio en el contenedor para la veta.' };
      gastar(estado, C.veta, C.vetaOx);
      if (comprobarVarado(estado)) return { ok: true, msg: 'Las reservas se agotaron en la veta.' };
      s.vetaExtraida = true;
      estado.muestras.recogidas.push({ id: 'veta', nombre: 'Muestra de la veta profunda', tipo: 'profunda' });
      estado.historial.push({ decision: 'Perforó la veta extra', efecto: '−' + C.veta + ' Wh a cambio de más valor científico.' });
      return { ok: true, msg: 'Veta extraída (−' + C.veta + ' Wh).' };
    }
    return { ok: false, msg: 'Este punto ya está perforado.' };
  }

  function regresar(estado) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    if (estado.posicion === 0) {
      return entregar(estado);
    }
    // camina paso a paso hacia el módulo consumiendo recursos reales
    while (estado.posicion > 0) {
      var destino = estado.posicion - 1;
      var e = costoTramoEnergia(estado.zonaAterrizaje, estado.posicion, destino, estado.terrenoRocosoActivo);
      gastar(estado, e, C.pasoOxigeno);
      estado.posicion = destino;
      if (comprobarVarado(estado)) {
        return { ok: true, msg: 'El regreso se cortó a ' + estado.posicion + ' paso(s) del módulo.' };
      }
    }
    return entregar(estado);
  }

  function entregar(estado) {
    estado.muestras.entregadas = estado.muestras.recogidas.slice();
    var profundas = estado.muestras.entregadas.filter(function (x) { return x.tipo === 'profunda'; }).length;
    var superficiales = estado.muestras.entregadas.filter(function (x) { return x.tipo === 'superficial'; }).length;
    var cumplido = estado.objetivo === 'crater_profunda' ? profundas >= 1 : superficiales >= 2;
    estado.resultado = cumplido ? 'exito' : (estado.muestras.entregadas.length > 0 ? 'parcial' : 'parcial');
    estado.historial.push({
      decision: 'Regresó al módulo con ' + estado.muestras.entregadas.length + ' muestra(s)',
      efecto: cumplido ? 'Objetivo científico cumplido.' : 'El objetivo pedía ' + DATOS.objetivos[estado.objetivo].nombre.toLowerCase() + '.'
    });
    estado.etapa = 'informe';
    return { ok: true, msg: 'De vuelta en el módulo. Misión cerrada.' };
  }

  // ---------- informe ----------

  function causal(estado) {
    var frases = [];
    var plan = estado.plan || {};
    var rocoso = estado.terrenoRocosoActivo;
    var m = DATOS.mapa[estado.zonaAterrizaje];
    if (estado.resultado === 'varado') {
      frases.push('Te quedaste sin reservas a ' + estado.varadoEn + ' paso(s) del módulo, así que ninguna muestra cuenta.');
      if (rocoso) {
        frases.push('El terreno rocoso encareció cada paso en +' + m.riesgoWh + ' Wh, y el margen que reservaste al lanzar (' + plan.margenReservado + ' Wh) no cubrió ese extra.');
      } else {
        frases.push('El plan estimaba ' + plan.totalPrevisto + ' Wh y reservaste ' + plan.margenReservado + ' Wh de margen; las acciones extra en superficie se comieron la diferencia.');
      }
      frases.push('Prueba a repetir cambiando una sola decisión: una batería mayor, aterrizar más cerca o explorar menos.');
    } else {
      var profunda = estado.muestras.entregadas.some(function (x) { return x.id === 'profunda'; });
      if (estado.resultado === 'exito' && profunda && estado.viaje.corrigio) {
        frases.push('Recuperaste la muestra profunda. La corrección de trayectoria acortó el recorrido y te permitió regresar con la batería que habías elegido.');
      } else if (estado.resultado === 'exito' && rocoso) {
        frases.push('Cumpliste el objetivo pese al terreno rocoso: el margen de ' + plan.margenReservado + ' Wh que reservaste en la agencia absorbió los pasos más caros.');
      } else if (estado.resultado === 'exito') {
        frases.push('Cumpliste el objetivo y volviste con ' + estado.recursos.energiaWh + ' Wh de sobra: tu estimación en la agencia fue acertada.');
      } else {
        frases.push('Volviste a salvo, pero sin completar el objetivo (' + DATOS.objetivos[estado.objetivo].nombre.toLowerCase() + ').');
        if (!totales(estado).taladro && estado.objetivo === 'crater_profunda') {
          frases.push('Sin taladro equipado, la muestra profunda nunca estuvo a tu alcance: esa decisión se tomó en el hangar.');
        } else {
          frases.push('El recorte vino de los recursos: compara abajo lo previsto con lo consumido y busca el tramo donde se fue el margen.');
        }
      }
      if (estado.viaje.corrigio) {
        frases.push('La maniobra costó ' + C.maniobra + ' de combustible que habías decidido llevar desde la agencia.');
      }
    }
    return frases;
  }

  function generarInforme(estado) {
    return {
      resultado: estado.resultado,
      titulo: estado.resultado === 'exito' ? 'MISIÓN CUMPLIDA'
        : estado.resultado === 'parcial' ? 'REGRESO SIN OBJETIVO'
        : 'EXPEDICIÓN VARADA',
      causal: causal(estado),
      plan: estado.plan,
      consumido: estado.real.consumido,
      eventos: estado.real.eventos,
      entregadas: estado.muestras.entregadas,
      recogidasNoEntregadas: estado.resultado === 'varado' ? estado.muestras.recogidas : [],
      historial: estado.historial
    };
  }

  // Repetir cambiando el plan: vuelve al hangar conservando las
  // decisiones anteriores para editarlas.
  function repetirConPlan(estado) {
    var n = nuevoEstado();
    n.objetivo = estado.objetivo;
    n.zonaAterrizaje = estado.viaje.corrigio ? otraZona(estado.zonaAterrizaje) : estado.zonaAterrizaje;
    estado.equipo.forEach(function (id) { equipar(n, id); });
    if (estado.cohete) elegirCohete(n, estado.cohete);
    return n;
  }

  return {
    nuevoEstado: nuevoEstado,
    obj: obj,
    cohetePorId: cohetePorId,
    otraZona: otraZona,
    totales: totales,
    elegirCohete: elegirCohete,
    equipar: equipar,
    quitar: quitar,
    fijarObjetivo: fijarObjetivo,
    fijarZona: fijarZona,
    pasoObjetivo: pasoObjetivo,
    desglose: desglose,
    recomendacion: recomendacion,
    probar: probar,
    lanzar: lanzar,
    escanearViaje: escanearViaje,
    proyeccionesViaje: proyeccionesViaje,
    corregir: corregir,
    mantener: mantener,
    descender: descender,
    costoRegreso: costoRegreso,
    capacidadLibre: capacidadLibre,
    sitioActual: sitioActual,
    avanzar: avanzar,
    escanearSuperficie: escanearSuperficie,
    recoger: recoger,
    perforar: perforar,
    regresar: regresar,
    generarInforme: generarInforme,
    repetirConPlan: repetirConPlan
  };
})();

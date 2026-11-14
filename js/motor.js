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
      real: {
        consumido: { energiaWh: 0, oxigeno: 0, combustible: 0 },
        porTramo: { ida: 0, exploracion: 0, regreso: 0 }, // energía real gastada en cada tramo
        eventos: [],
        reservaInvadida: false,   // ¿la energía bajó de la reserva de regreso antes de volver?
        regresoNecesario: null,   // costo del regreso en el momento de pulsar REGRESAR
        energiaAlVolver: null     // energía que había en ese momento
      },
      fase: null,    // en superficie: 'ida' | 'exploracion' | 'regreso'
      reserva: null, // reparto de la energía por tramos, decidido en el hangar
      posicion: 0,
      terrenoRocosoActivo: false,
      viaje: { escaneado: false, decidido: false, corrigio: false, rocoso: null, probRocoso: null }, // rocoso: lo que reveló el escaneo en la zona planeada
      muestras: { recogidas: [], entregadas: [] },
      sitios: null,
      historial: [],
      resultado: null, // 'exito' | 'parcial' | 'varado'
      varadoEn: null,
      anterior: null   // resumen de la partida previa (solo tras REPETIR), para compararla en el informe
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

  // ---------- reserva por tramos ([ RESERVAR ]) ----------
  // La energía que se lleva se reparte entre ida, exploración y regreso.
  // Es una decisión de planificación: no bloquea nada en superficie, pero
  // el simulador compara cada tramo con su estimación, el juego anota el
  // momento en que se entra en la reserva de regreso y el informe enfrenta
  // lo reservado con lo consumido.

  var TRAMOS = ['ida', 'exploracion', 'regreso'];

  // Reparto automático: la estimación normal para ida y regreso; el resto
  // queda para explorar (lo que haría un planificador sin margen).
  function reservaPorDefecto(estado) {
    var E = totales(estado).energia;
    var n = desglose(estado.zonaAterrizaje, estado.objetivo, false);
    var ida = Math.min(n.energia.ida, E);
    var regreso = Math.min(n.energia.regreso, E - ida);
    return { ida: ida, exploracion: E - ida - regreso, regreso: regreso, manual: false };
  }

  // Mantiene la reserva coherente con la energía equipada. Si el jugador no
  // la tocó, sigue la estimación; si la tocó, el sobrante va a exploración y
  // el faltante se recorta de exploración, luego regreso, luego ida.
  function ajustarReserva(estado) {
    if (estado.etapa !== 'hangar') return;
    var E = totales(estado).energia;
    if (!estado.reserva || !estado.reserva.manual) {
      estado.reserva = reservaPorDefecto(estado);
      return;
    }
    var r = estado.reserva;
    var suma = r.ida + r.exploracion + r.regreso;
    if (suma <= E) { r.exploracion += E - suma; return; }
    var exceso = suma - E;
    ['exploracion', 'regreso', 'ida'].forEach(function (t) {
      var q = Math.min(r[t], exceso);
      r[t] -= q;
      exceso -= q;
    });
  }

  function moverReserva(estado, desde, hacia, wh) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'La reserva se decide en el hangar.' };
    if (TRAMOS.indexOf(desde) === -1 || TRAMOS.indexOf(hacia) === -1 || desde === hacia) return { ok: false, msg: 'Tramo desconocido.' };
    ajustarReserva(estado);
    wh = wh || C.pasoReserva;
    var r = estado.reserva;
    var nombres = DATOS.textos.tramos;
    if (r[desde] < wh) return { ok: false, msg: 'No hay ' + wh + ' Wh que mover desde ' + nombres[desde].toLowerCase() + '.' };
    r[desde] -= wh;
    r[hacia] += wh;
    r.manual = true;
    return { ok: true, msg: wh + ' Wh pasan de ' + nombres[desde].toLowerCase() + ' a ' + nombres[hacia].toLowerCase() + '.' };
  }

  // [ USAR RECOMENDACIÓN ]: reparte según el escenario adverso, primero el
  // regreso (es lo que te trae de vuelta), luego la ida, el resto a explorar.
  function reservarRecomendado(estado) {
    if (estado.etapa !== 'hangar') return { ok: false, msg: 'La reserva se decide en el hangar.' };
    var E = totales(estado).energia;
    var a = desglose(estado.zonaAterrizaje, estado.objetivo, true);
    var regreso = Math.min(a.energia.regreso, E);
    var ida = Math.min(a.energia.ida, E - regreso);
    estado.reserva = { ida: ida, exploracion: E - ida - regreso, regreso: regreso, manual: true };
    var falta = a.energia.total - E;
    return { ok: true, msg: falta > 0 ? 'Reserva adversa aplicada, pero faltan ' + falta + ' Wh para cubrirla entera.' : 'Reserva ajustada al escenario adverso.' };
  }

  // Compara la reserva de cada tramo con lo que estima el simulador.
  function evaluarReserva(estado) {
    ajustarReserva(estado);
    var n = desglose(estado.zonaAterrizaje, estado.objetivo, false);
    var a = desglose(estado.zonaAterrizaje, estado.objetivo, true);
    var r = estado.reserva;
    function fila(t, normal, adverso) {
      return {
        tramo: t, reservado: r[t], normal: normal, adverso: adverso,
        faltaNormal: Math.max(0, normal - r[t]),
        faltaAdverso: Math.max(0, adverso - r[t])
      };
    }
    return {
      ida: fila('ida', n.energia.ida, a.energia.ida),
      exploracion: fila('exploracion', n.energia.tarea, a.energia.tarea),
      regreso: fila('regreso', n.energia.regreso, a.energia.regreso),
      total: r.ida + r.exploracion + r.regreso,
      manual: r.manual
    };
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

  // Desglosa el costo en energía de moverse de "desde" a "hasta": pasos por
  // el costo base, recargo por cada casilla rocosa de destino y la subida al
  // abandonar el cráter rumbo al módulo. Toda cifra de recorrido que muestra
  // la interfaz sale de aquí, así que siempre se puede abrir.
  function componentesTramo(zona, desde, hasta, rocoso) {
    var m = DATOS.mapa[zona];
    var c = { pasos: 0, base: 0, pasosRocosos: 0, recargoUnitario: m.riesgoWh, recargo: 0, salida: 0, total: 0 };
    if (desde === hasta) return c;
    var dir = hasta > desde ? 1 : -1;
    var pos = desde;
    while (pos !== hasta) {
      var destino = pos + dir;
      c.pasos += 1;
      c.base += C.pasoEnergia;
      if (rocoso && m.rocosos.indexOf(destino) !== -1) { c.pasosRocosos += 1; c.recargo += m.riesgoWh; }
      // subida al abandonar el cráter rumbo al módulo
      if (pos === m.pasosACrater && dir === -1) c.salida += m.salidaCrater;
      pos = destino;
    }
    c.total = c.base + c.recargo + c.salida;
    return c;
  }

  function costoTramoEnergia(zona, desde, hasta, rocoso) {
    return componentesTramo(zona, desde, hasta, rocoso).total;
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
    var cIda = componentesTramo(zona, 0, destino, adverso);
    var cRegreso = componentesTramo(zona, destino, 0, adverso);
    var ida = cIda.total, regreso = cRegreso.total;
    return {
      zona: zona,
      objetivo: objetivo,
      adverso: !!adverso,
      pasos: destino,
      tareaNombre: tareaNombre,
      componentes: { ida: cIda, regreso: cRegreso },
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
      // el −1e-9 evita que 90 × 1.1 = 99.00000000000001 suba a 100 por coma flotante
      energiaRecomendada: Math.ceil(adverso.energia.total * (1 + C.margenRecomendado) - 1e-9),
      oxigenoRecomendado: Math.ceil(adverso.oxigeno.total * (1 + C.margenRecomendado) - 1e-9)
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
    ajustarReserva(estado);
    var rv = estado.reserva;
    estado.plan.reserva = { ida: rv.ida, exploracion: rv.exploracion, regreso: rv.regreso, manual: rv.manual };
    var faltaRegreso = r.adverso.energia.regreso - rv.regreso;
    estado.historial.push({
      decision: 'Reserva por tramos: ida ' + rv.ida + ' · exploración ' + rv.exploracion + ' · regreso ' + rv.regreso + ' Wh' + (rv.manual ? '' : ' (reparto automático)'),
      efecto: faltaRegreso > 0
        ? 'Si el terreno sale rocoso, volver pide ' + r.adverso.energia.regreso + ' Wh: a la reserva de regreso le faltan ' + faltaRegreso + '.'
        : 'La reserva de regreso cubre incluso el terreno rocoso (' + r.adverso.energia.regreso + ' Wh).'
    });
    estado.etapa = 'viaje';
    return { ok: true, msg: '¡Despegue! Las decisiones del hangar quedan selladas.' };
  }

  // ---------- viaje ----------

  // El escaneo tira el dado del terreno contra la probabilidad de la zona
  // planeada. "azar" es un número en [0, 1): la interfaz pasa Math.random()
  // y las pruebas un valor fijo, así el motor sigue siendo determinista
  // (0 → siempre rocoso; 0.99 → siempre despejado).
  function escanearViaje(estado, azar) {
    if (estado.etapa !== 'viaje') return { ok: false, msg: 'Solo durante el viaje.' };
    if (estado.viaje.escaneado) return { ok: false, msg: 'Ya escaneaste.' };
    var prob = DATOS.mapa[estado.zonaAterrizaje].probRocoso;
    if (typeof azar !== 'number') azar = Math.random();
    estado.viaje.escaneado = true;
    estado.viaje.probRocoso = prob;
    estado.viaje.rocoso = azar < prob;
    estado.historial.push({
      decision: 'Escaneo en vuelo sobre ' + DATOS.mapa[estado.zonaAterrizaje].nombre + ' (riesgo de roca: ' + porcentaje(prob) + ' %)',
      efecto: estado.viaje.rocoso
        ? 'Salió ROCOSO: el recorrido pasa de ' + estado.plan.totalPrevisto + ' a ' + estado.plan.totalAdverso + ' Wh.'
        : 'Salió despejado: la estimación de ' + estado.plan.totalPrevisto + ' Wh se mantiene.'
    });
    return { ok: true, msg: estado.viaje.rocoso ? DATOS.textos.eventoViaje : DATOS.textos.eventoViajeDespejado };
  }

  function porcentaje(p) { return Math.round(p * 100); }

  // Proyección lado a lado de las dos opciones tras el evento.
  function proyeccionesViaje(estado) {
    var rocoso = !!estado.viaje.rocoso;
    var actual = desglose(estado.zonaAterrizaje, estado.objetivo, rocoso);   // quedarse: el terreno que reveló el escaneo
    var otra = desglose(otraZona(estado.zonaAterrizaje), estado.objetivo, false); // corregir: el escaneo ya confirmó terreno despejado allí
    return {
      rocoso: rocoso,
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
    var rocoso = !!estado.viaje.rocoso;
    estado.terrenoRocosoActivo = rocoso;
    estado.viaje.decidido = true;
    estado.real.eventos.push('Mantuvo trayectoria: terreno ' + (rocoso ? 'rocoso' : 'despejado') + ' en ' + DATOS.mapa[estado.zonaAterrizaje].nombre);
    estado.historial.push({
      decision: 'Mantener trayectoria hacia ' + DATOS.mapa[estado.zonaAterrizaje].nombre,
      efecto: rocoso
        ? 'Conservó el combustible, pero cada paso rocoso costará +' + DATOS.mapa[estado.zonaAterrizaje].riesgoWh + ' Wh.'
        : 'Conservó el combustible y el terreno despejado respeta el plan.'
    });
    return { ok: true, msg: rocoso ? 'Trayectoria mantenida. El terreno rocoso espera abajo.' : 'Trayectoria mantenida. Terreno despejado: el plan sigue en pie.' };
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
    estado.fase = 'ida';
    estado.etapa = 'superficie';
    return { ok: true, msg: 'Descenso completado en ' + m.nombre + '. El reloj de recursos corre.' };
  }

  // ---------- superficie ----------

  function gastar(estado, wh, ox) {
    estado.recursos.energiaWh -= wh;
    estado.recursos.oxigeno -= ox;
    estado.real.consumido.energiaWh += wh;
    estado.real.consumido.oxigeno += ox;
    if (estado.fase) estado.real.porTramo[estado.fase] += wh;
    // Entrar en la reserva de regreso no bloquea nada: se anota una sola
    // vez para que el informe pueda señalar el momento exacto.
    if (estado.plan && estado.plan.reserva && !estado.real.reservaInvadida &&
        estado.fase !== 'regreso' && estado.recursos.energiaWh < estado.plan.reserva.regreso) {
      estado.real.reservaInvadida = true;
      estado.historial.push({
        decision: 'Entró en la reserva de regreso (' + estado.plan.reserva.regreso + ' Wh) a ' + estado.posicion + ' paso(s) del módulo',
        efecto: 'Quedan ' + Math.max(0, estado.recursos.energiaWh) + ' Wh. Desde aquí cada acción extra se paga con el viaje de vuelta.'
      });
    }
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

  // Desglose del indicador "regreso estimado": de dónde sale la cifra y si
  // lo que llevas alcanza. Fuera de la superficie devuelve ceros.
  function desgloseRegreso(estado) {
    var enSuperficie = estado.etapa === 'superficie';
    var c = enSuperficie
      ? componentesTramo(estado.zonaAterrizaje, estado.posicion, 0, estado.terrenoRocosoActivo)
      : componentesTramo(estado.zonaAterrizaje, 0, 0, false);
    var ox = enSuperficie ? costoTramoOxigeno(estado.posicion, 0) : 0;
    return {
      desde: estado.posicion,
      rocoso: !!estado.terrenoRocosoActivo,
      energia: c,
      oxigeno: { pasos: c.pasos, unitario: C.pasoOxigeno, total: ox },
      tienes: { energia: estado.recursos.energiaWh, oxigeno: estado.recursos.oxigeno },
      sobra: { energia: estado.recursos.energiaWh - c.total, oxigeno: estado.recursos.oxigeno - ox }
    };
  }

  function avanzar(estado, dir) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    var destino = estado.posicion + (dir >= 0 ? 1 : -1);
    if (destino < 0 || destino >= estado.sitios.length) return { ok: false, msg: 'No hay camino en esa dirección.' };
    var e = costoTramoEnergia(estado.zonaAterrizaje, estado.posicion, destino, estado.terrenoRocosoActivo);
    estado.posicion = destino;
    gastar(estado, e, C.pasoOxigeno);
    if (estado.fase === 'ida' && estado.posicion >= pasoObjetivo(estado.zonaAterrizaje, estado.objetivo)) estado.fase = 'exploracion';
    if (comprobarVarado(estado)) return { ok: true, msg: 'Las reservas se agotaron en el camino.' };
    return { ok: true, msg: 'Te desplazas (−' + e + ' Wh, −' + C.pasoOxigeno + ' O₂).' };
  }

  function escanearSuperficie(estado) {
    if (estado.etapa !== 'superficie') return { ok: false, msg: 'Solo en superficie.' };
    if (!totales(estado).escaner) return { ok: false, msg: 'No llevas escáner de terreno: no puedes escanear aquí.' };
    var s = sitioActual(estado);
    if (estado.fase === 'ida') estado.fase = 'exploracion';
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
    if (estado.fase === 'ida') estado.fase = 'exploracion';
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
      if (estado.fase === 'ida') estado.fase = 'exploracion';
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
      if (estado.fase === 'ida') estado.fase = 'exploracion';
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
    estado.real.regresoNecesario = costoRegreso(estado).energia;
    estado.real.energiaAlVolver = estado.recursos.energiaWh;
    estado.fase = 'regreso';
    if (estado.posicion === 0) {
      return entregar(estado);
    }
    // camina paso a paso hacia el módulo consumiendo recursos reales
    while (estado.posicion > 0) {
      var destino = estado.posicion - 1;
      var e = costoTramoEnergia(estado.zonaAterrizaje, estado.posicion, destino, estado.terrenoRocosoActivo);
      estado.posicion = destino;
      gastar(estado, e, C.pasoOxigeno);
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
      var veta = estado.muestras.recogidas.some(function (x) { return x.id === 'veta'; });
      if (veta) {
        frases.push('Ya tenías la muestra profunda a bordo. Perforar la veta costó ' + C.veta + ' Wh que el regreso necesitaba: seguir explorando fue la decisión que rompió el balance.');
      }
      if (plan.energiaInicial === 0) {
        // Sin batería no hay margen que analizar: la causa está en el hangar.
        frases.push('Lanzaste sin ninguna batería: tenías 0 Wh y el primer paso ya cuesta ' + C.pasoEnergia + ' Wh. El plan pedía ' + plan.totalPrevisto + ' Wh solo para ir, trabajar y volver.');
      } else if (plan.margenReservado < 0) {
        frases.push('El plan ya no alcanzaba antes de despegar: llevabas ' + plan.energiaInicial + ' Wh y el recorrido previsto pedía ' + plan.totalPrevisto + ' Wh (faltaban ' + (-plan.margenReservado) + ' Wh incluso con buen terreno).');
      } else if (rocoso) {
        frases.push('El terreno rocoso encareció cada paso en +' + m.riesgoWh + ' Wh, y el margen que reservaste al lanzar (' + plan.margenReservado + ' Wh) no cubrió ese extra.' +
          (estado.viaje.probRocoso !== null ? ' El riesgo estaba avisado: ' + porcentaje(estado.viaje.probRocoso) + ' % en esa zona.' : ''));
      } else {
        frases.push('El plan estimaba ' + plan.totalPrevisto + ' Wh y reservaste ' + plan.margenReservado + ' Wh de margen; las acciones extra en superficie se comieron la diferencia.');
      }
      if (plan.reserva && plan.energiaInicial > 0 && estado.real.regresoNecesario !== null) {
        frases.push('Habías reservado ' + plan.reserva.regreso + ' Wh para volver; al dar la vuelta el regreso costaba ' + estado.real.regresoNecesario + ' Wh y te quedaban ' + estado.real.energiaAlVolver + '.');
      }
      frases.push(plan.energiaInicial === 0
        ? 'Vuelve a la agencia y equipa una batería: sin energía no hay expedición.'
        : 'Prueba a repetir cambiando una sola decisión: una batería mayor, aterrizar más cerca, reservar más para el regreso o explorar menos.');
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
      // El terreno salió despejado: ¿el plan habría aguantado el otro resultado
      // del dado? Aquí es donde se enseña el margen cuando no hizo falta.
      if (estado.viaje.rocoso === false && !estado.viaje.corrigio && plan.energiaInicial > 0) {
        var pct = porcentaje(estado.viaje.probRocoso);
        var faltaria = plan.totalAdverso - plan.energiaInicial;
        if (faltaria <= 0) {
          frases.push('El terreno salió despejado, pero tu plan no dependía de eso: con terreno rocoso (' + pct + ' % de riesgo) el recorrido pedía ' + plan.totalAdverso + ' Wh y llevabas ' + plan.energiaInicial + '.');
        } else if (plan.combustibleInicial >= C.maniobra) {
          frases.push('El terreno salió despejado. Con terreno rocoso (' + pct + ' % de riesgo) te habrían faltado ' + faltaria + ' Wh, pero llevabas combustible para corregir la trayectoria: esa era tu salida.');
        } else {
          frases.push('Esta vez fue suerte, no margen: el terreno salió despejado, pero había ' + pct + ' % de riesgo de roca. Con terreno rocoso te habrían faltado ' + faltaria + ' Wh y no llevabas combustible para corregir.');
        }
      }
      if (estado.real.reservaInvadida) {
        frases.push('Llegaste a entrar en la reserva de regreso y aun así volviste: el margen que apartaste en la agencia fue el que te trajo de vuelta.');
      }
      if (estado.viaje.corrigio) {
        frases.push('La maniobra costó ' + C.maniobra + ' de combustible que habías decidido llevar desde la agencia.');
      }
    }
    return frases;
  }

  // ---------- comparación entre partidas ----------

  var TIPOS_EQUIPO = [
    ['bateria', 'Batería'], ['oxigeno', 'Oxígeno'], ['herramienta', 'Herramientas'],
    ['contenedor', 'Contenedor'], ['combustible', 'Combustible extra']
  ];

  function textoResultado(res) {
    if (res.resultado === 'exito') return 'Misión cumplida (sobraron ' + res.energiaFinal + ' Wh)';
    if (res.resultado === 'parcial') return 'Regreso sin objetivo (sobraron ' + res.energiaFinal + ' Wh)';
    return 'Varada a ' + res.varadoEn + ' paso(s) del módulo';
  }

  // Foto de las decisiones y del resultado de una partida terminada.
  // Solo guarda textos y números ya resueltos: no depende del estado vivo.
  function resumenPartida(estado) {
    var equipo = {};
    TIPOS_EQUIPO.forEach(function (par) {
      var nombres = estado.equipo.map(obj).filter(function (o) { return o && o.tipo === par[0]; })
        .map(function (o) { return o.nombre; }).sort();
      equipo[par[0]] = nombres.length ? nombres.join(' + ') : 'ninguno';
    });
    var zonaPlan = estado.viaje.corrigio ? otraZona(estado.zonaAterrizaje) : estado.zonaAterrizaje;
    var pr = estado.plan ? estado.plan.reserva : null;
    var res = {
      cohete: estado.cohete ? cohetePorId(estado.cohete).nombre : 'ninguno',
      objetivo: DATOS.objetivos[estado.objetivo].corto,
      zona: DATOS.mapa[zonaPlan].nombre,
      equipo: equipo,
      reservaManual: !!(pr && pr.manual),
      reservaRegreso: pr ? pr.regreso : null,
      trayectoria: estado.viaje.corrigio ? 'Corregir' : 'Mantener',
      // No es una decisión: es lo que salió en el dado del escaneo.
      terreno: estado.viaje.rocoso === null ? null : (estado.viaje.rocoso ? 'Rocoso' : 'Despejado'),
      recogidas: estado.muestras.recogidas.map(function (x) { return x.nombre; }).join(' + ') || 'ninguna',
      resultado: estado.resultado,
      varadoEn: estado.varadoEn,
      energiaFinal: estado.recursos.energiaWh,
      entregadas: estado.muestras.entregadas.length
    };
    res.textoResultado = textoResultado(res);
    return res;
  }

  // Compara la partida terminada con la anterior (si se llegó aquí con
  // REPETIR). Devuelve qué decisiones cambiaron y qué pasó con el resultado.
  // Con un solo cambio el efecto queda aislado; con varios, el informe lo dice.
  function compararConAnterior(estado) {
    if (!estado.anterior || !estado.resultado) return null;
    var a = estado.anterior;
    var b = resumenPartida(estado);
    var cambios = [];
    function mirar(etiqueta, antes, ahora) {
      if (antes !== ahora) cambios.push({ etiqueta: etiqueta, antes: antes, ahora: ahora });
    }
    mirar('Cohete', a.cohete, b.cohete);
    mirar('Objetivo', a.objetivo, b.objetivo);
    mirar('Zona de aterrizaje', a.zona, b.zona);
    TIPOS_EQUIPO.forEach(function (par) { mirar(par[1], a.equipo[par[0]], b.equipo[par[0]]); });
    // La reserva automática depende de la zona y del objetivo: solo es una
    // decisión propia cuando el jugador la movió a mano.
    if (a.reservaManual || b.reservaManual) {
      mirar('Reserva para el regreso', a.reservaRegreso + ' Wh', b.reservaRegreso + ' Wh');
    }
    mirar('Trayectoria en vuelo', a.trayectoria, b.trayectoria);
    mirar('Muestras recogidas', a.recogidas, b.recogidas);

    // El terreno es azar, no decisión: se informa aparte y matiza la frase.
    var terrenoCambio = (a.terreno && b.terreno && a.terreno !== b.terreno)
      ? { antes: a.terreno, ahora: b.terreno } : null;
    var textoTerreno = terrenoCambio ? terrenoCambio.antes + ' → ' + terrenoCambio.ahora : '';
    var mismoResultado = a.textoResultado === b.textoResultado;
    var efecto = mismoResultado
      ? 'el resultado no cambió: ' + b.textoResultado.toLowerCase() + '.'
      : 'el resultado pasó de «' + a.textoResultado + '» a «' + b.textoResultado + '».';
    var frase;
    if (cambios.length === 0) {
      frase = mismoResultado
        ? 'Repetiste exactamente las mismas decisiones y ' + efecto + (terrenoCambio ? ' El terreno salió distinto (' + textoTerreno + ') y tu plan dio lo mismo.' : '') + ' Cambia una y vuelve a comparar.'
        : terrenoCambio
          ? 'Tomaste las mismas decisiones, pero el terreno salió distinto (' + textoTerreno + ') y ' + efecto + ' Esa diferencia es suerte: el margen existe para la partida en que sale mal.'
          : 'El plan y las decisiones fueron los mismos; la diferencia estuvo en cuánto te moviste o escaneaste en superficie: ' + efecto;
    } else if (cambios.length === 1) {
      var c = cambios[0];
      frase = 'Cambiaste una sola decisión (' + c.etiqueta + ': ' + c.antes + ' → ' + c.ahora + ') y ' + efecto +
        (mismoResultado
          ? ' Esa decisión no era la que ataba' + (terrenoCambio ? ', ni siquiera con el terreno distinto (' + textoTerreno + ').' : '.')
          : terrenoCambio
            ? ' Pero el terreno también salió distinto (' + textoTerreno + '): no se puede atribuir solo a tu cambio. Repite para confirmarlo.'
            : ' Ese cambio es la causa.');
    } else {
      frase = 'Cambiaste ' + cambios.length + ' decisiones a la vez y ' + efecto +
        ' Con varios cambios juntos no se sabe cuál pesó: repite cambiando solo una.' +
        (terrenoCambio ? ' Además, el terreno salió distinto (' + textoTerreno + ').' : '');
    }
    return { antes: a, ahora: b, cambios: cambios, terrenoCambio: terrenoCambio, mismoResultado: mismoResultado, frase: frase };
  }

  function generarInforme(estado) {
    return {
      comparacion: compararConAnterior(estado),
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
      reserva: estado.plan ? estado.plan.reserva : null,
      porTramo: estado.real.porTramo,
      reservaInvadida: estado.real.reservaInvadida,
      historial: estado.historial
    };
  }

  // Repetir cambiando el plan: vuelve al hangar conservando las
  // decisiones anteriores para editarlas.
  function repetirConPlan(estado) {
    var n = nuevoEstado();
    if (estado.resultado) n.anterior = resumenPartida(estado);
    n.objetivo = estado.objetivo;
    n.zonaAterrizaje = estado.viaje.corrigio ? otraZona(estado.zonaAterrizaje) : estado.zonaAterrizaje;
    estado.equipo.forEach(function (id) { equipar(n, id); });
    if (estado.cohete) elegirCohete(n, estado.cohete);
    if (estado.plan && estado.plan.reserva && estado.plan.reserva.manual) {
      var pr = estado.plan.reserva;
      n.reserva = { ida: pr.ida, exploracion: pr.exploracion, regreso: pr.regreso, manual: true };
      ajustarReserva(n);
    }
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
    reservaPorDefecto: reservaPorDefecto,
    moverReserva: moverReserva,
    reservarRecomendado: reservarRecomendado,
    evaluarReserva: evaluarReserva,
    lanzar: lanzar,
    escanearViaje: escanearViaje,
    proyeccionesViaje: proyeccionesViaje,
    corregir: corregir,
    mantener: mantener,
    descender: descender,
    costoRegreso: costoRegreso,
    componentesTramo: componentesTramo,
    desgloseRegreso: desgloseRegreso,
    capacidadLibre: capacidadLibre,
    sitioActual: sitioActual,
    avanzar: avanzar,
    escanearSuperficie: escanearSuperficie,
    recoger: recoger,
    perforar: perforar,
    regresar: regresar,
    generarInforme: generarInforme,
    resumenPartida: resumenPartida,
    compararConAnterior: compararConAnterior,
    repetirConPlan: repetirConPlan
  };
})();

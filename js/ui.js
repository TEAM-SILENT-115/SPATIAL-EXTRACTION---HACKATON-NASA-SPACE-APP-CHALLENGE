/* ============================================================
   MISIÓN UMBRAL — INTERFAZ
   Render y eventos. Lee del motor, nunca calcula reglas.
   Pantalla fija 1280×720 escalada al viewport. Pixel art por
   código (sprites originales, sin activos de terceros).
   ============================================================ */

var UI = (function () {

  var T = DATOS.textos;
  var C = DATOS.costos;

  var estado = Motor.nuevoEstado();
  var mensaje = 'Bienvenido a la agencia. Diseña tu misión.';
  var intro = true;
  var modal = null; // null | 'calculo' | 'probar' | 'reservar'
  var juego, marco;
  var escala = 1;

  // Glosario de términos técnicos (textos en datos.js). Cada término se
  // presenta con una burbuja de una línea la primera vez que aparece en
  // pantalla; después queda subrayado y se puede volver a abrir con clic.
  var GLOSARIO = {
    margen: T.tooltipMargen,
    cargaUtil: T.tooltipCargaUtil,
    autonomia: T.tooltipAutonomia,
    reserva: T.tooltipReserva
  };
  var vistos = {};           // términos cuya burbuja de primera vez ya se cerró
  var terminoAbierto = null; // término reabierto a mano con clic

  /* ---------------- paleta y sprites ---------------- */

  var PAL = {
    cielo: '#0b1026', cieloBanda: '#121a3e', estrella: '#dce9f8',
    nieve: '#8fa3cc', nieveClaro: '#cfe0f4', nieveMedio: '#a8b8d8',
    contorno: '#5a6fa0', pozo: '#232c4e',
    F: '#f2f5fb', V: '#2e3a5c', A: '#e4a33c',          // astronauta
    B: '#b8893f', D: '#e8d9a8',                         // módulo
    W: '#e8f1fb', L: '#9fb6dd', Tt: '#5a6fa0',          // cristal
    R: '#e05c5c', G: '#8fa3cc', g: '#46557e', l: '#8fa3cc',
    N: '#d8e0ee', f: '#f2b544'                          // nave, llama
  };

  var SPR_ASTRO = [
    '..FFF..',
    '.FVVVF.',
    '.FVVVF.',
    '..FFF..',
    '.FFFFF.',
    'FAFFFAF',
    'F.FFF.F',
    '..FFF..',
    '..F.F..',
    '..F.F..',
    '.FF.FF.'
  ];

  var SPR_MODULO = [
    '....BBBBBB....',
    '..BBDDDDDDBB..',
    '.BDDDVVVVDDDB.',
    '.BDDDVVVVDDDB.',
    '.BBBBBBBBBBBB.',
    '..B..BBBB..B..',
    '..B..B..B..B..',
    '.BB..B..B..BB.',
    'B..B.B..B.B..B'
  ];

  var SPR_CRISTAL = [
    '...W...',
    '..WLW..',
    '..WLW..',
    '.WLLLW.',
    '.WLLLW.',
    'WLLLLLW',
    'WLLLLLW',
    '...T...',
    '...T...'
  ];

  var SPR_MUESTRA = [
    'RRRR..',
    'RRRRR.',
    'RRRR..',
    'R.....',
    'R.....',
    'R.....',
    'R.....',
    'GG.GG.'
  ];

  var SPR_ROCA = [
    '..ll..',
    '.lggl.',
    'lggggl',
    'gggggg'
  ];

  var SPR_COHETE = [
    '...RR...',
    '..RNNR..',
    '..NNNN..',
    '..NVVN..',
    '..NVVN..',
    '..NNNN..',
    '..NNNN..',
    '..NNNN..',
    '..NNNN..',
    '..NNNN..',
    '.RNNNNR.',
    'RRNNNNRR',
    'RR.NN.RR'
  ];

  var SPR_LLAMA = [
    '..ff..',
    '.ffff.',
    '..ff..',
    '...f..'
  ];

  function pint(ctx, filas, x, y, mapa) {
    for (var r = 0; r < filas.length; r++) {
      for (var c = 0; c < filas[r].length; c++) {
        var ch = filas[r][c];
        if (ch === '.') continue;
        var color = (mapa && mapa[ch]) || PAL[ch] || PAL[ch === 'T' ? 'Tt' : ch];
        if (ch === 'T') color = PAL.Tt;
        if (ch === 'g') color = PAL.g;
        if (ch === 'l') color = PAL.l;
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x + c, y + r, 1, 1);
      }
    }
  }

  function estrellas(ctx, ancho, alto, n) {
    ctx.fillStyle = PAL.estrella;
    for (var i = 0; i < n; i++) {
      var x = (i * 53 + 11) % ancho;
      var y = (i * 37 + 5) % alto;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /* ---------------- escenas ---------------- */

  function dibujarSuperficie() {
    var cv = document.getElementById('cv-sup');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var Wd = cv.width, Hd = cv.height, SUELO = 64;

    ctx.fillStyle = PAL.cielo; ctx.fillRect(0, 0, Wd, SUELO);
    ctx.fillStyle = PAL.cieloBanda; ctx.fillRect(0, SUELO - 18, Wd, 18);
    estrellas(ctx, Wd, SUELO - 20, 42);

    ctx.fillStyle = PAL.nieve; ctx.fillRect(0, SUELO, Wd, Hd - SUELO);
    ctx.fillStyle = PAL.nieveClaro; ctx.fillRect(0, SUELO, Wd, 2);
    ctx.fillStyle = PAL.nieveMedio;
    for (var i = 0; i < 60; i++) {
      ctx.fillRect((i * 41 + 7) % Wd, SUELO + 6 + ((i * 17) % (Hd - SUELO - 10)), 2, 1);
    }

    // cristales decorativos al fondo
    [14, 150, 305].forEach(function (x) { pint(ctx, SPR_CRISTAL, x, SUELO - 9); });

    var sitios = estado.sitios || [];
    var n = sitios.length - 1;
    if (n < 1) return;
    var x0 = 26, x1 = 290;
    function xDe(p) { return Math.round(x0 + (x1 - x0) * p / n); }

    for (var p = 0; p <= n; p++) {
      var s = sitios[p];
      var x = xDe(p);
      ctx.fillStyle = PAL.contorno;
      ctx.fillRect(x, SUELO + 3, 2, 2); // marca del paso
      if (s.tipo === 'crater') {
        ctx.fillStyle = PAL.pozo;
        ctx.fillRect(x - 10, SUELO + 2, 22, 7);
        ctx.fillRect(x - 7, SUELO + 9, 16, 3);
        ctx.fillStyle = PAL.nieveClaro;
        ctx.fillRect(x - 12, SUELO, 4, 2); ctx.fillRect(x + 10, SUELO, 4, 2);
        if (s.vetaRevelada && !s.vetaExtraida) {
          ctx.fillStyle = PAL.A; ctx.fillRect(x, SUELO + 6, 2, 2);
        }
      }
      if (s.tipo === 'muestra' && !s.recogida) pint(ctx, SPR_MUESTRA, x - 2, SUELO - 8);
      if (s.rocoso && s.tipo !== 'modulo') pint(ctx, SPR_ROCA, x - 3, SUELO - 4);
      if (s.tipo === 'modulo') pint(ctx, SPR_MODULO, x - 7, SUELO - 9);
    }

    pint(ctx, SPR_ASTRO, xDe(estado.posicion) - 3, SUELO - 11 - 4);
  }

  function dibujarViaje() {
    var cv = document.getElementById('cv-viaje');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var Wd = cv.width, Hd = cv.height;

    ctx.fillStyle = PAL.cielo; ctx.fillRect(0, 0, Wd, Hd);
    estrellas(ctx, Wd, Hd, 60);

    // planeta helado
    var cxp = 262, cyp = 48, rp = 30;
    ctx.fillStyle = PAL.nieve;
    for (var y = -rp; y <= rp; y++) {
      var half = Math.floor(Math.sqrt(rp * rp - y * y));
      ctx.fillRect(cxp - half, cyp + y, half * 2, 1);
    }
    ctx.fillStyle = PAL.nieveClaro;
    ctx.fillRect(cxp - 18, cyp - 22, 14, 3); ctx.fillRect(cxp - 24, cyp - 14, 8, 2);
    ctx.fillStyle = PAL.pozo;
    ctx.fillRect(cxp + 6, cyp + 2, 8, 4); ctx.fillRect(cxp - 8, cyp + 12, 6, 3);

    // trayectorias punteadas
    function punteada(y2, color) {
      ctx.fillStyle = color;
      for (var t = 0; t <= 20; t++) {
        if (t % 2) continue;
        var x = 70 + (cxp - 34 - 70) * t / 20;
        var yy = 50 + (y2 - 50) * t / 20;
        ctx.fillRect(Math.round(x), Math.round(yy), 2, 1);
      }
    }
    if (estado.viaje.escaneado && !estado.viaje.decidido) {
      punteada(cyp - 16, PAL.estrella); // mantener (zona actual)
      punteada(cyp + 16, PAL.A);        // corregir (otra zona)
    } else {
      punteada(cyp - 16 + (estado.viaje.corrigio ? 32 : 0), PAL.estrella);
    }

    pint(ctx, SPR_COHETE, 58, 40);
    pint(ctx, SPR_LLAMA, 48, 44);
  }

  function dibujarMapa() {
    var cv = document.getElementById('cv-mapa');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var Wd = cv.width, Hd = cv.height;

    ctx.fillStyle = PAL.cielo; ctx.fillRect(0, 0, Wd, Hd);
    estrellas(ctx, Wd, 12, 14);

    // terreno visto desde arriba
    ctx.fillStyle = PAL.nieve; ctx.fillRect(4, 14, Wd - 8, Hd - 18);
    ctx.fillStyle = PAL.nieveClaro; ctx.fillRect(4, 14, Wd - 8, 2);
    ctx.fillStyle = PAL.nieveMedio;
    for (var i = 0; i < 26; i++) {
      ctx.fillRect(6 + (i * 29 + 3) % (Wd - 14), 18 + (i * 13) % (Hd - 26), 2, 1);
    }

    // cráter (este del mapa)
    var cx = 94, cy = 40;
    ctx.fillStyle = PAL.pozo;
    ctx.fillRect(cx - 9, cy - 5, 18, 10); ctx.fillRect(cx - 6, cy - 8, 12, 16);
    ctx.fillStyle = PAL.nieveClaro;
    ctx.fillRect(cx - 11, cy - 7, 3, 2); ctx.fillRect(cx + 8, cy + 5, 3, 2);

    // muestras superficiales de la llanura
    [[40, 34], [58, 46]].forEach(function (par) {
      pint(ctx, SPR_MUESTRA, par[0], par[1] - 7);
    });

    var marcadores = { llanura: [22, 44], crater: [74, 52] };
    var zona = estado.zonaAterrizaje;
    var origen = marcadores[zona];

    // ruta punteada hacia el objetivo
    var destino = estado.objetivo === 'crater_profunda' ? [cx, cy] : [50, 40];
    ctx.fillStyle = PAL.A;
    for (var t = 0; t <= 14; t++) {
      if (t % 2) continue;
      ctx.fillRect(
        Math.round(origen[0] + 4 + (destino[0] - origen[0] - 4) * t / 14),
        Math.round(origen[1] - 2 + (destino[1] - origen[1]) * t / 14), 1, 1);
    }

    // marcadores de zona (el elegido lleva el cohete)
    Object.keys(marcadores).forEach(function (z) {
      var par = marcadores[z];
      if (z === zona) {
        pint(ctx, SPR_COHETE, par[0] - 4, par[1] - 13);
      } else {
        ctx.fillStyle = PAL.contorno;
        ctx.fillRect(par[0] - 1, par[1] - 4, 2, 4);
        ctx.fillRect(par[0] - 3, par[1] - 1, 6, 2);
      }
    });
  }

  /* ---------------- componentes HTML ---------------- */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function barra(icono, etiqueta, valor, max, clase) {
    var pct = max > 0 ? Math.max(0, Math.min(100, valor / max * 100)) : 0;
    return '<div class="barra ' + (clase || '') + '">' +
      '<span class="b-icono">' + icono + '</span>' +
      '<div class="b-pista"><div class="b-relleno" style="width:' + pct + '%"></div></div>' +
      '<span class="b-num">' + etiqueta + ' ' + valor + '/' + max + '</span></div>';
  }

  function boton(accion, texto, opciones) {
    opciones = opciones || {};
    return '<button class="btn ' + (opciones.clase || '') + '" data-a="' + accion + '"' +
      (opciones.x ? ' data-x="' + opciones.x + '"' : '') +
      (opciones.off ? ' disabled' : '') +
      (opciones.title ? ' title="' + esc(opciones.title) + '"' : '') +
      '>[ ' + texto + ' ]</button>';
  }

  // "6 pasos × 5 Wh + 3 rocosos × 3 Wh + 5 Wh de subida": la fórmula de un
  // tramo tal como la calcula el motor.
  function formulaTramo(c) {
    var partes = [c.pasos + ' paso(s) × ' + C.pasoEnergia + ' Wh'];
    if (c.recargo) partes.push(c.pasosRocosos + ' rocoso(s) × ' + c.recargoUnitario + ' Wh');
    if (c.salida) partes.push(c.salida + ' Wh de subida');
    return partes.join(' + ');
  }

  // Desglose de una opción del viaje con lo que llevas a bordo.
  function desgloseOpcion(d) {
    var e = estado.recursos.energiaWh;
    var sobra = e - d.energia.total;
    return '<p class="dato">Ida ' + d.energia.ida + ' (' + formulaTramo(d.componentes.ida) + ') · ' +
      d.tareaNombre.toLowerCase() + ' ' + d.energia.tarea + ' · regreso ' + d.energia.regreso + ' (' + formulaTramo(d.componentes.regreso) + ')</p>' +
      '<p class="dato">Llevas ' + e + ' Wh → ' + (sobra >= 0 ? '<b class="ok">sobran ' + sobra + ' ✓</b>' : '<b class="alerta">faltan ' + (-sobra) + ' ✖</b>') +
      ' · O₂ ' + d.oxigeno.total + ' de ' + estado.recursos.oxigeno + '</p>';
  }

  function termino(clave, etiqueta) {
    return '<span class="termino" data-a="termino" data-x="' + clave + '" title="' + esc(GLOSARIO[clave]) + '">' + etiqueta + '</span>';
  }

  // Coloca la burbuja del glosario: la del término reabierto con clic o, si
  // no hay, la del primer término en pantalla que aún no se presentó.
  function colocarGlosario() {
    var terminos = juego.querySelectorAll('.termino');
    var objetivo = null;
    for (var i = 0; i < terminos.length; i++) {
      var clave = terminos[i].getAttribute('data-x');
      if (terminoAbierto ? clave === terminoAbierto : !vistos[clave]) { objetivo = terminos[i]; break; }
    }
    if (!objetivo) return;
    var k = objetivo.getAttribute('data-x');
    var burbuja = document.createElement('div');
    burbuja.className = 'burbuja';
    burbuja.setAttribute('role', 'note');
    burbuja.innerHTML = '<p>ⓘ ' + esc(GLOSARIO[k]) + '</p>' + boton('entendido', T.btnEntendido, { x: k, clase: 'mini' });
    juego.appendChild(burbuja);
    // Anclaje: si el término está en la mitad izquierda, la burbuja cuelga
    // hacia la izquierda (tapa menos botones); si no, hacia la derecha.
    var rj = juego.getBoundingClientRect();
    var rt = objetivo.getBoundingClientRect();
    var ANCHO = 330;
    var izq = (rt.left - rj.left) / escala;
    var der = (rt.right - rj.left) / escala;
    var haciaIzquierda = (izq + der) / 2 < 640;
    var left = haciaIzquierda ? der - ANCHO : izq;
    var top = (rt.bottom - rj.top) / escala + 8;
    left = Math.max(8, Math.min(left, 1280 - ANCHO - 8));
    if (top > 720 - 110) top = (rt.top - rj.top) / escala - 100;
    if (haciaIzquierda) burbuja.classList.add('derecha');
    burbuja.style.left = left + 'px';
    burbuja.style.top = top + 'px';
  }

  // Tres barras que se quitan entre sí. Con controles, cada [ + ] toma 5 Wh
  // de la exploración (o del regreso, si el tramo es la exploración) y cada
  // [ − ] se los devuelve. Es una convención de la interfaz: el motor solo
  // sabe mover energía de un tramo a otro.
  function parReserva(tramo) { return tramo === 'exploracion' ? 'regreso' : 'exploracion'; }

  function htmlReserva(ev, total, controles) {
    var html = '<div class="reserva" title="' + esc(T.tooltipReserva) + '">';
    ['ida', 'exploracion', 'regreso'].forEach(function (t) {
      var f = ev[t];
      var clase = f.faltaNormal > 0 ? 'rojo' : (f.faltaAdverso > 0 ? 'ambar' : 'ok');
      var icono = f.faltaNormal > 0 ? '✖' : (f.faltaAdverso > 0 ? '⚠' : '✓');
      var pct = total > 0 ? Math.round(f.reservado / total * 100) : 0;
      html += '<div class="reserva-fila ' + clase + '">' +
        '<span class="etq">' + T.tramos[t] + '</span>' +
        (controles ? boton('reserva', '−', { x: t + ':-', clase: 'mini cuadrado', off: f.reservado < C.pasoReserva, title: 'Devuelve ' + C.pasoReserva + ' Wh a ' + T.tramos[parReserva(t)].toLowerCase() }) : '') +
        '<div class="b-pista"><div class="b-relleno" style="width:' + pct + '%"></div></div>' +
        (controles ? boton('reserva', '+', { x: t + ':+', clase: 'mini cuadrado', off: ev[parReserva(t)].reservado < C.pasoReserva, title: 'Toma ' + C.pasoReserva + ' Wh de ' + T.tramos[parReserva(t)].toLowerCase() }) : '') +
        '<span class="num"><b>' + f.reservado + '</b> Wh · estima ' + f.normal + ' / rocoso ' + f.adverso + ' ' + icono + '</span></div>';
    });
    return html + '</div>';
  }

  /* ---------------- pantallas ---------------- */

  function htmlIntro() {
    return '<div class="centro"><div class="panel intro">' +
      '<h1 class="titulo-grande">' + T.titulo + '</h1>' +
      '<p class="subtitulo">NASA Space Apps Challenge · Juego de diseño de misiones</p>' +
      '<p class="pregunta">«' + T.pregunta + '»</p>' +
      '<p class="nota">' + T.ficcion + '</p>' +
      boton('comenzar', 'COMENZAR', { clase: 'grande' }) +
      '</div></div>';
  }

  function htmlHangar() {
    var t = Motor.totales(estado);
    var r = Motor.recomendacion(estado);
    var m = DATOS.mapa[estado.zonaAterrizaje];
    var o = DATOS.objetivos[estado.objetivo];
    var pasos = Motor.pasoObjetivo(estado.zonaAterrizaje, estado.objetivo);
    var ev = Motor.evaluarReserva(estado);

    var html = '<header class="cabecera">' +
      barra('🪙', 'Presupuesto', estado.presupuesto.gastado, estado.presupuesto.total,
        estado.presupuesto.gastado > estado.presupuesto.total ? 'rojo' : '') +
      barra('⚖', termino('cargaUtil', 'Carga útil'), estado.masa.usada, estado.masa.capacidad || 0,
        estado.masa.usada > estado.masa.capacidad ? 'rojo' : '') +
      '<div class="chips"><span class="chip">⚡ ' + t.energia + ' Wh</span>' +
      '<span class="chip">◍ ' + t.oxigeno + ' O₂</span>' +
      '<span class="chip">▲ ' + t.combustible + ' comb.</span>' +
      '<span class="chip">▣ ' + t.capacidadMuestras + ' muestras</span></div>' +
      '</header>';

    html += '<main class="hangar">';

    // --- panel objetivo y mapa ---
    html += '<section class="panel"><h2>1 · OBJETIVO Y MAPA</h2>' +
      '<canvas id="cv-mapa" width="120" height="70"></canvas>' +
      '<div class="fila-botones">' +
      boton('zona', 'LLANURA', { x: 'llanura', clase: estado.zonaAterrizaje === 'llanura' ? 'activo' : '' }) +
      boton('zona', 'CRÁTER', { x: 'crater', clase: estado.zonaAterrizaje === 'crater' ? 'activo' : '' }) +
      '</div><div class="fila-botones">' +
      boton('objetivo', '2 SUPERFICIALES', { x: 'llanura_doble', clase: estado.objetivo === 'llanura_doble' ? 'activo' : '' }) +
      boton('objetivo', '1 PROFUNDA', { x: 'crater_profunda', clase: estado.objetivo === 'crater_profunda' ? 'activo' : '' }) +
      '</div>' +
      '<p class="dato">Ida ' + pasos + ' pasos · vuelta ' + pasos + ' pasos</p>' +
      '<p class="dato">' + esc(m.nota) + '</p>' +
      '<p class="dato">Exige: ' + esc(o.herramienta) +
      (estado.objetivo === 'crater_profunda' && !t.taladro ? ' <span class="alerta">⚠ sin taladro</span>' : '') +
      (t.capacidadMuestras < o.espacioMinimo ? ' <span class="alerta">⚠ falta espacio</span>' : '') +
      '</p></section>';

    // --- panel cohete y equipo ---
    html += '<section class="panel"><h2>2 · COHETE Y EQUIPO</h2><div class="lista">';
    DATOS.cohetes.forEach(function (co) {
      var activo = estado.cohete === co.id;
      html += '<div class="item' + (activo ? ' elegido' : '') + '" title="' + esc(co.descripcion) + '">' +
        '<span class="i-icono">🚀</span><span class="i-nombre">' + co.nombre + '</span>' +
        '<span class="i-datos">' + co.costo + '🪙 · cap ' + co.capacidadMasa + '⚖ · ' + co.combustibleBase + '▲</span>' +
        boton('cohete', activo ? 'ELEGIDO' : 'ELEGIR', { x: co.id, off: activo, clase: 'mini' }) + '</div>';
    });
    DATOS.objetos.forEach(function (ob) {
      var puesto = estado.equipo.indexOf(ob.id) !== -1;
      html += '<div class="item' + (puesto ? ' elegido' : '') + '" title="' + esc(ob.descripcion) + '">' +
        '<span class="i-icono">' + ob.icono + '</span><span class="i-nombre">' + ob.nombre + '</span>' +
        '<span class="i-datos">' + ob.costo + '🪙 · ' + ob.masa + '⚖</span>' +
        (puesto ? boton('quitar', T.btnQuitar, { x: ob.id, clase: 'mini' })
                : boton('equipar', T.btnEquipar, { x: ob.id, clase: 'mini' })) + '</div>';
    });
    html += '</div></section>';

    // --- panel recursos y simulador ---
    var margen = t.energia - r.normal.energia.total;
    html += '<section class="panel"><h2>3 · RECURSOS Y SIMULADOR</h2>' +
      '<p class="dato">' + termino('autonomia', 'Autonomía') + ' en superficie (energía y oxígeno):</p>' +
      '<table class="tabla"><tr><th></th><th>Llevas</th><th>Estimado</th><th>Recomendado</th></tr>' +
      '<tr><td>⚡ Energía</td><td>' + t.energia + '</td><td>' + r.normal.energia.total + '</td><td>' + r.energiaRecomendada + '</td></tr>' +
      '<tr><td>◍ Oxígeno</td><td>' + t.oxigeno + '</td><td>' + r.normal.oxigeno.total + '</td><td>' + r.oxigenoRecomendado + '</td></tr>' +
      '<tr><td>▲ Comb.</td><td>' + t.combustible + '</td><td>0</td><td>' + C.maniobra + '</td></tr></table>' +
      '<p class="dato">' + termino('margen', 'Margen') + ' de energía: <b class="' +
      (margen < 0 ? 'alerta' : (t.energia > 0 && margen < r.adverso.energia.total - r.normal.energia.total ? 'ambar' : 'ok')) + '">' +
      margen + ' Wh</b> ' + (margen < 0 ? '✖' : (margen < r.adverso.energia.total - r.normal.energia.total ? '⚠' : '✓')) + '</p>' +
      '<p class="dato">' + termino('reserva', 'Reserva') + ' por tramos' + (ev.manual ? '' : ' (automática: estimación normal, el resto a explorar)') + ':</p>' +
      htmlReserva(ev, t.energia, false) +
      '<div class="fila-botones">' +
      boton('vercalculo', T.btnVerCalculo) + boton('reservar', T.btnReservar) + boton('probar', T.btnProbar) +
      '</div>' +
      '<div class="fila-botones">' + boton('lanzar', T.btnLanzar, { clase: 'grande peligro' }) + '</div>' +
      '<p class="nota">' + T.ficcion + '</p>' +
      '</section>';

    html += '</main>';
    html += '<footer class="consola">▸ ' + esc(mensaje) + '</footer>';
    return html;
  }

  function htmlViaje() {
    var html = '<header class="cabecera">' +
      barra('⚡', 'Energía', estado.recursos.energiaWh, estado.plan.energiaInicial) +
      barra('◍', 'Oxígeno', estado.recursos.oxigeno, estado.plan.oxigenoInicial) +
      barra('▲', 'Combustible', estado.recursos.combustible, estado.plan.combustibleInicial,
        estado.recursos.combustible < C.maniobra ? 'ambar' : '') +
      '</header>';

    // 320×84 a escala 4 = 1280×336: deja sitio a las dos tarjetas del evento
    // con su desglose y a la consola sin salirse del marco de 720 px.
    html += '<canvas id="cv-viaje" width="320" height="84" class="escena escena-viaje"></canvas>';

    if (!estado.viaje.escaneado) {
      html += '<div class="banda"><p>En ruta hacia el planeta. El protocolo pide un último escaneo antes del descenso.</p>' +
        '<div class="fila-botones">' + boton('escanearviaje', T.btnEscanear, { clase: 'grande' }) + '</div></div>';
    } else if (!estado.viaje.decidido) {
      var p = Motor.proyeccionesViaje(estado);
      html += '<div class="banda evento"><p>⚠ ' + T.eventoViaje + '</p><div class="comparar">' +
        '<div class="opcion"><h3>MANTENER · ' + DATOS.mapa[p.mantener.zona].nombre + '</h3>' +
        '<p>Recorrido con terreno rocoso: <b>' + p.mantener.d.energia.total + ' Wh</b></p>' +
        desgloseOpcion(p.mantener.d) +
        '<p>Combustible: se conserva</p>' +
        boton('mantener', T.btnMantener) + '</div>' +
        '<div class="opcion"><h3>CORREGIR · ' + DATOS.mapa[p.corregir.zona].nombre + '</h3>' +
        '<p>Recorrido estimado: <b>' + p.corregir.d.energia.total + ' Wh</b></p>' +
        desgloseOpcion(p.corregir.d) +
        '<p>Combustible: −' + p.corregir.combustible + ' (tienes ' + estado.recursos.combustible + ')</p>' +
        boton('corregir', T.btnCorregir, p.corregir.posible ? {} : { off: true, title: 'Sin combustible suficiente: no reservaste margen para esta maniobra.' }) +
        (p.corregir.posible ? '' : '<p class="alerta">✖ No disponible: falta combustible</p>') +
        '</div></div></div>';
    } else {
      html += '<div class="banda"><p>Trayectoria decidida hacia ' + DATOS.mapa[estado.zonaAterrizaje].nombre + '.</p>' +
        '<div class="fila-botones">' + boton('descender', T.btnDescender, { clase: 'grande' }) + '</div></div>';
    }
    html += '<footer class="consola">▸ ' + esc(mensaje) + '</footer>';
    return html;
  }

  function htmlSuperficie() {
    var t = Motor.totales(estado);
    var reg = Motor.costoRegreso(estado);
    var okE = estado.recursos.energiaWh >= reg.energia;
    var okO = estado.recursos.oxigeno >= reg.oxigeno;
    var margenE = estado.recursos.energiaWh - reg.energia;
    var ambar = okE && okO && (margenE < Math.max(1, estado.recursos.energiaWh) * C.umbralAmbar ||
      (estado.recursos.oxigeno - reg.oxigeno) < estado.recursos.oxigeno * C.umbralAmbar);
    var claseReg = (!okE || !okO) ? 'rojo' : (ambar ? 'ambar' : 'ok');
    var iconoReg = (!okE || !okO) ? '✖' : (ambar ? '⚠' : '✓');

    var s = Motor.sitioActual(estado);
    var libres = Motor.capacidadLibre(estado);

    var html = '<header class="cabecera">' +
      barra('⚡', 'Energía', estado.recursos.energiaWh, estado.plan.energiaInicial) +
      barra('◍', 'Oxígeno', estado.recursos.oxigeno, estado.plan.oxigenoInicial) +
      '<div class="chips"><span class="chip">▣ ' + estado.muestras.recogidas.length + '/' + t.capacidadMuestras + ' muestras</span>' +
      '<span class="chip chip-reg clicable ' + claseReg + '" data-a="verregreso" title="' + esc(T.regresoEstimado) + '. Clic para ver de dónde sale.">' + iconoReg + ' Regreso: ' +
      reg.energia + ' Wh · ' + reg.oxigeno + ' O₂ ⓘ</span>' +
      (estado.plan.reserva
        ? '<span class="chip ' + (estado.recursos.energiaWh >= estado.plan.reserva.regreso ? 'ok' : 'ambar') + '" title="' + esc(T.tooltipReserva) + '">' +
          (estado.recursos.energiaWh >= estado.plan.reserva.regreso ? '✓' : '⚠') + ' Reserva regreso ' + estado.plan.reserva.regreso + ' Wh</span>'
        : '') +
      '</div></header>';

    html += '<canvas id="cv-sup" width="320" height="110" class="escena"></canvas>';

    html += '<div class="banda"><div class="fila-botones">' +
      boton('retroceder', '◀ ' + T.btnRetroceder, { off: estado.posicion === 0, title: 'Un paso hacia el módulo' }) +
      boton('avanzar', T.btnAvanzar + ' ▶', { off: estado.posicion >= estado.sitios.length - 1, title: 'Un paso explorando (sube el costo de regreso)' }) +
      boton('escanearsup', T.btnEscanear, t.escaner ? { title: C.escanearSup + ' Wh' } : { off: true, title: 'No llevas escáner de terreno' }) +
      boton('recoger', T.btnRecoger, (s.tipo === 'muestra' && !s.recogida && libres > 0) ? { title: C.recoger + ' Wh' } : { off: true, title: 'Necesitas estar sobre una muestra y tener espacio' }) +
      boton('perforar', T.btnPerforar, (s.tipo === 'crater' && t.taladro && (!s.perforada || (s.vetaRevelada && !s.vetaExtraida)) && libres > 0) ? { title: (s.perforada ? C.veta : C.perforar) + ' Wh' } : { off: true, title: 'Exige estar en el cráter, llevar taladro y tener espacio' }) +
      boton('regresar', T.btnRegresar, { clase: 'peligro', title: 'Vuelve al módulo y entrega las muestras' }) +
      '</div></div>';

    html += '<footer class="consola">▸ ' + esc(mensaje) + '</footer>';
    return html;
  }

  function htmlInforme() {
    var inf = Motor.generarInforme(estado);
    var clase = inf.resultado === 'exito' ? 'ok' : inf.resultado === 'parcial' ? 'ambar' : 'alerta';

    var html = '<div class="centro"><div class="panel informe">' +
      '<h1 class="' + clase + '">' + inf.titulo + '</h1>';

    inf.causal.forEach(function (fr) { html += '<p class="causal">' + esc(fr) + '</p>'; });

    html += '<div class="dos-columnas"><div><h3>PLAN vs REAL (energía)</h3><table class="tabla">' +
      '<tr><th></th><th>Plan</th><th>Real</th></tr>' +
      '<tr><td>Total Wh</td><td>' + inf.plan.totalPrevisto + '</td><td>' + inf.consumido.energiaWh + '</td></tr>' +
      '<tr><td>Margen</td><td>' + inf.plan.margenReservado + '</td><td>' + (inf.plan.energiaInicial - inf.consumido.energiaWh) + '</td></tr>' +
      '<tr><td>O₂ usado</td><td>—</td><td>' + inf.consumido.oxigeno + '</td></tr>' +
      '<tr><td>Comb. usado</td><td>—</td><td>' + inf.consumido.combustible + '</td></tr></table>' +
      (inf.reserva
        ? '<h3>POR TRAMO (Wh)</h3><table class="tabla"><tr><th></th><th>Reservado</th><th>Real</th></tr>' +
          ['ida', 'exploracion', 'regreso'].map(function (t) {
            var sobre = inf.porTramo[t] > inf.reserva[t];
            return '<tr><td>' + T.tramos[t] + '</td><td>' + inf.reserva[t] + '</td><td class="' + (sobre ? 'alerta' : '') + '">' + inf.porTramo[t] + (sobre ? ' ✖' : '') + '</td></tr>';
          }).join('') + '</table>'
        : '') +
      '<h3>MUESTRAS ENTREGADAS</h3>' +
      (inf.entregadas.length
        ? '<ul>' + inf.entregadas.map(function (x) { return '<li>▣ ' + esc(x.nombre) + '</li>'; }).join('') + '</ul>'
        : '<p class="alerta">Ninguna' + (inf.recogidasNoEntregadas.length ? ' (las ' + inf.recogidasNoEntregadas.length + ' recogidas se quedaron en el terreno)' : '') + '.</p>') +
      '</div><div><h3>CADENA DE DECISIONES</h3><ul class="historial">';

    inf.historial.slice(-8).forEach(function (h) {
      html += '<li><b>' + esc(h.decision) + '</b><br>→ ' + esc(h.efecto) + '</li>';
    });

    html += '</ul></div></div><div class="fila-botones">' +
      boton('repetir', T.btnRepetir, { clase: 'grande' }) +
      boton('nueva', T.btnNueva) +
      '</div></div></div>';
    return html;
  }

  /* ---------------- modales ---------------- */

  function htmlModal() {
    if (!modal) return '';
    var inner = '';
    if (modal === 'calculo') {
      var n = Motor.desglose(estado.zonaAterrizaje, estado.objetivo, false);
      var a = Motor.desglose(estado.zonaAterrizaje, estado.objetivo, true);
      var r = Motor.recomendacion(estado);
      inner = '<h2>DE DÓNDE SALE LA RECOMENDACIÓN</h2>' +
        '<p>Ida: ' + formulaTramo(n.componentes.ida) + ' = <b>' + n.energia.ida + ' Wh</b></p>' +
        '<p>Tarea (' + n.tareaNombre + '): <b>' + n.energia.tarea + ' Wh</b></p>' +
        '<p>Regreso: ' + formulaTramo(n.componentes.regreso) + ' = <b>' + n.energia.regreso + ' Wh</b></p>' +
        '<p>Total previsto: <b>' + n.energia.total + ' Wh</b></p><hr>' +
        '<p>Si el terreno resulta rocoso: ida +' + a.componentes.ida.recargo + ' (' + a.componentes.ida.pasosRocosos + ' rocoso(s) × ' + a.componentes.ida.recargoUnitario + ' Wh) · regreso +' +
        a.componentes.regreso.recargo + ' (' + a.componentes.regreso.pasosRocosos + ' × ' + a.componentes.regreso.recargoUnitario + ' Wh) → <b>' + a.energia.total + ' Wh</b></p>' +
        '<p>Recomendación: ' + a.energia.total + ' + ' + Math.round(C.margenRecomendado * 100) + ' % de margen = <b>' + r.energiaRecomendada + ' Wh</b></p>' +
        '<p class="nota">Oxígeno: ' + n.oxigeno.total + ' O₂ previsto · recomendado ' + r.oxigenoRecomendado + ' O₂</p>';
    } else if (modal === 'probar') {
      var pr = Motor.probar(estado);
      var evp = Motor.evaluarReserva(estado);
      function col(nombre, ev, adverso) {
        var filas = ['ida', 'exploracion', 'regreso'].map(function (t) {
          var f = evp[t];
          var necesita = adverso ? f.adverso : f.normal;
          var falta = adverso ? f.faltaAdverso : f.faltaNormal;
          return '<p class="' + (falta > 0 ? 'alerta' : '') + '">' + T.tramos[t] + ': reserva ' + f.reservado + ' · necesita ' + necesita +
            (falta > 0 ? ' ✖ faltan ' + falta : ' ✓') + '</p>';
        }).join('');
        return '<div class="opcion"><h3>' + nombre + '</h3>' + filas +
          '<p>Total: necesitas <b>' + ev.desglose.energia.total + ' Wh</b> · llevas ' + pr.llevas.energia + ' Wh</p>' +
          '<p>Margen: <b class="' + (ev.margenEnergia < 0 ? 'alerta' : 'ok') + '">' + ev.margenEnergia + ' Wh ' + (ev.margenEnergia < 0 ? '✖ falta' : '✓') + '</b></p>' +
          '<p>Oxígeno: ' + ev.desglose.oxigeno.total + ' de ' + pr.llevas.oxigeno + ' <b class="' + (ev.margenOxigeno < 0 ? 'alerta' : 'ok') + '">' + (ev.margenOxigeno < 0 ? '✖' : '✓') + '</b></p>' +
          '</div>';
      }
      inner = '<h2>PROYECCIÓN EN SECO</h2><div class="comparar">' +
        col('ESCENARIO NORMAL', pr.normal, false) + col('ESCENARIO ADVERSO', pr.adverso, true) +
        '</div><p class="nota">El escenario adverso supone terreno rocoso en la zona elegida. En rojo, el tramo cuya reserva no alcanza. Ninguna de las soluciones es «la correcta»: más batería cuesta masa; aterrizar más cerca es más incierto.</p>';
    } else if (modal === 'regreso') {
      var dr = Motor.desgloseRegreso(estado);
      var ce = dr.energia;
      function veredicto(sobra, unidad) {
        return '<b class="' + (sobra < 0 ? 'alerta' : 'ok') + '">' + (sobra < 0 ? 'faltan ' + (-sobra) + ' ' + unidad + ' ✖' : 'sobran ' + sobra + ' ' + unidad + ' ✓') + '</b>';
      }
      inner = '<h2>DE DÓNDE SALE EL REGRESO</h2>';
      if (ce.pasos === 0) {
        inner += '<p>Estás en el módulo: volver no cuesta nada. Pulsa REGRESAR para entregar las muestras.</p>';
      } else {
        inner += '<p>Del paso ' + dr.desde + ' al módulo: ' + ce.pasos + ' paso(s) × ' + C.pasoEnergia + ' Wh = <b>' + ce.base + ' Wh</b></p>' +
          (ce.pasosRocosos
            ? '<p>Terreno rocoso: ' + ce.pasosRocosos + ' paso(s) × +' + ce.recargoUnitario + ' Wh = <b>+' + ce.recargo + ' Wh</b></p>'
            : (dr.rocoso ? '<p>Terreno rocoso: ningún paso rocoso queda en este tramo.</p>' : '')) +
          (ce.salida ? '<p>Salir del cráter (subida): <b>+' + ce.salida + ' Wh</b></p>' : '') +
          '<p>Total: <b>' + ce.total + ' Wh</b> · tienes ' + dr.tienes.energia + ' Wh → ' + veredicto(dr.sobra.energia, 'Wh') + '</p><hr>' +
          '<p>Oxígeno: ' + dr.oxigeno.pasos + ' paso(s) × ' + dr.oxigeno.unitario + ' = <b>' + dr.oxigeno.total + ' O₂</b> · tienes ' + dr.tienes.oxigeno + ' → ' + veredicto(dr.sobra.oxigeno, 'O₂') + '</p>';
      }
      inner += '<p class="nota">El indicador se recalcula tras cada acción. Lo que sobra es lo que puedes gastar en seguir explorando sin quedarte varado.</p>';
    } else if (modal === 'reservar') {
      var evr = Motor.evaluarReserva(estado);
      inner = '<h2>REPARTE LA ENERGÍA POR TRAMOS</h2>' +
        '<p>Llevas <b>' + evr.total + ' Wh</b>. Lo que no apartes para la ida o el regreso queda para explorar. ' +
        'Cada botón mueve ' + C.pasoReserva + ' Wh entre ese tramo y la exploración (la exploración los intercambia con el regreso).</p>' +
        htmlReserva(evr, evr.total, true) +
        '<div class="fila-botones">' + boton('reservarecomendado', T.btnRecomendado, { title: 'Reparte según el escenario adverso: primero el regreso, luego la ida, el resto a explorar.' }) + '</div>' +
        '<p class="nota">La reserva no bloquea nada en superficie: el juego avisa cuando entras en la de regreso y el informe compara lo reservado con lo consumido. LANZAR nunca se bloquea por reservar poco.</p>';
    }
    return '<div class="velo" data-a="cerrarmodal"><div class="panel modal">' + inner +
      '<div class="fila-botones">' + boton('cerrarmodal', 'CERRAR') + '</div></div></div>';
  }

  /* ---------------- acciones ---------------- */

  function manejar(a, x) {
    var r = null;
    // Cualquier acción que no sea abrir un término cierra la burbuja de
    // primera vez que estuviera en pantalla: ya se presentó.
    if (a !== 'termino') {
      var abierta = juego.querySelector('.burbuja [data-a="entendido"]');
      if (abierta) vistos[abierta.getAttribute('data-x')] = true;
      terminoAbierto = null;
    }
    switch (a) {
      case 'termino': terminoAbierto = (terminoAbierto === x ? null : x); break;
      case 'entendido': vistos[x] = true; break;
      case 'comenzar': intro = false; break;
      case 'zona': r = Motor.fijarZona(estado, x); break;
      case 'objetivo': r = Motor.fijarObjetivo(estado, x); break;
      case 'cohete': r = Motor.elegirCohete(estado, x); break;
      case 'equipar': r = Motor.equipar(estado, x); break;
      case 'quitar': r = Motor.quitar(estado, x); break;
      case 'vercalculo': modal = 'calculo'; break;
      case 'probar': modal = 'probar'; break;
      case 'reservar': modal = 'reservar'; break;
      case 'verregreso': modal = 'regreso'; break;
      case 'reserva': {
        var partes = (x || '').split(':');
        var tramo = partes[0], signo = partes[1];
        r = signo === '+' ? Motor.moverReserva(estado, parReserva(tramo), tramo)
                          : Motor.moverReserva(estado, tramo, parReserva(tramo));
        break;
      }
      case 'reservarecomendado': r = Motor.reservarRecomendado(estado); break;
      case 'cerrarmodal': modal = null; break;
      case 'lanzar': r = Motor.lanzar(estado); break;
      case 'escanearviaje': r = Motor.escanearViaje(estado); break;
      case 'corregir': r = Motor.corregir(estado); break;
      case 'mantener': r = Motor.mantener(estado); break;
      case 'descender': r = Motor.descender(estado); break;
      case 'avanzar': r = Motor.avanzar(estado, 1); break;
      case 'retroceder': r = Motor.avanzar(estado, -1); break;
      case 'escanearsup': r = Motor.escanearSuperficie(estado); break;
      case 'recoger': r = Motor.recoger(estado); break;
      case 'perforar': r = Motor.perforar(estado); break;
      case 'regresar': r = Motor.regresar(estado); break;
      case 'repetir':
        estado = Motor.repetirConPlan(estado);
        mensaje = 'De vuelta en la agencia: cambia UNA decisión y compara el resultado.';
        break;
      case 'nueva':
        estado = Motor.nuevoEstado();
        mensaje = 'Misión nueva. Todo por decidir.';
        break;
    }
    if (r && r.msg) mensaje = r.msg;
    render();
  }

  /* ---------------- render raíz ---------------- */

  function render() {
    var html;
    if (intro) html = htmlIntro();
    else if (estado.etapa === 'hangar') html = htmlHangar();
    else if (estado.etapa === 'viaje') html = htmlViaje();
    else if (estado.etapa === 'superficie') html = htmlSuperficie();
    else html = htmlInforme();
    juego.innerHTML = html + htmlModal();
    dibujarMapa();
    dibujarViaje();
    dibujarSuperficie();
    colocarGlosario();
  }

  function ajustarEscala() {
    escala = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    juego.style.transform = 'scale(' + escala + ')';
  }

  function iniciar() {
    juego = document.getElementById('juego');
    marco = document.getElementById('marco');
    juego.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      if (b.classList.contains('velo') && e.target !== b) return;
      manejar(b.getAttribute('data-a'), b.getAttribute('data-x'));
    });
    window.addEventListener('keydown', function (e) {
      if (estado.etapa !== 'superficie' || modal) return;
      if (e.key === 'ArrowRight') manejar('avanzar');
      if (e.key === 'ArrowLeft') manejar('retroceder');
    });
    window.addEventListener('resize', ajustarEscala);
    ajustarEscala();
    render();
  }

  return { iniciar: iniciar };
})();

document.addEventListener('DOMContentLoaded', UI.iniciar);

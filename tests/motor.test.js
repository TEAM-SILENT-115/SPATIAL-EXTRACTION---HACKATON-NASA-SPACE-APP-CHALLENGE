/* Pruebas del motor sin navegador: node tests/motor.test.js */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ctx = vm.createContext({ console: console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'datos.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'motor.js'), 'utf8'), ctx);

var Motor = ctx.Motor;
var DATOS = ctx.DATOS;
var fallos = 0;

function igual(nombre, real, esperado) {
  if (real === esperado) {
    console.log('  ok  ' + nombre + ' = ' + real);
  } else {
    fallos++;
    console.error('FALLO ' + nombre + ': se esperaba ' + esperado + ' y salió ' + real);
  }
}

function estadoCanonico() {
  var e = Motor.nuevoEstado();
  Motor.elegirCohete(e, 'halcon');
  Motor.equipar(e, 'bat100');
  Motor.equipar(e, 'o2chico');
  Motor.equipar(e, 'taladro');
  Motor.equipar(e, 'cont1');
  Motor.fijarObjetivo(e, 'crater_profunda');
  Motor.fijarZona(e, 'llanura');
  return e;
}

console.log('— Ejemplo canónico (batería 100 Wh, cráter desde la llanura) —');
var e = estadoCanonico();
var r = Motor.recomendacion(e);
igual('ida prevista', r.normal.energia.ida, 30);
igual('tarea prevista', r.normal.energia.tarea, 25);
igual('regreso previsto', r.normal.energia.regreso, 35);
igual('total previsto', r.normal.energia.total, 90);
igual('total adverso (terreno difícil)', r.adverso.energia.total, 108);
var p = Motor.probar(e);
igual('margen normal con 100 Wh', p.normal.margenEnergia, 10);
igual('faltante adverso con 100 Wh', p.adverso.margenEnergia, -8);

console.log('— Presupuesto y masa —');
igual('gastado', e.presupuesto.gastado, 300 + 150 + 100 + 200 + 60);
igual('masa usada', e.masa.usada, 20 + 15 + 25 + 8);
Motor.quitar(e, 'cont1');
igual('quitar devuelve créditos', e.presupuesto.gastado, 300 + 150 + 100 + 200);
Motor.equipar(e, 'cont1');

console.log('— Lanzamiento bloqueado solo por masa/presupuesto —');
var caro = estadoCanonico();
Motor.equipar(caro, 'bat160');
Motor.equipar(caro, 'o2grande'); // excede presupuesto
var rl = Motor.lanzar(caro);
igual('lanzar bloqueado por presupuesto', rl.ok, false);
var justo = estadoCanonico(); // margen corto, pero lanza igual (esa es la lección)
igual('lanzar permitido con poco margen', Motor.lanzar(justo).ok, true);

console.log('— Partida completa: corregir trayectoria y ganar —');
var g = estadoCanonico();
Motor.equipar(g, 'fuelextra');
Motor.lanzar(g);
Motor.escanearViaje(g, 0);
igual('corregir posible con combustible extra', Motor.corregir(g).ok, true);
igual('zona tras corregir', g.zonaAterrizaje, 'crater');
Motor.descender(g);
var pasoCrater = Motor.pasoObjetivo(g.zonaAterrizaje, g.objetivo);
igual('el cráter queda a 3 pasos del borde', pasoCrater, 3);
while (g.posicion < pasoCrater) Motor.avanzar(g, 1);
igual('perforar en el cráter', Motor.perforar(g).ok, true);
igual('muestra aún no cuenta', g.muestras.entregadas.length, 0);
Motor.regresar(g);
igual('resultado', g.resultado, 'exito');
igual('muestra entregada', g.muestras.entregadas.length, 1);

console.log('— Partida completa: mantener sin margen y quedar varado —');
var v = estadoCanonico();
Motor.lanzar(v);
Motor.escanearViaje(v, 0);
igual('corregir imposible sin combustible', Motor.corregir(v).ok, false);
Motor.mantener(v);
Motor.descender(v);
while (v.posicion < 6 && v.etapa === 'superficie') Motor.avanzar(v, 1);
if (v.etapa === 'superficie') Motor.perforar(v);
if (v.etapa === 'superficie') Motor.regresar(v);
igual('resultado varado (100 Wh no cubren 108)', v.resultado, 'varado');
igual('ninguna muestra cuenta', v.muestras.entregadas.length, 0);

console.log('— Indicador de regreso —');
var s = estadoCanonico();
Motor.equipar(s, 'fuelextra');
Motor.lanzar(s);
Motor.escanearViaje(s, 0);
Motor.corregir(s);
Motor.descender(s);
Motor.avanzar(s, 1);
var cr = Motor.costoRegreso(s);
igual('regreso desde el paso 1', cr.energia, 5);
Motor.avanzar(s, 1);
Motor.avanzar(s, 1);
cr = Motor.costoRegreso(s);
igual('regreso desde el cráter incluye la subida', cr.energia, 20);

console.log('— Calibración: las dos rutas ganadoras caben en presupuesto y masa —');
function conEquipo(cohete, equipo, zona) {
  var e = Motor.nuevoEstado();
  Motor.elegirCohete(e, cohete);
  equipo.forEach(function (id) { Motor.equipar(e, id); });
  Motor.fijarObjetivo(e, 'crater_profunda');
  Motor.fijarZona(e, zona);
  return e;
}
var baseVeta = ['bat100', 'o2chico', 'taladro', 'cont2', 'escaner'];
var r1 = conEquipo('halcon', baseVeta.concat(['fuelextra']), 'llanura');
igual('ruta A (batería 100 + combustible extra) lanza', Motor.lanzar(r1).ok, true);
Motor.escanearViaje(r1, 0); Motor.corregir(r1); Motor.descender(r1);
while (r1.posicion < Motor.pasoObjetivo(r1.zonaAterrizaje, r1.objetivo)) Motor.avanzar(r1, 1);
Motor.perforar(r1); Motor.escanearSuperficie(r1); Motor.perforar(r1); Motor.regresar(r1);
igual('ruta A gana incluso con la veta', r1.resultado, 'exito');
var r2 = conEquipo('halcon', ['bat160', 'o2chico', 'taladro', 'cont2', 'escaner'], 'llanura');
igual('ruta B (batería 160, mantener) lanza', Motor.lanzar(r2).ok, true);
Motor.escanearViaje(r2, 0); Motor.mantener(r2); Motor.descender(r2);
while (r2.posicion < Motor.pasoObjetivo(r2.zonaAterrizaje, r2.objetivo)) Motor.avanzar(r2, 1);
Motor.perforar(r2); Motor.escanearSuperficie(r2); Motor.perforar(r2); Motor.regresar(r2);
igual('ruta B gana incluso con la veta', r2.resultado, 'exito');
var todo = conEquipo('halcon', ['bat160', 'o2chico', 'taladro', 'cont2', 'escaner', 'fuelextra'], 'llanura');
igual('batería 160 + combustible extra no caben juntos', Motor.lanzar(todo).ok, false);

console.log('— Momento 40/10/35 (aterrizar junto al cráter con batería 100) —');
function hastaLaVeta(e, decision) {
  Motor.lanzar(e); Motor.escanearViaje(e, 0);
  if (decision === 'corregir') Motor.corregir(e); else Motor.mantener(e);
  Motor.descender(e);
  while (e.posicion < Motor.pasoObjetivo(e.zonaAterrizaje, e.objetivo)) Motor.avanzar(e, 1);
  Motor.perforar(e);
  Motor.escanearSuperficie(e);
  return e;
}
var m1 = hastaLaVeta(conEquipo('halcon', baseVeta, 'crater'), 'mantener');
igual('mantener en el cráter: energía restante', m1.recursos.energiaWh, 40);
igual('mantener en el cráter: costo de la veta', DATOS.costos.veta, 10);
igual('mantener en el cráter: costo del regreso', Motor.costoRegreso(m1).energia, 35);
igual('la veta quedó revelada', Motor.sitioActual(m1).vetaRevelada, true);
var m2 = hastaLaVeta(conEquipo('halcon', baseVeta.concat(['fuelextra']), 'crater'), 'corregir');
igual('corregir hacia la llanura: energía restante', m2.recursos.energiaWh, 40);
igual('corregir hacia la llanura: costo del regreso', Motor.costoRegreso(m2).energia, 35);
var prudente = hastaLaVeta(conEquipo('halcon', baseVeta, 'crater'), 'mantener');
Motor.regresar(prudente);
igual('volver sin la veta: éxito con 5 Wh de sobra', prudente.resultado + '/' + prudente.recursos.energiaWh, 'exito/5');
var codicioso = hastaLaVeta(conEquipo('halcon', baseVeta, 'crater'), 'mantener');
Motor.perforar(codicioso); Motor.regresar(codicioso);
igual('perforar la veta y volver: varado', codicioso.resultado, 'varado');
igual('el informe culpa a la veta', Motor.generarInforme(codicioso).causal.some(function (f) { return f.indexOf('veta') !== -1; }), true);

console.log('— Reserva por tramos ([ RESERVAR ]) —');
var q = estadoCanonico();
var ev = Motor.evaluarReserva(q);
igual('reparto automático: ida = estimación normal', ev.ida.reservado, 30);
igual('reparto automático: regreso = estimación normal', ev.regreso.reservado, 35);
igual('reparto automático: el resto a exploración', ev.exploracion.reservado, 35);
igual('al regreso le faltan 9 Wh si sale rocoso', ev.regreso.faltaAdverso, 9);
igual('mover 10 Wh de exploración a regreso', Motor.moverReserva(q, 'exploracion', 'regreso', 10).ok, true);
ev = Motor.evaluarReserva(q);
igual('regreso tras mover', ev.regreso.reservado, 45);
igual('exploración tras mover', ev.exploracion.reservado, 25);
igual('no se mueve más de lo que hay', Motor.moverReserva(q, 'ida', 'regreso', 50).ok, false);
Motor.quitar(q, 'bat100'); Motor.equipar(q, 'bat160');
ev = Motor.evaluarReserva(q);
igual('más batería: el extra va a exploración', ev.exploracion.reservado, 85);
igual('la reserva manual de regreso se conserva', ev.regreso.reservado, 45);
Motor.quitar(q, 'bat160');
ev = Motor.evaluarReserva(q);
igual('sin batería todo queda en cero', ev.total, 0);
Motor.equipar(q, 'bat100');
igual('USAR RECOMENDACIÓN reparte según el adverso', Motor.reservarRecomendado(q).ok, true);
ev = Motor.evaluarReserva(q);
igual('recomendado: regreso adverso', ev.regreso.reservado, 44);
igual('recomendado: ida adversa', ev.ida.reservado, 39);
igual('recomendado: exploración residual', ev.exploracion.reservado, 17);
igual('lanzar nunca se bloquea por la reserva', Motor.lanzar(q).ok, true);
igual('el plan sella la reserva', q.plan.reserva.regreso, 44);
igual('el historial registra la reserva', q.historial.some(function (h) { return h.decision.indexOf('Reserva por tramos') === 0; }), true);
igual('fuera del hangar no se mueve', Motor.moverReserva(q, 'ida', 'regreso').ok, false);

console.log('— Consumo real por tramo —');
var pt = conEquipo('halcon', baseVeta.concat(['fuelextra']), 'llanura');
Motor.lanzar(pt); Motor.escanearViaje(pt, 0); Motor.corregir(pt); Motor.descender(pt);
while (pt.posicion < Motor.pasoObjetivo(pt.zonaAterrizaje, pt.objetivo)) Motor.avanzar(pt, 1);
Motor.perforar(pt); Motor.escanearSuperficie(pt); Motor.regresar(pt);
igual('ida real', pt.real.porTramo.ida, 15);
igual('exploración real (perforar + escanear)', pt.real.porTramo.exploracion, 30);
igual('regreso real', pt.real.porTramo.regreso, 20);
igual('no entró en la reserva de regreso', pt.real.reservaInvadida, false);
igual('el informe trae reserva y consumo por tramo', Motor.generarInforme(pt).porTramo.regreso + '/' + Motor.generarInforme(pt).reserva.regreso, '20/35');

var inv = conEquipo('halcon', baseVeta, 'crater');
Motor.reservarRecomendado(inv); // ida 30 · exploración 35 · regreso 35
hastaLaVeta(inv, 'mantener');   // quedan 40 Wh
igual('con 40 Wh la reserva de regreso (35) sigue intacta', inv.real.reservaInvadida, false);
Motor.perforar(inv);            // veta: quedan 30 Wh
igual('la veta entra en la reserva de regreso', inv.real.reservaInvadida, true);
igual('el historial anota la entrada', inv.historial.some(function (h) { return h.decision.indexOf('Entró en la reserva de regreso') === 0; }), true);
Motor.regresar(inv);
igual('resultado varado', inv.resultado, 'varado');
igual('el informe compara reserva y costo real del regreso', Motor.generarInforme(inv).causal.some(function (f) { return f.indexOf('Habías reservado 35 Wh') === 0 && f.indexOf('costaba 35') !== -1 && f.indexOf('quedaban 30') !== -1; }), true);
var rep = Motor.repetirConPlan(inv);
igual('repetir conserva la reserva manual', Motor.evaluarReserva(rep).regreso.reservado, 35);

console.log('— Desglose del regreso (toda cifra se puede abrir) —');
var ct = Motor.componentesTramo('llanura', 0, 6, true);
igual('ida rocosa en la llanura: pasos', ct.pasos, 6);
igual('ida rocosa en la llanura: base', ct.base, 30);
igual('ida rocosa en la llanura: pasos rocosos', ct.pasosRocosos, 3);
igual('ida rocosa en la llanura: recargo', ct.recargo, 9);
igual('ida rocosa en la llanura: sin subida', ct.salida, 0);
igual('ida rocosa en la llanura: total', ct.total, 39);
ct = Motor.componentesTramo('llanura', 6, 0, true);
igual('regreso rocoso en la llanura: subida', ct.salida, 5);
igual('regreso rocoso en la llanura: total', ct.total, 44);
igual('tramo vacío cuesta cero', Motor.componentesTramo('crater', 2, 2, true).total, 0);
var dg = Motor.desglose('crater', 'crater_profunda', true);
igual('el desglose expone los componentes', dg.componentes.ida.recargo, 15);
igual('componentes y totales coinciden', dg.componentes.ida.total + dg.energia.tarea + dg.componentes.regreso.total, dg.energia.total);
var dr0 = hastaLaVeta(conEquipo('halcon', baseVeta, 'crater'), 'mantener');
var drg = Motor.desgloseRegreso(dr0);
igual('regreso desde el cráter rocoso: pasos', drg.energia.pasos, 3);
igual('regreso desde el cráter rocoso: base', drg.energia.base, 15);
igual('regreso desde el cráter rocoso: recargo', drg.energia.recargo, 15);
igual('regreso desde el cráter rocoso: subida', drg.energia.salida, 5);
igual('el desglose coincide con el indicador', drg.energia.total, Motor.costoRegreso(dr0).energia);
igual('regreso desde el cráter rocoso: oxígeno', drg.oxigeno.total, 12);
igual('con 40 Wh sobran 5', drg.sobra.energia, 5);
Motor.perforar(dr0);
igual('tras la veta faltan 5', Motor.desgloseRegreso(dr0).sobra.energia, -5);
igual('fuera de la superficie el regreso es cero', Motor.desgloseRegreso(Motor.nuevoEstado()).energia.total, 0);

console.log('— Comparación entre partidas (REPETIR) —');
function jugar(e, decision, conVeta) {
  hastaLaVeta(e, decision);
  if (conVeta) Motor.perforar(e);
  Motor.regresar(e);
  return e;
}
// Partida 1: canónica con escáner, mantiene en la llanura rocosa → varada.
var p1 = jugar(conEquipo('halcon', baseVeta, 'llanura'), 'mantener', false);
igual('partida 1 acaba varada', p1.resultado, 'varado');
igual('sin partida anterior no hay comparación', Motor.generarInforme(p1).comparacion, null);
var p2 = Motor.repetirConPlan(p1);
igual('repetir guarda el resultado anterior', p2.anterior.resultado, 'varado');
igual('repetir guarda la batería anterior', ['Batería 100 Wh', 'Battery 100 Wh'].includes(p2.anterior.equipo.bateria), true);
igual('en el hangar todavía no se compara', Motor.compararConAnterior(p2), null);
// Partida 2: un solo cambio (batería 100 → 160) → gana.
Motor.quitar(p2, 'bat100'); Motor.equipar(p2, 'bat160');
jugar(p2, 'mantener', false);
var cmp = Motor.generarInforme(p2).comparacion;
igual('partida 2 gana', p2.resultado, 'exito');
igual('un cambio de batería cuenta como una decisión', cmp.cambios.length, 1);
igual('el cambio es la batería', cmp.cambios[0].etiqueta, 'Batería');
igual('antes: batería 100', ['Batería 100 Wh', 'Battery 100 Wh'].includes(cmp.cambios[0].antes), true);
igual('ahora: batería 160', ['Batería 160 Wh', 'Battery 160 Wh'].includes(cmp.cambios[0].ahora), true);
igual('el resultado cambió', cmp.mismoResultado, false);
igual('la frase aísla la causa', cmp.frase.indexOf('Cambiaste una sola decisión') === 0, true);
igual('la frase nombra el resultado anterior', cmp.frase.indexOf('Varada a') !== -1, true);
igual('la frase nombra el resultado nuevo', cmp.frase.indexOf('Misión cumplida') !== -1, true);
// Partida 3: mismas decisiones que la 2 → sin cambios, mismo resultado.
var p3 = jugar(Motor.repetirConPlan(p2), 'mantener', false);
var cmp3 = Motor.compararConAnterior(p3);
igual('repetir igual: cero cambios', cmp3.cambios.length, 0);
igual('repetir igual: mismo resultado', cmp3.mismoResultado, true);
igual('solo se compara con la partida inmediatamente anterior', ['Batería 160 Wh', 'Battery 160 Wh'].includes(p3.anterior.equipo.bateria), true);
// Partida 4: tres cambios a la vez (batería, combustible extra y trayectoria).
var p4 = Motor.repetirConPlan(p3);
Motor.quitar(p4, 'bat160'); Motor.equipar(p4, 'bat100'); Motor.equipar(p4, 'fuelextra');
jugar(p4, 'corregir', false);
var cmp4 = Motor.compararConAnterior(p4);
igual('batería + combustible + trayectoria: tres cambios', cmp4.cambios.length, 3);
igual('con varios cambios la frase pide aislar', cmp4.frase.indexOf('repite cambiando solo una') !== -1, true);
igual('corregir no cuenta como cambio de zona del plan', cmp4.cambios.some(function (c) { return c.etiqueta === 'Zona de aterrizaje'; }), false);
// Solo cambia lo recogido en superficie (la veta).
var p5 = jugar(Motor.repetirConPlan(p4), 'corregir', true);
var cmp5 = Motor.compararConAnterior(p5);
igual('perforar la veta es el único cambio', cmp5.cambios.length, 1);
igual('y se etiqueta como muestras recogidas', cmp5.cambios[0].etiqueta, 'Muestras recogidas');
// La reserva manual cuenta como decisión; la automática no.
var p6 = Motor.repetirConPlan(p5);
Motor.moverReserva(p6, 'exploracion', 'regreso', 5);
jugar(p6, 'corregir', true);
igual('mover la reserva a mano aparece en la comparación', Motor.compararConAnterior(p6).cambios.some(function (c) { return c.etiqueta === 'Reserva para el regreso'; }), true);
igual('misión nueva no arrastra la comparación', Motor.nuevoEstado().anterior, null);

console.log('— Lanzar sin batería o con el plan ya corto —');
var sb = conEquipo('halcon', ['o2chico', 'taladro', 'cont1'], 'llanura');
igual('sin batería se puede lanzar (no se bloquea)', Motor.lanzar(sb).ok, true);
Motor.escanearViaje(sb, 0); Motor.mantener(sb); Motor.descender(sb); Motor.avanzar(sb, 1);
igual('sin batería: varada al primer paso', sb.resultado, 'varado');
var csb = Motor.generarInforme(sb).causal;
igual('el informe nombra la falta de batería', csb.some(function (f) { return f.indexOf('Lanzaste sin ninguna batería') === 0; }), true);
igual('y no habla de un margen negativo', csb.some(function (f) { return f.indexOf('de margen') !== -1; }), false);
igual('ni de la reserva de regreso', csb.some(function (f) { return f.indexOf('Habías reservado') !== -1; }), false);
// Plan corto: hay batería, pero el recorrido previsto ya pide más de lo que lleva.
var pc = conEquipo('halcon', ['bat100', 'o2chico', 'taladro', 'cont1'], 'llanura');
DATOS.costos.perforar = 60; // solo para esta prueba: el plan pasa a pedir 125 Wh
Motor.lanzar(pc); Motor.escanearViaje(pc, 0); Motor.mantener(pc); Motor.descender(pc);
while (!pc.resultado && pc.posicion < 6) Motor.avanzar(pc, 1);
if (!pc.resultado) Motor.perforar(pc);
if (!pc.resultado) Motor.regresar(pc);
DATOS.costos.perforar = 25;
igual('plan corto: acaba varada', pc.resultado, 'varado');
igual('plan corto: el informe dice que no alcanzaba antes de despegar', Motor.generarInforme(pc).causal.some(function (f) { return f.indexOf('El plan ya no alcanzaba antes de despegar') === 0; }), true);

console.log('— Terreno variable (el escaneo tira el dado) —');
var ROCA = 0, DESPEJADO = 0.99;
function partida(e, azar, decision) {
  Motor.lanzar(e); Motor.escanearViaje(e, azar);
  if (decision === 'corregir') Motor.corregir(e); else Motor.mantener(e);
  Motor.descender(e);
  while (!e.resultado && e.posicion < Motor.pasoObjetivo(e.zonaAterrizaje, e.objetivo)) Motor.avanzar(e, 1);
  if (!e.resultado) Motor.perforar(e);
  if (!e.resultado) Motor.regresar(e);
  return e;
}
function dice(e, texto) {
  return Motor.generarInforme(e).causal.some(function (f) { return f.indexOf(texto) !== -1; });
}
function escaneo(zona, azar) {
  var x = conEquipo('halcon', ['bat100', 'o2chico', 'taladro', 'cont1'], zona);
  Motor.lanzar(x); Motor.escanearViaje(x, azar);
  return x;
}
igual('riesgo de roca en la llanura', DATOS.mapa.llanura.probRocoso, 0.3);
igual('riesgo de roca en el cráter', DATOS.mapa.crater.probRocoso, 0.6);
igual('llanura: 0.29 cae en roca', escaneo('llanura', 0.29).viaje.rocoso, true);
igual('llanura: 0.30 ya es despejado', escaneo('llanura', 0.3).viaje.rocoso, false);
igual('cráter: 0.59 cae en roca', escaneo('crater', 0.59).viaje.rocoso, true);
igual('cráter: 0.60 ya es despejado', escaneo('crater', 0.6).viaje.rocoso, false);
igual('antes de escanear no hay resultado', Motor.nuevoEstado().viaje.rocoso, null);
var libre = estadoCanonico(); Motor.lanzar(libre); Motor.escanearViaje(libre);
igual('sin valor fijo el motor tira su propio dado', typeof libre.viaje.rocoso, 'boolean');
igual('el escaneo guarda el riesgo de la zona', libre.viaje.probRocoso, 0.3);
igual('fuera del viaje no se escanea', Motor.escanearViaje(estadoCanonico(), ROCA).ok, false);
var mr = estadoCanonico(); Motor.lanzar(mr);
igual('mensaje cuando sale roca', Motor.escanearViaje(mr, ROCA).msg, DATOS.textos.eventoViaje);
var md = estadoCanonico(); Motor.lanzar(md);
igual('mensaje cuando sale despejado', Motor.escanearViaje(md, DESPEJADO).msg, DATOS.textos.eventoViajeDespejado);

var td = escaneo('llanura', DESPEJADO);
var ptd = Motor.proyeccionesViaje(td);
igual('despejado: mantener cuesta la estimación normal', ptd.mantener.d.energia.total, 90);
igual('despejado: la proyección lo marca', ptd.rocoso, false);
igual('rocoso: mantener cuesta el escenario adverso', Motor.proyeccionesViaje(escaneo('llanura', ROCA)).mantener.d.energia.total, 108);
igual('el escaneo queda en la cadena de decisiones', td.historial.some(function (h) { return h.decision.indexOf('Escaneo en vuelo') === 0 && h.efecto.indexOf('despejado') !== -1; }), true);

var suerte = partida(estadoCanonico(), DESPEJADO, 'mantener');
igual('canónica con terreno despejado: gana', suerte.resultado, 'exito');
igual('canónica con terreno despejado: sobran 10 Wh', suerte.recursos.energiaWh, 10);
igual('en superficie no se cobra recargo', suerte.terrenoRocosoActivo, false);
igual('el informe dice que fue suerte', dice(suerte, 'Esta vez fue suerte, no margen'), true);
igual('y cuánto habría faltado con roca', dice(suerte, 'te habrían faltado 8 Wh'), true);
igual('y recuerda el riesgo', dice(suerte, '30 % de riesgo'), true);

var conSalida = estadoCanonico(); Motor.equipar(conSalida, 'fuelextra');
partida(conSalida, DESPEJADO, 'mantener');
igual('despejado con combustible: gana', conSalida.resultado, 'exito');
igual('el informe reconoce la salida de corregir', dice(conSalida, 'llevabas combustible para corregir'), true);
igual('y no lo llama suerte', dice(conSalida, 'Esta vez fue suerte'), false);

var robusto = partida(conEquipo('halcon', ['bat160', 'o2chico', 'taladro', 'cont1'], 'llanura'), DESPEJADO, 'mantener');
igual('batería 160 con terreno despejado: gana', robusto.resultado, 'exito');
igual('el informe dice que el plan no dependía del terreno', dice(robusto, 'tu plan no dependía de eso'), true);

var mala = partida(estadoCanonico(), ROCA, 'mantener');
igual('canónica con roca: varada', mala.resultado, 'varado');
igual('el informe recuerda que el riesgo estaba avisado', dice(mala, 'El riesgo estaba avisado: 30 %'), true);
igual('y no habla de suerte', dice(mala, 'Esta vez fue suerte'), false);

var cd = conEquipo('halcon', ['bat100', 'o2chico', 'taladro', 'cont1', 'fuelextra'], 'llanura');
partida(cd, DESPEJADO, 'corregir');
igual('con terreno despejado también se puede corregir', cd.viaje.corrigio, true);
igual('corregir desde la llanura despejada lleva al cráter', cd.zonaAterrizaje, 'crater');
igual('y gasta 60 Wh en vez de 90', cd.real.consumido.energiaWh, 60);
igual('tras corregir no se añade la frase de suerte', dice(cd, 'El terreno salió despejado'), false);

var cc = conEquipo('halcon', baseVeta, 'crater');
Motor.lanzar(cc); Motor.escanearViaje(cc, DESPEJADO); Motor.mantener(cc); Motor.descender(cc);
while (cc.posicion < 3) Motor.avanzar(cc, 1);
Motor.perforar(cc); Motor.escanearSuperficie(cc);
igual('cráter despejado: tras perforar y escanear quedan 55 Wh', cc.recursos.energiaWh, 55);
igual('cráter despejado: volver cuesta 20 Wh', Motor.costoRegreso(cc).energia, 20);

console.log('— Comparación entre partidas con el terreno distinto —');
var q1 = partida(estadoCanonico(), ROCA, 'mantener');
var q2 = partida(Motor.repetirConPlan(q1), DESPEJADO, 'mantener');
var cq = Motor.compararConAnterior(q2);
igual('mismas decisiones, otro terreno: cero cambios', cq.cambios.length, 0);
igual('el resultado sí cambió', cq.mismoResultado, false);
igual('la comparación separa el terreno: antes', cq.terrenoCambio.antes, 'Rocoso');
igual('la comparación separa el terreno: ahora', cq.terrenoCambio.ahora, 'Despejado');
igual('la frase lo atribuye a la suerte', cq.frase.indexOf('Tomaste las mismas decisiones, pero el terreno salió distinto (Rocoso → Despejado)') === 0, true);
igual('y nombra para qué sirve el margen', cq.frase.indexOf('Esa diferencia es suerte') !== -1, true);

var q3 = Motor.repetirConPlan(q1);
Motor.quitar(q3, 'bat100'); Motor.equipar(q3, 'bat160');
partida(q3, DESPEJADO, 'mantener');
var cq3 = Motor.compararConAnterior(q3);
igual('un cambio y otro terreno: sigue siendo un cambio', cq3.cambios.length, 1);
igual('pero la frase no lo da por causa', cq3.frase.indexOf('Ese cambio es la causa') === -1, true);
igual('y pide repetir para confirmarlo', cq3.frase.indexOf('no se puede atribuir solo a tu cambio') !== -1, true);

var q4 = Motor.repetirConPlan(q1);
Motor.quitar(q4, 'bat100'); Motor.equipar(q4, 'bat160');
partida(q4, ROCA, 'mantener');
var cq4 = Motor.compararConAnterior(q4);
igual('un cambio y el mismo terreno: sin aviso de terreno', cq4.terrenoCambio, null);
igual('y entonces sí es la causa', cq4.frase.indexOf('Ese cambio es la causa.') !== -1, true);

if (fallos) {
  console.error('\n' + fallos + ' prueba(s) fallaron.');
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron.');

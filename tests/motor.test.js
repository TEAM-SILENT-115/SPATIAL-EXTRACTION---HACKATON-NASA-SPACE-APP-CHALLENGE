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
Motor.escanearViaje(g);
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
Motor.escanearViaje(v);
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
Motor.escanearViaje(s);
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
Motor.escanearViaje(r1); Motor.corregir(r1); Motor.descender(r1);
while (r1.posicion < Motor.pasoObjetivo(r1.zonaAterrizaje, r1.objetivo)) Motor.avanzar(r1, 1);
Motor.perforar(r1); Motor.escanearSuperficie(r1); Motor.perforar(r1); Motor.regresar(r1);
igual('ruta A gana incluso con la veta', r1.resultado, 'exito');
var r2 = conEquipo('halcon', ['bat160', 'o2chico', 'taladro', 'cont2', 'escaner'], 'llanura');
igual('ruta B (batería 160, mantener) lanza', Motor.lanzar(r2).ok, true);
Motor.escanearViaje(r2); Motor.mantener(r2); Motor.descender(r2);
while (r2.posicion < Motor.pasoObjetivo(r2.zonaAterrizaje, r2.objetivo)) Motor.avanzar(r2, 1);
Motor.perforar(r2); Motor.escanearSuperficie(r2); Motor.perforar(r2); Motor.regresar(r2);
igual('ruta B gana incluso con la veta', r2.resultado, 'exito');
var todo = conEquipo('halcon', ['bat160', 'o2chico', 'taladro', 'cont2', 'escaner', 'fuelextra'], 'llanura');
igual('batería 160 + combustible extra no caben juntos', Motor.lanzar(todo).ok, false);

console.log('— Momento 40/10/35 (aterrizar junto al cráter con batería 100) —');
function hastaLaVeta(e, decision) {
  Motor.lanzar(e); Motor.escanearViaje(e);
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
Motor.lanzar(pt); Motor.escanearViaje(pt); Motor.corregir(pt); Motor.descender(pt);
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

if (fallos) {
  console.error('\n' + fallos + ' prueba(s) fallaron.');
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron.');

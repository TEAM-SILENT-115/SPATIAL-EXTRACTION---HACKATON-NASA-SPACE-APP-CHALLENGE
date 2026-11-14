/* Pruebas del motor sin navegador: node tests/motor.test.js */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ctx = vm.createContext({ console: console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'datos.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'motor.js'), 'utf8'), ctx);

var Motor = ctx.Motor;
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
while (g.posicion < 2) Motor.avanzar(g, 1);
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
cr = Motor.costoRegreso(s);
igual('regreso desde el cráter incluye la subida', cr.energia, 15);

if (fallos) {
  console.error('\n' + fallos + ' prueba(s) fallaron.');
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron.');

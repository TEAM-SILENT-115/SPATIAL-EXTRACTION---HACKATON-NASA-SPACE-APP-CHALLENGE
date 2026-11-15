// Recorrido completo de la interfaz guiada en un navegador real (Edge sin cabeza por CDP).
// Arranque:  msedge --headless=new --remote-debugging-port=9223 --user-data-dir=.qa-edge about:blank
// Ejecución: node tests/browser.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {connect} from '../tools/browser_qa.mjs';

const c = await connect();
await c.send('Runtime.enable'); await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
const delay = ms => new Promise(r => setTimeout(r, ms));
const state = () => c.evaluate('LunarUI.snapshot()');
const vista = () => c.evaluate('LunarUI.vista()');

async function click(a, x = '') {
  const box = await c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button[data-l]')).find(b=>b.dataset.l===${JSON.stringify(a)}&&b.dataset.x===${JSON.stringify(x)});if(!b)throw Error('No existe el botón: '+${JSON.stringify(a + ' ' + x)});if(b.disabled)throw Error('Botón desactivado: '+${JSON.stringify(a + ' ' + x)});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await c.send('Input.dispatchMouseEvent', {type: 'mousePressed', ...box, button: 'left', clickCount: 1});
  await c.send('Input.dispatchMouseEvent', {type: 'mouseReleased', ...box, button: 'left', clickCount: 1});
}
const desactivado = (a, x = '') => c.evaluate(`Array.from(document.querySelectorAll('button[data-l]')).find(b=>b.dataset.l===${JSON.stringify(a)}&&b.dataset.x===${JSON.stringify(x)}).disabled`);
async function key(k, code = k) {
  await c.send('Input.dispatchKeyEvent', {type: 'keyDown', key: k, code});
  await c.send('Input.dispatchKeyEvent', {type: 'keyUp', key: k, code});
}
async function walk(path) {
  for (let i = 1; i < path.length; i++) {
    const p = (await state()).pos, d = [path[i][0] - p[0], path[i][1] - p[1]];
    await key(d[0] === 1 ? 'ArrowRight' : d[0] === -1 ? 'ArrowLeft' : d[1] === 1 ? 'ArrowDown' : 'ArrowUp');
    assert.deepEqual((await state()).pos, path[i]);
  }
}
async function shot(name) { await c.screenshot('artifacts/' + name + '.png'); }

// Usabilidad medible en cada pantalla: nada de letra diminuta, nada que se salga de la pantalla fija.
async function legible(nombre) {
  const r = await c.evaluate(`(()=>{const j=document.getElementById('juego');
    const peq=Array.from(j.querySelectorAll('*')).filter(e=>e.children.length===0&&e.innerText&&e.innerText.trim()&&parseFloat(getComputedStyle(e).fontSize)<13).map(e=>e.className+': '+e.innerText.slice(0,24));
    const desb=Array.from(j.querySelectorAll('main,section,.u-carta,.u-opcion,.u-hud,.u-acc')).filter(e=>e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1).map(e=>e.className);
    return {peq,desb,alto:j.scrollHeight-j.clientHeight,botones:j.querySelectorAll('button').length};})()`);
  assert.deepEqual(r.peq, [], nombre + ': texto por debajo de 13 px');
  assert.deepEqual(r.desb, [], nombre + ': contenido que se sale de su caja');
  assert.ok(r.alto <= 0, nombre + ': la pantalla necesita scroll');
  assert.ok(r.botones <= 10, nombre + ': demasiados botones a la vez (' + r.botones + ')');
  await shot(nombre);
}

// Del plan a la superficie con las opciones dadas (una por paso).
async function planear(opciones) {
  await click('empezar_plan');
  for (const o of opciones) {
    for (const x of [].concat(o)) await click('opcion', x);
    await click('paso_sig');
  }
}
async function aterrizar(decision) {
  await click('lanzar'); assert.equal((await vista()).pantalla, 'despegue');
  await click('saltar'); assert.equal((await vista()).pantalla, 'viaje');
  if (decision) await click(decision);
  await click('descender'); assert.equal((await vista()).pantalla, 'descenso');
  await click('saltar'); assert.equal((await vista()).pantalla, 'superficie');
}
async function misionCompleta() {
  await walk((await state()).aterrizaje.ida);
  await key('e', 'KeyE'); assert.equal((await state()).tomada, true);
  await walk((await state()).retorno.path);
  await key('e', 'KeyE'); assert.equal((await state()).resultado, 'exito');
  await delay(2100); assert.equal((await vista()).pantalla, 'informe');
}

fs.mkdirSync('artifacts', {recursive: true});
try {
  await c.send('Page.navigate', {url: pathToFileURL(process.cwd() + '/index.html').href}); await delay(400);
  await c.evaluate('localStorage.clear();window.__qaErrors=[];window.addEventListener("error",e=>__qaErrors.push(e.message));0');
  await c.send('Page.reload'); await delay(500);
  await c.evaluate('window.__qaErrors=[];window.addEventListener("error",e=>__qaErrors.push(e.message));0');

  // Título y selección de nivel: un solo camino evidente, dos niveles cerrados.
  assert.equal((await vista()).pantalla, 'titulo'); await legible('01-titulo');
  await click('jugar'); assert.equal((await vista()).pantalla, 'niveles'); await legible('02-niveles');
  assert.equal(await c.evaluate('document.querySelectorAll(".u-carta.bloq").length'), 2);

  // Nivel básico: la misión se explica antes de pedir nada.
  await click('nivel', 'Site01'); assert.equal((await vista()).pantalla, 'briefing'); await legible('03-mision');
  await click('empezar_plan'); assert.equal((await vista()).pasoId, 'ruta'); await legible('04-plan-ruta');
  assert.equal(await desactivado('paso_sig'), true, 'no se avanza sin elegir');
  await click('opcion', 'ahorro'); assert.equal(await desactivado('paso_sig'), false);
  await click('paso_sig'); assert.equal((await vista()).pasoId, 'bateria');
  assert.equal(Motor_tieneBateria(await state()), false, 'la batería la elige el jugador');
  await click('opcion', 'bat160'); await legible('05-plan-bateria');
  await click('paso_sig'); assert.equal((await vista()).pasoId, 'revision'); await legible('06-plan-revision');
  await aterrizar(); await legible('07-superficie');

  // E al aterrizar no cierra la misión por accidente.
  await key('e', 'KeyE'); assert.equal((await state()).etapa, 'superficie'); assert.equal((await vista()).modal, null);

  // La pausa detiene el juego: moverse en pausa no gasta ni desplaza.
  const antes = await state();
  await key('Escape'); assert.equal((await vista()).modal, 'pausa'); await shot('08-pausa');
  await key('ArrowRight');
  const pausado = await state(); assert.deepEqual(pausado.pos, antes.pos); assert.equal(pausado.recursos.energiaWh, antes.recursos.energiaWh);
  await key('Escape'); assert.equal((await vista()).modal, null);

  // Los botones de dirección sirven a quien juega con ratón.
  await click('mv', 'd'); assert.deepEqual((await state()).pos, [antes.pos[0] + 1, antes.pos[1]]);
  await click('mv', 'a'); assert.deepEqual((await state()).pos, antes.pos);

  // Volver al módulo sin muestra pide confirmación.
  await click('accion'); assert.equal((await vista()).modal, 'confirmar_fin');
  await click('cerrar'); assert.equal((await state()).etapa, 'superficie');

  await misionCompleta(); await legible('09-informe');
  assert.deepEqual(await c.evaluate('JSON.parse(localStorage.getItem("mision_umbral_desbloqueados"))'), ['Site01', 'Site04']);
  assert.equal(await c.evaluate('JSON.parse(localStorage.getItem("mision_umbral_rangos")).Site01'), 'S');

  // Nivel intermedio: el presupuesto bloquea llevarlo todo y el aviso lo explica.
  await click('siguiente_nivel', 'Site04'); assert.equal((await state()).sitio, 'Site04'); await legible('10-mision-intermedio');
  await planear(['ahorro', 'bat160', 'o2grande']); await legible('11-plan-bloqueado');
  assert.equal(await desactivado('lanzar'), true, 'presupuesto excedido bloquea el lanzamiento');
  await click('ir_paso', '2'); await click('opcion', 'o2chico'); await click('paso_sig');
  assert.equal(await desactivado('lanzar'), false);
  await aterrizar(); await misionCompleta();
  assert.ok((await state()).recursos.oxigeno < 100, 'en el intermedio el oxígeno se consume');

  // Repetir abre la revisión con las decisiones anteriores listas para cambiar una.
  await click('repetir');
  const rep = await vista(); assert.equal(rep.pantalla, 'plan'); assert.equal(rep.pasoId, 'revision');
  assert.ok((await state()).equipo.includes('bat160') && (await state()).equipo.includes('o2chico'));

  // Nivel avanzado: cohete, extras y la decisión en vuelo.
  await click('ir_paso', '0'); await click('niveles'); await click('nivel', 'Site11'); await legible('12-mision-avanzado');
  await planear(['ahorro', 'bat160', 'o2chico', 'halcon', ['fuelextra']]); await legible('13-plan-avanzado');
  await click('lanzar'); await click('saltar'); await legible('14-viaje-decision');
  await click('corregir'); assert.equal((await state()).viaje.corrigio, true);
  await click('descender'); await click('saltar');
  await misionCompleta(); await legible('15-informe-avanzado');
  assert.equal(await c.evaluate('JSON.parse(localStorage.getItem("mision_umbral_rangos")).Site11'), 'S');

  assert.deepEqual(await c.evaluate('__qaErrors'), []);
  console.log('Navegador: tres niveles completos con ratón y teclado, pausa sin gasto, confirmaciones, progreso guardado y 15 pantallas legibles sin scroll. Sin errores JS.');
} finally { c.close(); }

function Motor_tieneBateria(s) { return s.equipo.some(id => /^bat/.test(id)); }

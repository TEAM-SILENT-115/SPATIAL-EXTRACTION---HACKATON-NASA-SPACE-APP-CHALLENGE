import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {connect} from '../tools/browser_qa.mjs';
const c=await connect(),errors=[];
await c.send('Runtime.enable');await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>c.evaluate('LunarUI.snapshot()');
async function click(a,x='') {
  const box=await c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button[data-l]')).find(b=>b.dataset.l===${JSON.stringify(a)}&&b.dataset.x===${JSON.stringify(x)});if(!b||b.disabled)throw Error('Missing/enabled button: '+${JSON.stringify(a)});b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
}
async function key(k,code=k){await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code});}
async function walk(path){for(let i=1;i<path.length;i++){const p=(await state()).pos;const d=[path[i][0]-p[0],path[i][1]-p[1]];const k=d[0]===1?'ArrowRight':d[0]===-1?'ArrowLeft':d[1]===1?'ArrowDown':'ArrowUp';await key(k);assert.deepEqual((await state()).pos,path[i]);}}
async function shot(name){await c.screenshot('artifacts/'+name+'.png');}
fs.mkdirSync('artifacts',{recursive:true});
try {
  await c.send('Page.navigate',{url:pathToFileURL(process.cwd()+'/index.html').href});await delay(400);
  await c.evaluate('window.__qaErrors=[];window.addEventListener("error",e=>__qaErrors.push(e.message));');
  await click('tutorial');assert.equal((await state()).tutorial.activo,true);await shot('hangar-tutorial');
  await click('ruta','directa');assert.equal((await state()).tutorial.comparado,true);
  await click('ruta','ahorro');await click('test');await shot('plan-probado');
  await click('launch');await click('scanflight');await shot('viaje');await click('keep');await click('land');await shot('superficie');
  const before=await state();await key('i','KeyI');await key('ArrowRight');await key('ArrowDown');await shot('inventario');
  await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft'});await delay(350);await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft'});
  const after=await state();assert.deepEqual(after.pos,before.pos);assert.equal(after.recursos.energiaWh,before.recursos.energiaWh);await key('Escape');
  await walk((await state()).aterrizaje.ida);await shot('objetivo');await key('e','KeyE');assert.equal((await state()).tomada,true);
  await shot('muestra-recogida');await walk((await state()).retorno.path);await key('e','KeyE');assert.equal((await state()).resultado,'exito');await shot('informe');
  assert.equal((await state()).tutorial.activo,true);await click('skip');assert.equal((await state()).tutorial.activo,false);
  await click('repeat');assert.equal((await state()).gastado,0);assert.equal((await state()).muestras.recogidas.length,0);
  const saved=await state();await click('help');await click('skip');const resumed=await state();assert.deepEqual(resumed.equipo,saved.equipo);assert.equal(resumed.sitio,saved.sitio);
  // A second launch refills resources and does not force tutorial.
  await click('test');await click('launch');assert.equal((await state()).recursos.energiaWh,160);await click('scanflight');await click('keep');await click('land');
  const pause=await state();await key('Escape');await key('ArrowRight');await key('Escape');assert.deepEqual((await state()).pos,pause.pos);assert.equal((await state()).recursos.energiaWh,pause.recursos.energiaWh);
  // Reopening the guide mid-mission keeps state and provides current instructions.
  await click('help');assert.equal((await state()).tutorial.activo,true);assert.deepEqual((await state()).pos,pause.pos);await click('skip');
  await walk((await state()).aterrizaje.ida);await key('e');await walk((await state()).retorno.path);await key('e');assert.equal((await state()).resultado,'exito');
  const errs=await c.evaluate('__qaErrors');assert.deepEqual(errs,[]);
  console.log('Browser: tutorial completo y saltado, inventario y pausa sin gasto, guía reabierta, dos misiones completas con teclado. Sin errores JS.');
} finally {c.close();}

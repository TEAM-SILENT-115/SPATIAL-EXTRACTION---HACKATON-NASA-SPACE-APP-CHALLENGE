const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const f of ['js/datos.js','js/motor.js','data/nasa/processed/maps.js','js/lunar-datos.js','js/lunar-motor.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
let checks=0;const check=(condition,msg)=>{assert.ok(condition,msg);checks++;};
const close=(a,b,msg)=>check(Math.abs(a-b)<1e-7,msg+': '+a+' / '+b);
function land(s,correct=false){Lunar.probar(s);check(Lunar.lanzar(s).ok,'launch');Lunar.escanearViaje(s);check(Lunar.decidir(s,correct).ok,'decision');check(Lunar.descender(s),'landing');}
function walk(s,path){for(let i=1;i<path.length;i++)check(Lunar.mover(s,path[i][0]-s.pos[0],path[i][1]-s.pos[1]),'walk '+path[i]);}
for(const m of MAPAS_NASA)for(const route of ['directa','ahorro'])for(const correction of [false,true]) {
  const s=Lunar.nuevo();Lunar.cambiar(s,'sitio',m.id);Lunar.cambiar(s,'ruta',route);
  if(correction)Lunar.cambiar(s,'equipo','fuelextra');
  const expected=Lunar.proyectar(s,route,correction?m.nearModule:m.module);
  land(s,correction);walk(s,expected.ida);
  check(Lunar.interactuar(s).ok,'extract');check(s.muestras.entregadas.length===0,'not secured before module');
  walk(s,expected.vuelta);check(Lunar.interactuar(s).ok,'deliver');
  check(s.resultado==='exito','success '+m.id+' '+route);close(s.gastado,expected.total,'plan equals actual');
  check(Lunar.informe(s).ciencia===100,'science reward');
  const next=Lunar.nuevo(s);check(next.muestras.recogidas.length===0&&next.gastado===0,'reset samples and usage');
  land(next);close(next.recursos.energiaWh,Motor.totales(next).energia,'refilled');
}
{
  const s=Lunar.nuevo(),m=Lunar.map(s);land(s);
  const wall=s.pos.slice();s.pos=[0,0];const energy=s.recursos.energiaWh;
  for(let i=0;i<500;i++)check(!Lunar.mover(s,-1,0),'blocked move');
  close(s.recursos.energiaWh,energy,'obstacle spends nothing');s.pos=wall;
  check(!Lunar.mover(s,1,1),'no diagonal corner clipping');
  const route=Lunar.proyectar(s).ida;walk(s,route);
  const p=Lunar.proyectar(s);close(s.movimientoWh,p.a.wh,'same movement formula');
  check(Lunar.contexto(s).accion==='perforar','one contextual action');
}
{
  const s=Lunar.nuevo();Lunar.cambiar(s,'equipo','taladro');land(s);
  walk(s,s.aterrizaje.ida);const before=s.recursos.energiaWh;
  check(/Taladro/.test(Lunar.contexto(s).falta),'missing tool explained');
  check(!Lunar.interactuar(s).ok,'missing tool prevents extraction');close(s.recursos.energiaWh,before,'no charge for failed action');
  walk(s,s.retorno.path);Lunar.interactuar(s);check(s.resultado==='sin_muestra','safe return without science');
}
{
  const s=Lunar.nuevo();Lunar.cambiar(s,'equipo','escaner');Lunar.cambiar(s,'equipo','cont2');land(s);
  walk(s,Lunar.camino(Lunar.map(s),s.pos,Lunar.map(s).extra,Lunar.masa(s)));
  check(Lunar.contexto(s).accion==='escanear','scan context');check(Lunar.interactuar(s).ok,'scan');
  check(Lunar.contexto(s).accion==='recoger','collect context');check(Lunar.interactuar(s).ok,'collect');
  walk(s,Lunar.camino(Lunar.map(s),s.pos,Lunar.map(s).target,Lunar.masa(s)));
  check(Lunar.interactuar(s).ok,'core after optional sample');walk(s,s.retorno.path);Lunar.interactuar(s);
  check(s.muestras.entregadas.length===2,'both samples secured');
}
{
  const s=Lunar.nuevo();Lunar.cambiar(s,'sitio','Site04');Lunar.cambiar(s,'equipo','bat100');const p=Lunar.proyectar(s);
  check(p.margen<p.reserva,'small battery risk');land(s);
  walk(s,s.aterrizaje.ida);Lunar.interactuar(s);
  // Keep moving until insufficient energy for any adjacent edge.
  for(let i=0;i<500&&s.etapa==='superficie';i++) {
    const options=[[1,0],[-1,0],[0,1],[0,-1]].filter(d=>Lunar.transitable(Lunar.map(s),[s.pos[0]+d[0],s.pos[1]+d[1]]));
    const affordable=options.find(d=>Lunar.costo(Lunar.map(s),s.pos,[s.pos[0]+d[0],s.pos[1]+d[1]],Lunar.masa(s)).wh<=s.recursos.energiaWh);
    Lunar.mover(s,...(affordable||options[0]));
  }
  check(s.resultado==='varado','depletion report');check(s.muestras.entregadas.length===0,'no science stranded');
  check(/Repite/.test(Lunar.informe(s).causa),'actionable failure');
}
{
  const s=Lunar.nuevo();Lunar.cambiar(s,'cohete','titan');DATOS.objetos.forEach(o=>{if(!s.equipo.includes(o.id))Motor.equipar(s,o.id);});
  check(Lunar.evaluar(s).bloqueos.length>0,'mass and budget blocked');Lunar.probar(s);check(!Lunar.lanzar(s).ok,'hard block launch');
  const a=Lunar.nuevo(),small=Lunar.proyectar(a);Lunar.cambiar(a,'equipo','bat100');const b=Lunar.proyectar(a);
  check(b.total<small.total&&b.margen<small.margen,'lighter battery reduces movement cost but reserve shrinks');
  check(a.equipo.filter(id=>Motor.obj(id).tipo==='bateria').length===1,'battery swaps atomically');
  const c=Lunar.nuevo();land(c);const snapshot=JSON.stringify(c.equipo);Lunar.cambiar(c,'equipo','taladro');check(JSON.stringify(c.equipo)===snapshot,'loadout sealed');
  check(!Lunar.decidir(c,true).ok,'cannot correct again');
}
// Modo Hackathon: todas las zonas libres y desbloqueadas desde el inicio
{
  const s=Lunar.nuevo();
  check(Lunar.esDesbloqueado(s,'Site01'),'Site01 libre para hackathon');
  check(Lunar.esDesbloqueado(s,'Site04'),'Site04 libre para hackathon');
  check(Lunar.esDesbloqueado(s,'Site11'),'Site11 libre para hackathon');
  s.sitio='Site01';
  s.resultado='exito';
  s.muestras.entregadas=['Núcleo'];
  const u1=Lunar.desbloquearSiguiente(s);
  check(u1==='Site04','Referencia a Site04');
  s.sitio='Site04';
  const u2=Lunar.desbloquearSiguiente(s);
  check(u2==='Site11','Referencia a Site11');
}
// Evaluación de los 6 finales
{
  const s=Lunar.nuevo();
  s.plan={reserva:15,energia:100};
  s.resultado='varado';
  check(Lunar.evaluarFinal(s).id==='forense','final forense al varar');

  s.resultado='parcial';
  s.tomada=false;
  s.muestras.entregadas=['Regolito'];
  check(Lunar.evaluarFinal(s).id==='tactico','final tactico sin nucleo');

  s.resultado='exito';
  s.tomada=true;
  s.muestras.entregadas=['Núcleo','Muestra'];
  s.recursos.energiaWh=30;
  check(Lunar.evaluarFinal(s).id==='pionero','final pionero con dos muestras y reserva');

  s.muestras.entregadas=['Núcleo'];
  s.recursos.energiaWh=20;
  s.sitio='Site01';
  check(Lunar.evaluarFinal(s).id==='maestro','final maestro con plan equilibrado');

  s.recursos.energiaWh=4;
  check(Lunar.evaluarFinal(s).id==='in_extremis','final in_extremis con energia critica');

  s.sitio='Site04';
  s.revelada=true;
  s.recursos.energiaWh=15;
  check(Lunar.evaluarFinal(s).id==='revolucion','final revolucion en cráter desafiante');
}
// Animación y dirección de paso
{
  const s=Lunar.nuevo();
  land(s);
  check(s.direccion==='down','direccion inicial');
  Lunar.mover(s,1,0);
  check(s.direccion==='right','orientacion a la derecha');
  check(s.animFrame>0,'ciclo de animacion avanza');
  Lunar.mover(s,0,1);
  check(s.direccion==='down','orientacion hacia abajo');
}
// Audio sintético seguro en Node
{
  check(typeof LunarAudio.estaActivo()==='boolean','LunarAudio expone estado');
  LunarAudio.click();
  LunarAudio.paso();
  LunarAudio.perforar();
  LunarAudio.alerta();
  LunarAudio.exito();
  check(true,'LunarAudio llamadas seguras sin entorno DOM');
}
// Tutorial enfocado paso a paso por las 4 categorías de equipo
{
  const s = Lunar.nuevo();
  s.tutorial.activo = true;
  // Paso 1 Hangar: Ruta Directa
  let g = Lunar.guiaPaso(s);
  check(g.paso === 1, 'tutorial paso 1');
  check(g.selector.includes('directa'), 'foco en ruta directa');
  Lunar.cambiar(s, 'ruta', 'directa');
  s.tutorial.rutaElegida = true;
  s.tutorial.catIndex = 0;
  // Paso 2 Hangar: Herramientas -> Foco en Energía
  g = Lunar.guiaPaso(s);
  check(g.paso === 2, 'tutorial paso 2');
  check(g.selector.includes('data-x="1"'), 'foco en categoria energia');
  s.tutorial.catIndex = 1;
  s.tutorial.cat1 = true;
  // Paso 3 Hangar: Energía -> Foco en Soporte Vital
  g = Lunar.guiaPaso(s);
  check(g.paso === 3, 'tutorial paso 3');
  check(g.selector.includes('data-x="2"'), 'foco en categoria soporte vital');
  s.tutorial.catIndex = 2;
  s.tutorial.cat2 = true;
  // Paso 4 Hangar: Soporte Vital -> Foco en Muestras
  g = Lunar.guiaPaso(s);
  check(g.paso === 4, 'tutorial paso 4');
  check(g.selector.includes('data-x="3"'), 'foco en categoria muestras');
  s.tutorial.catIndex = 3;
  s.tutorial.cat3 = true;
  // Paso 5 Hangar: Muestras -> Foco en Probar Plan
  g = Lunar.guiaPaso(s);
  check(g.paso === 5, 'tutorial paso 5');
  check(g.selector.includes('test'), 'foco en probar plan desde muestras');
  s.tutorial.equipoVisto = true;
  // Paso 6 Hangar: Probar plan
  g = Lunar.guiaPaso(s);
  check(g.paso === 6, 'tutorial paso 6 probar');
  Lunar.probar(s);
  // Paso 6 Hangar (autorizado): Lanzar
  g = Lunar.guiaPaso(s);
  check(g.selector.includes('launch'), 'foco en lanzar');
  Lunar.lanzar(s);
  // Paso 1 Viaje: Escaneo
  g = Lunar.guiaPaso(s);
  check(g.paso === 1, 'viaje paso 1');
  check(g.selector.includes('scanflight'), 'foco en scanflight');
  Lunar.escanearViaje(s);
  // Paso 2 Viaje: Mantener
  g = Lunar.guiaPaso(s);
  check(g.paso === 2, 'viaje paso 2');
  check(g.selector.includes('keep'), 'foco en keep');
  Lunar.decidir(s, false);
  // Descenso listo
  g = Lunar.guiaPaso(s);
  check(g.selector.includes('land'), 'foco en land');
  Lunar.descender(s);
  // Superficie: Movimiento
  g = Lunar.guiaPaso(s);
  check(g.paso === 1, 'superficie paso 1 movimiento');
  check(g.selector.includes('field'), 'foco en canvas');
}
console.log('Lunar: '+checks+' comprobaciones pasaron (12 misiones completas, progresión, 6 finales y audio).');

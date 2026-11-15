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
  const s=Lunar.nuevo();Lunar.cambiar(s,'equipo','bat100');const p=Lunar.proyectar(s);
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
console.log('Lunar: '+checks+' comprobaciones pasaron (12 misiones completas y casos de riesgo).');

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
// Progresión de dificultad y desbloqueo de sitios (Connecting Ridge -> Shackleton -> Gerlache)
{
  const s=Lunar.nuevo();
  check(Lunar.esDesbloqueado(s,'Site01'),'Site01 inicial desbloqueado');
  check(!Lunar.esDesbloqueado(s,'Site11'),'Site11 bloqueado al inicio');
  s.sitio='Site01';
  s.resultado='exito';
  s.muestras.entregadas=['Núcleo'];
  const u1=Lunar.desbloquearSiguiente(s);
  check(u1==='Site04','Completar Site01 desbloquea Site04');
  check(Lunar.esDesbloqueado(s,'Site04'),'Site04 ahora desbloqueado');
  s.sitio='Site04';
  const u2=Lunar.desbloquearSiguiente(s);
  check(u2==='Site11','Completar Site04 desbloquea Site11');
  check(Lunar.esDesbloqueado(s,'Site11'),'Site11 ahora desbloqueado');
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
// Niveles que suman sistemas: básico (energía), intermedio (+ oxígeno, masa y presupuesto), avanzado (+ combustible y escáner)
{
  const elegir=(s,ids)=>ids.forEach(id=>Lunar.cambiar(s,'equipo',id));
  const ir=(s,destino)=>walk(s,Lunar.camino(Lunar.map(s),s.pos,destino,Lunar.masa(s)));
  const jugar=(s,corregir=false)=>{land(s,corregir);ir(s,Lunar.map(s).target);check(Lunar.interactuar(s).ok,'perfora');walk(s,s.retorno.path);check(Lunar.interactuar(s).ok,'entrega');return Lunar.informe(s);};

  // Lunar.nuevo() a secas conserva todos los sistemas (compatibilidad con el motor original)
  check(Object.values(Lunar.sistemas(Lunar.nuevo())).every(Boolean),'sin nivel, todos los sistemas activos');

  // --- nivel 1: solo ruta y batería ---
  const b=Lunar.iniciarNivel('Site01',null);
  check(b.sitio==='Site01'&&b.modoNivel,'nivel básico en Connecting Ridge');
  check(!Lunar.sistemas(b).oxigeno&&!Lunar.sistemas(b).carga&&!Lunar.sistemas(b).combustible&&!Lunar.sistemas(b).escaner,'básico: solo energía');
  check(!b.equipo.some(id=>Motor.obj(id).tipo==='bateria'),'básico: la batería la elige el jugador');
  check(b.equipo.includes('taladro')&&b.equipo.includes('cont1')&&b.equipo.includes('o2chico'),'básico: el resto del equipo ya va a bordo');
  check(Lunar.evaluar(b).bloqueos.some(x=>/batería/.test(x)),'sin batería no se puede lanzar');
  for(const bat of ['bat100','bat160'])for(const ruta of ['directa','ahorro']) {
    const s=Lunar.iniciarNivel('Site01',null);Lunar.cambiar(s,'ruta',ruta);elegir(s,[bat]);
    const v=Lunar.evaluar(s);check(!v.bloqueos.length&&!v.riesgos.length&&v.energia==='ok','básico: '+bat+' por '+ruta+' es un plan sólido');
    const r=jugar(s);check(r.resultado==='exito'&&r.final.rango==='S','básico: se gana con rango S');
    close(s.recursos.oxigeno,Motor.totales(s).oxigeno,'básico: el oxígeno no se consume');
    check(r.resumen.frases.length>=2&&typeof r.resumen.consejo==='string','el informe trae resumen y consejo');
    check((bat==='bat160')===r.resumen.frases.some(x=>/sobró muchísima/.test(x)),'solo la batería grande deja energía de sobra en el básico');
  }
  {
    // sin escáner en el nivel, la señal extra no existe
    const s=Lunar.iniciarNivel('Site01',null);elegir(s,['bat160']);land(s);ir(s,Lunar.map(s).extra);
    check(Lunar.contexto(s)===null,'básico: no hay muestra extra que escanear');
  }

  // --- nivel 2: presupuesto de 950 obliga a elegir ---
  check(SITIOS_LUNARES.Site04.presupuesto===950&&Lunar.iniciarNivel('Site04',null).presupuesto.total===950,'intermedio: presupuesto propio');
  {
    const s=Lunar.iniciarNivel('Site04',null);elegir(s,['bat160','o2grande']);
    check(Lunar.evaluar(s).bloqueos.some(x=>/créditos/.test(x)),'intermedio: batería grande + tanque grande no cabe en el presupuesto');
    Lunar.probar(s);check(!Lunar.lanzar(s).ok,'y no deja lanzar');
  }
  {
    // batería chica + tanque grande: el tanque que sobra pesa, y ese peso es el que deja varado
    const s=Lunar.iniciarNivel('Site04',null);Lunar.cambiar(s,'ruta','directa');elegir(s,['bat100','o2grande']);
    const v=Lunar.evaluar(s);check(v.energia==='falta'&&v.riesgos.some(x=>/NO alcanza/.test(x)),'intermedio: batería chica por la ruta directa no alcanza, y se avisa');
    Lunar.probar(s);check(Lunar.lanzar(s).ok,'pero lanzar con riesgo está permitido: equivocarse es la lección');
    Lunar.escanearViaje(s);Lunar.decidir(s,false);Lunar.descender(s);
    walk(s,s.aterrizaje.ida);Lunar.interactuar(s);
    // vuelve por el camino más barato hasta que ya no puede dar un paso
    for(let i=0;i<400&&s.etapa==='superficie';i++) {
      const p=s.retorno.path[1];if(!p)break;
      if(Lunar.mover(s,p[0]-s.pos[0],p[1]-s.pos[1])||s.etapa!=='superficie')continue;
      // el paso del camino ya no se puede pagar: gasta lo que quede en cualquier paso posible
      const d=[[1,0],[-1,0],[0,1],[0,-1]].find(d=>Lunar.transitable(Lunar.map(s),[s.pos[0]+d[0],s.pos[1]+d[1]])&&Lunar.costo(Lunar.map(s),s.pos,[s.pos[0]+d[0],s.pos[1]+d[1]],Lunar.masa(s)).wh<=s.recursos.energiaWh);
      if(d)Lunar.mover(s,...d);
    }
    check(s.resultado==='varado'&&s.agotado==='energia','siguiendo la ruta directa con batería chica se queda varado por energía');
    const r=Lunar.informe(s);check(r.final.rango==='F'&&r.resumen.frases.some(x=>/salía corto/.test(x)),'el informe dice que el plan ya salía corto');
    check(/batería más grande/.test(r.resumen.consejo),'y aconseja qué cambiar');
    // repetir conserva las decisiones para cambiar solo una
    const rep=Lunar.iniciarNivel('Site04',s);
    check(rep.etapa==='hangar'&&rep.ruta==='directa'&&rep.equipo.includes('bat100')&&rep.equipo.includes('o2grande'),'repetir conserva ruta y equipo');
    check(rep.anterior&&rep.anterior.final.rango==='F','repetir recuerda el resultado anterior');
    check(rep.presupuesto.total===950&&Lunar.sistemas(rep).oxigeno&&!Lunar.sistemas(rep).combustible,'repetir conserva las reglas del nivel');
    elegir(rep,['o2chico']);const r2=jugar(rep);check(r2.resultado==='exito','cambiando solo el tanque por el ligero ya se vuelve');
    check(r2.resumen.frases.some(x=>/muy justo/.test(x)),'pero el informe avisa de que el margen quedó al límite');
    // empezar otro nivel no hereda el equipo
    const otro=Lunar.iniciarNivel('Site01',rep);check(!otro.equipo.includes('bat160')&&otro.anterior===null,'un nivel nuevo empieza limpio');
  }
  {
    const s=Lunar.iniciarNivel('Site04',null);elegir(s,['bat160','o2chico']);const antes=Motor.totales(s).oxigeno;jugar(s);
    check(s.recursos.oxigeno<antes,'intermedio: el oxígeno sí se consume');
  }

  // --- nivel 3: el combustible para corregir decide la misión ---
  check(SITIOS_LUNARES.Site11.presupuesto===1200&&Object.values(SITIOS_LUNARES.Site11.sistemas).every(Boolean),'avanzado: todos los sistemas');
  {
    const s=Lunar.iniciarNivel('Site11',null);elegir(s,['bat160','o2chico']);
    const v=Lunar.evaluar(s);check(v.energia==='justo'&&v.cerca===null,'avanzado: sin combustible el plan va justo y no hay corrección posible');
    Lunar.probar(s);Lunar.lanzar(s);Lunar.escanearViaje(s);check(!Lunar.decidir(s,true).ok,'Halcón sin extra no puede corregir');
  }
  {
    const s=Lunar.iniciarNivel('Site11',null);elegir(s,['bat160','o2chico','fuelextra']);
    const v=Lunar.evaluar(s);check(v.energia==='corrigiendo'&&v.riesgos.some(x=>/corriges el descenso/.test(x)),'avanzado: el aviso dice que el plan depende de corregir');
    const r=jugar(s,true);check(r.resultado==='exito'&&r.final.rango==='S','avanzado: corrigiendo se gana con rango S');
    check(r.resumen.frases.some(x=>/Corregir el descenso/.test(x)),'el informe atribuye el éxito a la corrección');
  }
  {
    const s=Lunar.iniciarNivel('Site11',null);Lunar.cambiar(s,'cohete','titan');elegir(s,['bat160','o2chico']);
    check(Lunar.evaluar(s).cerca!==null,'Titán trae combustible para corregir sin el extra');
    check(jugar(s,true).final.rango==='S','avanzado: la ruta del Titán también gana');
    const caro=Lunar.iniciarNivel('Site11',null);Lunar.cambiar(caro,'cohete','titan');elegir(caro,['bat160','o2chico','escaner','cont2']);
    check(Lunar.evaluar(caro).bloqueos.some(x=>/créditos/.test(x)),'pero con Titán no alcanza el dinero para el contenedor doble');
  }
  {
    // el rango máximo exige todo: combustible, escáner y contenedor doble, a 2 kg del límite
    const s=Lunar.iniciarNivel('Site11',null);elegir(s,['bat160','o2chico','fuelextra','escaner','cont2']);
    check(s.presupuesto.gastado===1140&&s.masa.usada===118&&!Lunar.evaluar(s).bloqueos.length,'el plan completo cabe en presupuesto y masa');
    land(s,true);ir(s,Lunar.map(s).extra);
    check(Lunar.contexto(s).accion==='escanear','avanzado: la señal extra existe');Lunar.interactuar(s);
    check(Lunar.contexto(s).aviso===null,'con contenedor doble no hay aviso de espacio');Lunar.interactuar(s);
    ir(s,Lunar.map(s).target);Lunar.interactuar(s);walk(s,s.retorno.path);Lunar.interactuar(s);
    const r=Lunar.informe(s);check(r.entregadas===2&&r.final.rango==='S+','avanzado: dos muestras con reserva dan el rango S+');
  }
  {
    // con contenedor simple, la muestra extra dejaría fuera al núcleo: se avisa antes
    const s=Lunar.iniciarNivel('Site11',null);elegir(s,['bat160','o2chico','fuelextra','escaner']);land(s,true);
    ir(s,Lunar.map(s).extra);Lunar.interactuar(s);
    check(/no entrará/.test(Lunar.contexto(s).aviso||''),'aviso: con un solo hueco, la extra deja fuera al núcleo');
  }
}
console.log('Lunar: '+checks+' comprobaciones pasaron (12 misiones completas, progresión, 6 finales, audio y los 3 niveles).');

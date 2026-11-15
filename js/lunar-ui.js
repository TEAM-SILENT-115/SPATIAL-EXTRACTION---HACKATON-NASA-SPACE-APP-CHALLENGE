/* DOM/canvas adapter. All resource and route rules live in Lunar. */
var LunarUI = (function () {
  'use strict';
  let s=Lunar.nuevo(),root,intro=true,modal=null,category=0,selected=0,message='Diseña el viaje que te traerá de vuelta.',keys={},elapsed=0,last=0;
  const R=REGLAS_LUNARES, n=v=>Number(v).toFixed(1), esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn=(a,t,x='',off=false,extra='')=>`<button class="btn ${extra}" data-l="${a}" data-x="${x}" ${off?'disabled':''}>${t}</button>`;
  const names={directa:'Ruta directa',ahorro:'Ruta de ahorro'};
  function header() {
    return `<header class="l-header"><div><b>MISIÓN UMBRAL</b><small>AGENCIA DE EXPLORACIÓN LUNAR</small></div><nav>${['hangar','viaje','superficie','informe'].map((x,i)=>`<span class="${s.etapa===x?'active':''}">${'0'+(i+1)} ${['PLANEAR','VIAJAR','EXPLORAR','APRENDER'][i]}</span>`).join('')}</nav>${btn('help','CÓMO JUGAR')}${btn('credits','CRÉDITOS')}</header>`;
  }
  function tutorial() {return s.tutorial.activo?`<aside class="banner-tutorial"><b class="aida-avatar">✦ AIDA</b><p>${esc(Lunar.guia(s))}</p>${btn('skip','SALTAR GUÍA','','','mini')}</aside>`:'';}
  function introHTML() {
    return `<div class="l-intro"><canvas id="l-hero" width="400" height="300" aria-label="Mapa lunar de Shackleton"></canvas><section><p class="l-kicker">NASA SPACE APPS · DEMO DEL EQUIPO</p><h1>MISIÓN<br><em>UMBRAL</em></h1><p class="l-lead">La ciencia empieza con un buen plan.<br>Y termina cuando logras regresar.</p><p>Recupera un núcleo del cráter y entrégalo en tu módulo. Elige ruta, herramientas y reservas; después comprueba tu diseño en terreno lunar.</p><div class="fila-botones">${btn('play','JUGAR','','','grande')}${btn('tutorial','CÓMO JUGAR','','','grande')}</div><small>3 sitios lunares · Pendientes reales LOLA · Arte original<br>Sin conexión · WASD / flechas · E interactúa · I inventario</small></section></div>`;
  }
  function routeCard(r) {
    const p=Lunar.proyectar(s,r);
    return `<button data-l="ruta" data-x="${r}" class="l-route ${s.ruta===r?'chosen':''}"><b>${s.ruta===r?'●':'○'} ${names[r]}</b><span>${p.distancia} m ida + vuelta · ${n(p.total)} Wh</span><small>Pendiente media ida ${n(p.a.media)}° · máx. ${n(p.a.max)}°</small></button>`;
  }
  function itemCategory(o) {return o.tipo==='herramienta'?0:['bateria','combustible'].includes(o.tipo)?1:o.tipo==='oxigeno'?2:3;}
  function inventoryHTML(hangar) {
    const items=DATOS.objetos.filter(o=>itemCategory(o)===category&&(hangar||s.equipo.includes(o.id)));
    const samples=category===3&&!hangar?s.muestras.recogidas:[];
    selected=Math.min(selected,Math.max(0,items.length+samples.length-1));
    const o=items[selected];
    return `<div class="l-tabs" role="tablist">${R.categorias.map((c,i)=>`<button role="tab" aria-selected="${i===category}" class="${i===category?'chosen':''}" data-l="category" data-x="${i}">${c}</button>`).join('')}</div><div class="l-items">${items.map((o,i)=>`<button data-l="select" data-x="${i}" class="${i===selected?'chosen':''}"><span>${o.icono} ${o.nombre}</span><small>×${s.equipo.includes(o.id)?1:0} ${s.equipo.includes(o.id)?'✓ Equipado':''}</small></button>`).join('')}${samples.map((name,i)=>`<button data-l="select" data-x="${items.length+i}" class="${selected===items.length+i?'chosen':''}">◇ ${esc(name)} <small>×1 · Sin entregar</small></button>`).join('')}${!items.length&&!samples.length?'<p>Sin objetos en esta categoría.</p>':''}</div><div class="l-detail">${o?`<b>${o.icono} ${o.nombre}</b><p>${esc(R.usos[o.id])}</p><small>${o.masa} kg · ${o.costo} créditos</small>${hangar?btn('equipo',s.equipo.includes(o.id)?'QUITAR':'EQUIPAR',o.id):''}`:samples.length?'<b>◇ Muestra científica</b><p>1 kg · 100 puntos al entregarla. Llévala al módulo antes de agotar los recursos.</p>':'<p>Selecciona una categoría para ver su equipo.</p>'}</div><p class="l-load">Carga usada <b>${Lunar.masa(s)} / ${s.masa.capacidad} kg</b> · Disponible ${s.masa.capacidad-Lunar.masa(s)} kg</p>`;
  }
  function hangarHTML() {
    const v=Lunar.evaluar(s),p=v.p,t=v.t;
    return `<main class="l-hangar"><section class="l-panel"><p class="l-kicker">01 / DESARROLLAR MISIÓN</p><h2>Recupera el núcleo.<br>Entrégalo en el módulo.</h2><label>Zona científica <select data-l="site" aria-label="Zona científica">${MAPAS_NASA.map(m=>`<option value="${m.id}" ${s.sitio===m.id?'selected':''}>${m.name}</option>`).join('')}</select></label><canvas id="l-map" width="400" height="300" aria-label="Módulo, objetivo y dos rutas sobre pendientes NASA"></canvas><div class="l-legend"><span>▣ Módulo</span><span>◇ Núcleo</span><span>··· Directa</span><span>━ Ahorro</span></div>${routeCard('directa')}${routeCard('ahorro')}<small>Gris: suave · rayado: &gt;15° · negro: &gt;27° o sin datos, intransitable.</small></section><section class="l-panel"><p class="l-kicker">02 / EQUIPO Y CARGA ÚTIL</p><label>Lanzador <select data-l="rocket" aria-label="Lanzador">${DATOS.cohetes.map(c=>`<option value="${c.id}" ${s.cohete===c.id?'selected':''}>${c.nombre} · ${c.capacidadMasa} kg · ${c.costo} cr</option>`).join('')}</select></label>${inventoryHTML(true)}<p>Presupuesto <b class="${s.presupuesto.gastado>s.presupuesto.total?'alerta':''}">${s.presupuesto.gastado} / ${s.presupuesto.total} cr</b></p><small>La masa también encarece cada metro. Deja 1 kg libre por muestra.</small></section><section class="l-panel"><p class="l-kicker">03 / PROBAR EL PLAN</p><div class="l-big"><strong>${n(t.energia)}</strong><span>Wh disponibles</span></div><div class="l-energy"><span style="width:${Math.min(100,p.total/Math.max(1,t.energia)*100)}%"></span></div><table class="l-table"><tr><td>Ida · ${p.a.metros} m</td><td>${n(p.a.wh)} Wh</td></tr><tr><td>Perforar el núcleo</td><td>${n(p.tarea)} Wh</td></tr><tr><td>Regreso con 1 kg · ${p.b.metros} m</td><td>${n(p.b.wh)} Wh</td></tr><tr><th>Consumo previsto</th><th>${n(p.total)} Wh</th></tr><tr><td>Reserva recomendada (15%)</td><td>${n(p.reserva)} Wh</td></tr><tr><td>Reserva al volver</td><td class="${p.margen<p.reserva?'ambar':'ok'}">${n(p.margen)} Wh</td></tr><tr><td>O₂ disponible / previsto</td><td>${t.oxigeno} / ${n(p.ox)} u</td></tr><tr><td>Combustible de maniobra</td><td>${t.combustible} u</td></tr></table><small>Reserva = energía adicional para desvíos o trabajo extra.</small><div class="l-check ${v.bloqueos.length?'danger':''}">${v.bloqueos.map(x=>`<p>⛔ ${x}</p>`).join('')}${v.riesgos.map(x=>`<p>⚠ ${x}</p>`).join('')}${!v.bloqueos.length&&!v.riesgos.length?'<p>✓ Equipo y reserva cubren la misión prevista.</p>':''}</div><div class="fila-botones">${btn('test','PROBAR PLAN')}${btn('formula','VER CÁLCULO')}</div>${s.prueba?'<p class="ok">✓ Prueba completada. Revisa el resultado antes de lanzar.</p>':''}${btn('launch',v.riesgos.length?'LANZAR CON RIESGO':'LANZAR','',!!v.bloqueos.length||!s.prueba,'grande')}</section></main>`;
  }
  function travelHTML() {
    const normal=Lunar.proyectar(s),near=Lunar.proyectar(s,s.ruta,Lunar.map(s).nearModule);
    return `<main class="l-travel"><section><p class="l-kicker">EN VUELO / ${esc(Lunar.map(s).name)}</p><h1>Una decisión antes<br>de tocar la Luna.</h1><p>El equipo y la ruta ${names[s.ruta].toLowerCase()} siguen a bordo.</p><canvas id="l-ship" width="400" height="150"></canvas><p>Combustible ${s.recursos.combustible} u · Batería ${s.recursos.energiaWh} Wh · O₂ ${s.recursos.oxigeno} u</p></section><section class="l-panel"><h2>Reconocimiento del descenso</h2>${!s.viaje.escaneado?`<p>Escanea para evaluar una plataforma alternativa más cercana al objetivo.</p>${btn('scanflight','ESCANEAR DESCENSO')}`:`<p>El escaneo identifica una plataforma transitable. Reubicar el módulo reduce la caminata, pero consume combustible.</p><div class="l-options"><article><h3>Mantener</h3><p>${normal.distancia} m · ${n(normal.total)} Wh</p><p>Combustible: −0 u<br>Reserva final: ${n(s.recursos.energiaWh-normal.total)} Wh</p>${btn('keep','MANTENER','',s.viaje.decidido)}</article><article><h3>Corregir</h3><p>${near.distancia} m · ${n(near.total)} Wh</p><p>Combustible: −30 u<br>Reserva final: ${n(s.recursos.energiaWh-near.total)} Wh</p>${btn('correct','CORREGIR','',s.viaje.decidido||s.recursos.combustible<30)}${s.recursos.combustible<30?'<small>Falta combustible: se equipaba en la agencia.</small>':''}</article></div>`}${s.viaje.decidido?`<p class="ok">✓ ${s.viaje.corrigio?'Corrección':'Trayectoria original'} confirmada.</p>${btn('land','DESCENDER','','','grande')}`:''}<small>Pendientes conocidas; plataforma y evento diseñados para la simulación.</small></section></main>`;
  }
  function surfaceHTML() {
    const c=Lunar.contexto(s),r=s.retorno,risk=s.recursos.energiaWh<r.wh||s.recursos.oxigeno<r.ox;
    return `<main class="l-surface"><div class="l-hud"><div><small>OBJETIVO ACTUAL</small><b>${s.tomada?'Entrega el núcleo en el módulo M':'Recupera el núcleo del cráter ◇'}</b></div><div><small>ENERGÍA</small><b>${n(s.recursos.energiaWh)} Wh</b></div><div class="${risk?'alerta':'ok'}"><small>REGRESO TRANSITABLE · LÍNEA AZUL</small><b>${n(r.wh)} Wh · ${r.metros} m</b></div><div><small>O₂ / PARA VOLVER</small><b>${n(s.recursos.oxigeno)} / ${n(r.ox)} u</b></div></div><div class="l-field"><canvas id="l-field" width="640" height="320" tabindex="0" aria-label="Superficie lunar. WASD o flechas para moverte; E para interactuar"></canvas><div class="l-minimap"><canvas id="l-mini" width="160" height="120"></canvas><span>${esc(Lunar.map(s).name)}</span></div><span class="l-compass">N ↑</span></div><div class="l-interaction"><div>${c?`<b>E · ${c.texto}${c.wh?' · '+c.wh+' Wh':''}</b><small>${c.falta|| (c.wh?'Tras la acción: '+n(s.recursos.energiaWh-c.wh-r.wh)+' Wh sobre el regreso actual (puede aumentar al cargar).':'Las muestras solo cuentan al entregarlas.')}</small>`:'<b>Sigue las marcas hacia ◇ · vuelve a M para entregar.</b><small>Ámbar: plan de ida · azul: regreso de menor consumo · puntos: huellas</small>'}</div>${c?btn('interact','E · '+c.texto):''}${btn('inventory','I · INVENTARIO')}${btn('pause','ESC · PAUSA')}</div></main>`;
  }
  function reportHTML() {
    const r=Lunar.informe(s),titles={exito:'Ciencia a salvo.',parcial:'Regresaste con ciencia parcial.',sin_muestra:'Regresaste sin muestras.',varado:'Se agotó el margen.'};
    return `<main class="l-report"><p class="l-kicker">INFORME / ${esc(Lunar.map(s).name)}</p><h1>${titles[s.resultado]}</h1><div class="l-score"><strong>+${r.ciencia}</strong><span>PROGRESO CIENTÍFICO<br>${r.entregadas} muestras entregadas</span><b>${r.reservaCumplida?'★ PLANIFICACIÓN RECONOCIDA':'◇ REVISA TU RESERVA'}</b></div><p class="l-cause">${esc(r.causa)}</p><table class="l-table"><tr><th>Indicador</th><th>Plan de agencia</th><th>Real</th></tr><tr><td>Distancia</td><td>${s.plan.distancia} m</td><td>${r.distancia} m</td></tr><tr><td>Energía consumida</td><td>${n(s.plan.total)} Wh</td><td>${n(r.consumo)} Wh</td></tr><tr><td>Reserva al finalizar</td><td>${n(s.plan.margen)} Wh</td><td>${n(r.restante)} Wh</td></tr></table><p>Movimiento: ${n(s.movimientoWh)} Wh · Acciones: ${n(s.accionesWh)} Wh · Reserva recomendada: ${n(s.plan.reserva)} Wh.</p>${s.anterior?`<div class="l-check">Partida anterior: ${s.anterior.ciencia} puntos · ${n(s.anterior.consumo)} Wh gastados · ${n(s.anterior.restante)} Wh restantes. Ahora: ${r.ciencia} puntos · ${n(r.consumo)} Wh gastados. Compara la batería, la ruta y tus desvíos.</div>`:''}<div class="fila-botones">${btn('repeat','REPETIR CAMBIANDO EL PLAN','','','grande')}${btn('new','MISIÓN NUEVA')}</div></main>`;
  }
  function modalHTML() {
    if(!modal)return '';
    let body='';
    if(modal==='inventory')body=`<h2>INVENTARIO · ${s.muestras.recogidas.length}/${Motor.totales(s).capacidadMuestras} muestras</h2>${inventoryHTML(false)}<small>← → categorías · ↑ ↓ objetos · I / Esc cerrar. Movimiento y recursos pausados.</small>`;
    if(modal==='pause')body='<h2>PAUSA</h2><p>La misión está detenida. No consumes recursos.</p>'+btn('help','ABRIR GUÍA AIDA');
    if(modal==='formula')body=`<h2>Un cálculo para planear y explorar</h2><p>Por cada tramo entre casillas: distancia en m × ${R.whMetro} Wh/m × (1 + masa / ${R.masaReferencia} kg) × (1 + pendiente media / ${R.pendienteReferencia}°)².</p><p>La ida usa tu equipo; el regreso añade 1 kg de muestra. La ruta directa minimiza metros, la de ahorro minimiza Wh. Regresar desde cualquier posición usa un camino transitable de menor consumo.</p><p>Trabajo: perforar 25 Wh, escanear 5 Wh, recoger 3 Wh. O₂: ${R.oxMetro} unidades/m más trabajo. Reserva recomendada: 15% del total. No se consume al estar quieto.</p><p>La pendiente es magnitud de inclinación: NO sabemos si caminas cuesta arriba o abajo.</p>`;
    if(modal==='credits')body=`<h2>Datos reales. Reglas de juego.</h2><p>Pendientes: NASA Goddard / LRO-LOLA, productos de Barker et al. (2021), sitios 04, 01 y 11. <a href="https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/" target="_blank" rel="noopener">Catálogo oficial</a>.</p><p>GeoTIFF originales: 5 m/píxel. Recortes de 160 × 120 píxeles, promediados en bloques 4 × 4: casillas de 20 m. Origen y georreferencia conservados en los datos procesados.</p><p>Pendientes en grados; sin datos y pendientes mayores a 27° bloquean el paso según una regla de nuestra simulación. No inferimos orientación de subida/bajada.</p><p>Wh, masa de muestras, colocación de módulos, recompensas, combustible y oxígeno: reglas educativas del equipo, no predicciones NASA.</p><p><a href="https://science.nasa.gov/mission/viper/lunar-operations/" target="_blank" rel="noopener">VIPER: referencia para planificar operaciones lunares</a>. Astronauta, nave, módulo y pixel art: originales de Misión Umbral. Sin logos NASA ni API de IA.</p>`;
    return `<div class="velo"><section class="panel modal l-modal" role="dialog" aria-modal="true">${body}${btn('close','CERRAR · ESC')}</section></div>`;
  }
  function drawMap(id,mini=false,hero=false) {
    const cv=document.getElementById(id);if(!cv)return;const ctx=cv.getContext('2d'),m=Lunar.map(s),t=cv.width/m.width;
    ctx.imageSmoothingEnabled=false;
    terrain(ctx,m,t,0,0);
    const line=(path,color,dashed=false)=>{ctx.strokeStyle=color;ctx.lineWidth=mini?1:2;ctx.setLineDash(dashed?[3,3]:[]);ctx.beginPath();path.forEach((p,i)=>{const x=(p[0]+.5)*t,y=(p[1]+.5)*t;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);};
    if(!mini){line(Lunar.proyectar(s,'directa').ida,'#e6bd6a',true);line(Lunar.proyectar(s,'ahorro').ida,'#6dd6cf');}
    if(mini&&s.retorno)line(s.retorno.path,'#86e5f4');
    [[s.modulo||m.module,'#e6bd6a'],[m.target,'#ffffff'],[m.extra,'#79b5f2']].forEach(([p,color])=>{ctx.fillStyle=color;ctx.fillRect(p[0]*t-1,p[1]*t-1,Math.max(3,t),Math.max(3,t));});
    if(s.pos){ctx.fillStyle='#ff7785';ctx.fillRect(s.pos[0]*t,s.pos[1]*t,Math.max(3,t),Math.max(3,t));}
    if(!mini){ctx.font='bold 11px monospace';ctx.fillStyle='#fff';ctx.fillText('M',m.module[0]*t,m.module[1]*t-4);ctx.fillText('OBJETIVO',Math.min(cv.width-65,m.target[0]*t-25),m.target[1]*t-6);}
  }
  function terrain(ctx,m,t,ox,oy) {
    ctx.fillStyle='#101728';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++) {
      const p=m.slopes[y][x],px=Math.round(x*t-ox),py=Math.round(y*t-oy);if(px>ctx.canvas.width||py>ctx.canvas.height||px+t<0||py+t<0)continue;
      const v=p===null?15:Math.round(123-p*2.4);ctx.fillStyle=p===null||p>R.pendienteMax?'#172033':`rgb(${v-10},${v},${v+18})`;ctx.fillRect(px,py,t,t);
      ctx.fillStyle=p>15?'#303d54':'#8e9cad';ctx.fillRect(px+(x*7+y*3)%Math.max(1,t-3),py+(y*7+x*3)%Math.max(1,t-3),2,1);
      if(p>15){ctx.fillStyle=p>27?'#374256':'#56637b';ctx.fillRect(px+2,py+3,Math.max(1,t-4),1);}
    }
  }
  function drawSurface() {
    const cv=document.getElementById('l-field');if(!cv)return;const ctx=cv.getContext('2d'),m=Lunar.map(s),t=20;
    const ox=Math.max(0,Math.min(m.width*t-cv.width,(s.pos[0]+.5)*t-cv.width/2));
    const oy=Math.max(0,Math.min(m.height*t-cv.height,(s.pos[1]+.5)*t-cv.height/2));
    const xy=p=>[(p[0]+.5)*t-ox,(p[1]+.5)*t-oy];
    terrain(ctx,m,t,ox,oy);
    const path=(ps,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ps.forEach((p,i)=>{const [x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();};
    path(s.aterrizaje.ida,'#d7a24b',1);path(s.retorno.path,'#76d2e7',2);
    ctx.fillStyle='#c0c9ce';s.pasos.forEach(p=>{const [x,y]=xy(p);ctx.fillRect(x-3,y+3,2,1);ctx.fillRect(x+1,y+5,2,1);});
    const sprite=(name,p)=>{const [x,y]=xy(p);ctx.fillStyle='#202b3c';ctx.fillRect(x-7,y+4,16,4);UI.arte.pint(ctx,UI.arte[name],Math.round(x-UI.arte[name][0].length/2),Math.round(y-UI.arte[name].length/2));};
    sprite('modulo',s.modulo);
    const [tx,ty]=xy(m.target);ctx.strokeStyle='#e2eaf2';ctx.strokeRect(tx-8,ty-8,16,16);ctx.fillStyle='#1a2435';ctx.fillRect(tx-5,ty-5,10,10);
    if(!s.tomada)sprite('cristal',m.target);
    if(!s.extraTomada)sprite(s.revelada?'muestra':'roca',m.extra);
    ctx.font='bold 9px monospace';ctx.fillStyle='#fff';ctx.fillText(s.tomada?'EXTRAÍDO':'◇ NÚCLEO',tx-23,ty-14);
    const [mx,my]=xy(s.modulo);ctx.fillStyle='#f3d998';ctx.fillText('M · MÓDULO',mx-25,my-14);
    const [ex,ey]=xy(m.extra);ctx.fillStyle='#9fd6ff';if(!s.extraTomada)ctx.fillText(s.revelada?'MUESTRA':'? ESCANEO',ex-20,ey-12);
    sprite('astro',s.pos);drawMap('l-mini',true);
  }
  function drawShip() {
    const cv=document.getElementById('l-ship');if(!cv)return;const ctx=cv.getContext('2d');ctx.fillStyle='#0b1026';ctx.fillRect(0,0,400,150);UI.arte.estrellas(ctx,400,150,85);ctx.fillStyle='#8fa3cc';ctx.beginPath();ctx.arc(310,70,45,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a6a82';ctx.fillRect(310,50,17,10);ctx.fillRect(282,78,11,8);ctx.save();ctx.translate(90,30);ctx.scale(4,4);UI.arte.pint(ctx,UI.arte.cohete,0,0);ctx.restore();
  }
  function render() {
    const focus=document.activeElement?.dataset;const focusAction=focus?.l,focusX=focus?.x;
    root.innerHTML=intro?introHTML():header()+tutorial()+(s.etapa==='hangar'?hangarHTML():s.etapa==='viaje'?travelHTML():s.etapa==='superficie'?surfaceHTML():reportHTML())+`<footer class="l-footer" role="status">${esc(message)}</footer>`+modalHTML();
    if(intro)drawMap('l-hero',false,true);else if(s.etapa==='hangar')drawMap('l-map');else if(s.etapa==='superficie')drawSurface();else if(s.etapa==='viaje')drawShip();
    if(focusAction){const el=Array.from(root.querySelectorAll('[data-l]')).find(e=>e.dataset.l===focusAction&&e.dataset.x===focusX);if(el)el.focus({preventScroll:true});}
  }
  function act(a,x) {
    let result;
    if(a==='play'||a==='tutorial'){intro=false;s.tutorial.activo=a==='tutorial';}
    if(a==='help'){if(intro)intro=false;s.tutorial.activo=true;modal=null;}
    if(a==='skip')s.tutorial.activo=false;
    if(['credits','formula','inventory','pause'].includes(a)){modal=a;keys={};}
    if(a==='close')modal=null;
    if(a==='category'){category=Number(x);selected=0;}
    if(a==='select')selected=Number(x);
    if(['ruta','equipo','sitio','cohete'].includes(a)) {
      const before=Lunar.proyectar(s);Lunar.cambiar(s,a,x);const after=Lunar.proyectar(s);
      message=`Proyección ${n(before.total)} → ${n(after.total)} Wh; reserva ${n(before.margen)} → ${n(after.margen)} Wh. ${a==='ruta'?'Cambió la distancia y la pendiente del camino.':a==='equipo'?'Cambió la energía disponible o la masa transportada.':'Se recalcularon las condiciones del plan.'}`;
    }
    if(a==='test'){const v=Lunar.probar(s);message=v.bloqueos.length?v.bloqueos.join(' '):v.riesgos.length?'Plan con riesgo: '+v.riesgos.join(' '):'Plan probado: cubre trabajo, regreso y reserva recomendada.';}
    if(a==='launch')result=Lunar.lanzar(s);
    if(a==='scanflight')Lunar.escanearViaje(s);
    if(a==='keep'||a==='correct')result=Lunar.decidir(s,a==='correct');
    if(a==='land'){Lunar.descender(s);message='WASD / flechas: mover · E: interactuar · I: inventario · Esc: pausa. Llega al centro de los marcadores.';}
    if(a==='interact')result=Lunar.interactuar(s);
    if(a==='repeat'||a==='new'){const guide=s.tutorial.activo;s=Lunar.nuevo(a==='repeat'?s:null);s.tutorial.activo=guide;modal=null;keys={};category=0;selected=0;message='Recursos nuevos. Cambia una decisión y vuelve a probar.';}
    if(result)message=result.msg;
    render();
  }
  const directions={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  function move(d){const old=s.etapa;if(Lunar.mover(s,...d)||old!==s.etapa)render();}
  function keydown(e) {
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&k!=='Escape')return;
    if(k==='Escape'){e.preventDefault();keys={};modal=modal?null:!intro?'pause':null;render();return;}
    if(modal){
      if(k==='i'&&modal==='inventory'){act('close');e.preventDefault();return;}
      if(directions[k]){e.preventDefault();if(modal==='inventory'&&!e.repeat){if(['ArrowLeft','a','ArrowRight','d'].includes(k)){category=(category+(['ArrowLeft','a'].includes(k)?3:1))%4;selected=0;}else selected=Math.max(0,selected+(['ArrowUp','w'].includes(k)?-1:1));render();}return;}
      return;
    }
    if(s.etapa!=='superficie'||intro)return;
    if(k==='i'){e.preventDefault();if(!e.repeat)act('inventory');return;}
    if(k==='e'){e.preventDefault();if(!e.repeat)act('interact');return;}
    if(directions[k]){e.preventDefault();if(!keys[k]&&!e.repeat){keys={};keys[k]=true;elapsed=0;move(directions[k]);}}
  }
  function frame(time) {
    const dt=last?Math.min(.25,(time-last)/1000):0;last=time;
    if(!modal&&s.etapa==='superficie'&&!intro){const k=Object.keys(keys).find(k=>keys[k]);if(k){elapsed+=dt;while(elapsed>=R.pasoSegundos){elapsed-=R.pasoSegundos;move(directions[k]);if(s.etapa!=='superficie')break;}}else elapsed=0;}
    requestAnimationFrame(frame);
  }
  function iniciar() {
    root=document.getElementById('juego');root.classList.add('lunar');
    root.addEventListener('click',e=>{const b=e.target.closest('button[data-l]');if(b&&!b.disabled)act(b.dataset.l,b.dataset.x);});
    root.addEventListener('change',e=>{if(e.target.dataset.l==='site')act('sitio',e.target.value);if(e.target.dataset.l==='rocket')act('cohete',e.target.value);});
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',e=>{delete keys[e.key.length===1?e.key.toLowerCase():e.key];});
    window.addEventListener('blur',()=>{keys={};elapsed=0;});document.addEventListener('visibilitychange',()=>{keys={};elapsed=0;});
    const resize=()=>root.style.transform=`scale(${Math.min(innerWidth/1280,innerHeight/720)})`;window.addEventListener('resize',resize);resize();render();requestAnimationFrame(frame);
  }
  return {iniciar, snapshot:()=>JSON.parse(JSON.stringify(s))};
})();

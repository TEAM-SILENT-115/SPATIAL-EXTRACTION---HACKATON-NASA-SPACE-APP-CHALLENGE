/* Simulation rules, not NASA engineering estimates. */
var REGLAS_LUNARES = {
  pendienteMax: 27, whMetro: 0.012, masaReferencia: 200, pendienteReferencia: 15,
  oxMetro: 0.025, reserva: 0.15, muestraKg: 1, pasoSegundos: 0.14,
  acciones: { perforar: {wh:25,ox:5}, escanear: {wh:5,ox:2}, recoger: {wh:3,ox:2} },
  categorias: ['Herramientas','Energía','Soporte vital','Muestras'],
  usos: {
    taladro:'Habilita Perforar: extrae el núcleo científico (25 Wh).',
    escaner:'Habilita Escanear: revela una muestra opcional (5 Wh).',
    bat100:'Alimenta movimiento y acciones: 100 Wh al aterrizar.',
    bat160:'Alimenta movimiento y acciones: 160 Wh; añade 15 kg frente a la estándar.',
    o2chico:'Permite respirar: 100 unidades O₂, consumidas por distancia y trabajo.',
    o2grande:'Permite respirar: 160 unidades O₂ para explorar más.',
    cont1:'Habilita almacenar 1 muestra, todavía sin asegurar hasta entregarla.',
    cont2:'Habilita almacenar 2 muestras, todavía sin asegurar hasta entregarlas.',
    fuelextra:'Habilita corregir descenso: añade 30 unidades de combustible.'
  }
};

/* Progresión escalonada de dificultad de sitios NASA */
var SITIOS_LUNARES = {
  Site01: {
    id: 'Site01',
    nombre: 'Connecting Ridge',
    nivel: 1,
    dificultad: 'Fácil',
    estrellas: '★☆☆',
    claseDificultad: 'facil',
    descripcion: 'Pendientes suaves (2°-15°). Terreno estable ideal para calibrar batería y masa.',
    desbloqueoRequerido: null,
    desbloquea: 'Site04'
  },
  Site04: {
    id: 'Site04',
    nombre: 'Borde de Shackleton',
    nivel: 2,
    dificultad: 'Desafiante',
    estrellas: '★★☆',
    claseDificultad: 'medio',
    descripcion: 'Pendientes mixtas (10°-25°). Terreno estándar VIPER con trampas de sombra y cráter pronunciado.',
    desbloqueoRequerido: 'Site01',
    desbloquea: 'Site11'
  },
  Site11: {
    id: 'Site11',
    nombre: 'Borde de Gerlache',
    nivel: 3,
    dificultad: 'Extremo',
    estrellas: '★★★',
    claseDificultad: 'dificil',
    descripcion: 'Pendientes extremas (>25°). Zonas escarpadas intransitables que exigen optimización máxima de vatios.',
    desbloqueoRequerido: 'Site04',
    desbloquea: null
  }
};

/* Sistema de 6 finales basados en las decisiones del jugador */
var FINALES_LUNARES = {
  pionero: {
    id: 'pionero',
    rango: 'S+',
    titulo: 'PIONERO ARTEMIS — ESTÁNDAR DE ORO',
    subtitulo: 'Éxito Absoluto en el Polo Sur Lunar',
    color: '#f6d365',
    icono: '👑',
    resumen: 'Recuperaste el núcleo del cráter y la muestra secundaria manteniendo tu reserva intacta (≥15%).',
    epilogo: 'Tu rigor en la distribución de masa y energía superó los estándares de ingeniería espacial. La dirección de vuelo de la NASA archiva tu plan de misión como el protocolo de referencia para las futuras tripulaciones del programa Artemis en el Polo Sur.',
    leccion: 'La redundancia no significa sobrediseñar: significa reservar el margen exacto para responder a la incertidumbre sin poner en riesgo el retorno.'
  },
  maestro: {
    id: 'maestro',
    rango: 'S',
    titulo: 'INGENIERO MAESTRO — SIMULACIÓN EJEMPLAR',
    subtitulo: 'Planificación Óptima de Recursos',
    color: '#6dd6cf',
    icono: '⚙️',
    resumen: 'Objetivo científico primordial asegurado dentro del balance óptimo de presupuesto y batería.',
    epilogo: 'Demostraste que el diseño técnico disciplinado vence a la suerte. Tu cálculo entre masa de lanzamiento, vatios por metro y reserva de regreso permitió extraer el núcleo sin derrochar un solo crédito de la agencia.',
    leccion: 'Cada kilogramo que no subes en la rampa de despegue es energía que tu rover ahorra en cada metro de regolito lunar.'
  },
  revolucion: {
    id: 'revolucion',
    rango: 'A+',
    titulo: 'REVOLUCIÓN POLAR — FRONTERA CIENTÍFICA',
    subtitulo: 'Audacia Geológica en Cráter Profundo',
    color: '#86e5f4',
    icono: '🔬',
    resumen: 'Exploración de alto impacto con escáner y muestras extraídas en terreno escarpado.',
    epilogo: 'Las muestras obtenidas en las trampas frías permanentes confirman concentraciones de volátiles esenciales y agua congelada. Tu expedición marca el primer paso real hacia la extracción in-situ de recursos (ISRU) para una presencia humana sostenible.',
    leccion: 'La ciencia más valiosa suele estar en las pendientes más peligrosas; saber equipar el escáner y medir los vatios de desvío es lo que permite volver con vida.'
  },
  in_extremis: {
    id: 'in_extremis',
    rango: 'A',
    titulo: 'ODISEA MILAGROSA — AL FILO DEL ABISMO',
    subtitulo: 'Retorno Heroico con Margen Crítico',
    color: '#ff9f43',
    icono: '⚡',
    resumen: 'Muestra entregada en el módulo con batería en reserva de emergencia (≤5% Wh).',
    epilogo: 'La esclusa del módulo se selló mientras los indicadores de batería parpadeaban en rojo crítico con apenas unos vatios de margen. Una hazaña de nervios de acero que el Centro de Control de Vuelo recordará por generaciones.',
    leccion: 'Salvaste la misión por ingenio al límite, pero en operaciones espaciales reales este margen es insostenible. En tu próxima misión, añade más batería o elige la ruta de ahorro.'
  },
  tactico: {
    id: 'tactico',
    rango: 'B',
    titulo: 'RETORNO TÁCTICO — PRUDENCIA OPERATIVA',
    subtitulo: 'Supervivencia y Conservación de Activos',
    color: '#54a0ff',
    icono: '🛡️',
    resumen: 'Supiste abortar a tiempo al detectar margen insuficiente; salvaste la nave e instrumentos.',
    epilogo: 'Reconociste el punto de no retorno antes de quedar atrapado en la oscuridad del cráter. Aunque el núcleo profundo quedó atrás, la tripulación, los instrumentos y los datos de telemetría regresaron intactos a la Tierra.',
    leccion: 'En la exploración espacial, saber abortar es tan valioso como saber perforar. La codicia sin vatios de respaldo solo produce chatarra en la Luna.'
  },
  forense: {
    id: 'forense',
    rango: 'F',
    titulo: 'MONOLITO SILENCIOSO — TELEMETRÍA FORENSE',
    subtitulo: 'Misión Varada en Regolito Criogénico',
    color: '#ff6b6b',
    icono: '⚠️',
    resumen: 'La energía o el soporte vital se agotaron antes de alcanzar la esclusa del módulo.',
    epilogo: 'El rover se detuvo en las sombras permanentes a escasos metros de la salvación. El equipo de investigación de accidentes de la NASA aísla la causa raíz en la telemetría para recalibrar los simuladores.',
    leccion: 'El regolito no perdona. Si la subida o la masa de la muestra no se presupuestan antes del despegue, el margen se rompe en el camino de regreso. ¡Aprende de los datos y vuelve a intentarlo!'
  }
};

/* Sprites de animación: ciclo de caminata en 4 direcciones y efectos */
var SPRITES_ANIMADOS = {
  astro: {
    down: [
      [
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
      ],
      [
        '..FFF..',
        '.FVVVF.',
        '.FVVVF.',
        '..FFF..',
        '.FFFFF.',
        'FAFFFAF',
        'F.FFF.F',
        '..FFF..',
        '.FF.F..',
        '.FF....',
        '..F.FF.'
      ],
      [
        '..FFF..',
        '.FVVVF.',
        '.FVVVF.',
        '..FFF..',
        '.FFFFF.',
        'FAFFFAF',
        'F.FFF.F',
        '..FFF..',
        '..F.FF.',
        '....FF.',
        '.FF.F..'
      ]
    ],
    up: [
      [
        '..FFF..',
        '.FFFFF.',
        '.FFFFF.',
        '..FFF..',
        '.FAAAF.',
        'FFAAAFF',
        'F.FAAF.F',
        '..FFF..',
        '..F.F..',
        '..F.F..',
        '.FF.FF.'
      ],
      [
        '..FFF..',
        '.FFFFF.',
        '.FFFFF.',
        '..FFF..',
        '.FAAAF.',
        'FFAAAFF',
        'F.FAAF.F',
        '..FFF..',
        '.FF.F..',
        '.FF....',
        '..F.FF.'
      ],
      [
        '..FFF..',
        '.FFFFF.',
        '.FFFFF.',
        '..FFF..',
        '.FAAAF.',
        'FFAAAFF',
        'F.FAAF.F',
        '..FFF..',
        '..F.FF.',
        '....FF.',
        '.FF.F..'
      ]
    ],
    right: [
      [
        '..FFFF.',
        '.FFFFVV',
        '.FFFFVV',
        '..FFFF.',
        '.AFFFF.',
        '.AFFFFF',
        '..AFFFF',
        '...FFF.',
        '...F.F.',
        '...F.F.',
        '..FF.FF'
      ],
      [
        '..FFFF.',
        '.FFFFVV',
        '.FFFFVV',
        '..FFFF.',
        '.AFFFF.',
        '.AFFFFF',
        '..AFFFF',
        '...FFF.',
        '..FF.F.',
        '.FF....',
        '...F.FF'
      ],
      [
        '..FFFF.',
        '.FFFFVV',
        '.FFFFVV',
        '..FFFF.',
        '.AFFFF.',
        '.AFFFFF',
        '..AFFFF',
        '...FFF.',
        '...F.FF',
        '....FF.',
        '..FF.F.'
      ]
    ],
    left: [
      [
        '.FFFF..',
        'VVFFFF.',
        'VVFFFF.',
        '.FFFF..',
        '.FFFFFA',
        'FFFFFA.',
        'FFFFFA.',
        '.FFF...',
        '.F.F...',
        '.F.F...',
        'FF.FF..'
      ],
      [
        '.FFFF..',
        'VVFFFF.',
        'VVFFFF.',
        '.FFFF..',
        '.FFFFFA',
        'FFFFFA.',
        'FFFFFA.',
        '.FFF...',
        '.F.FF..',
        '....FF.',
        'FF.F...'
      ],
      [
        '.FFFF..',
        'VVFFFF.',
        'VVFFFF.',
        '.FFFF..',
        '.FFFFFA',
        'FFFFFA.',
        'FFFFFA.',
        '.FFF...',
        'FF.F...',
        '.FF....',
        '.F.FF..'
      ]
    ]
  },
  perforando: [
    '..FFF...',
    '.FVVVF..',
    '..FFF...',
    '.FFFFF..',
    'FAFFFAFF',
    'F.FFFFDF',
    '..FFFFD.',
    '..F..D..',
    '..F..D..',
    '.FF.DD..',
    '....ff..'
  ],
  emblemas: {
    'S+': [
      '..ffffffffff..',
      '.fAAAAAAAAAAf.',
      'fAAWWAAAAWWAAf',
      'fAAWWAAAAWWAAf',
      'fAAAAWWWWAAAAf',
      'fAAAAWWWWAAAAf',
      'fAAWWAAAAWWAAf',
      'fAAWWAAAAWWAAf',
      'fAAAAAAAAAAf..',
      '.fAAAAAAAAf...',
      '..fffffffff...'
    ],
    'S': [
      '..ffffffffff..',
      '.fAAAAAAAAAAf.',
      'fAAWWWWWWWWAAf',
      'fAAWWAAAAAAAAf',
      'fAAWWWWWWWWAAf',
      'fAAAAAAAAWWAAf',
      'fAAWWWWWWWWAAf',
      'fAAAAAAAAAAf..',
      '.fAAAAAAAAf...',
      '..fffffffff...'
    ],
    'A+': [
      '..ffffffffff..',
      '.fVVVVVVVVVVf.',
      'fVV..VVVV..VVf',
      'fVV..VVVV..VVf',
      'fVVVVVVVVVVVVf',
      'fVV..VVVV..VVf',
      'fVV..VVVV..VVf',
      'fVVVVVVVVVVf..',
      '.fVVVVVVVVf...',
      '..fffffffff...'
    ],
    'A': [
      '..ffffffffff..',
      '.fVVVVVVVVVVf.',
      'fVV..VVVV..VVf',
      'fVV..VVVV..VVf',
      'fVVVVVVVVVVVVf',
      'fVV..VVVV..VVf',
      'fVV..VVVV..VVf',
      'fVVVVVVVVVVf..',
      '.fVVVVVVVVf...',
      '..fffffffff...'
    ],
    'B': [
      '..ffffffffff..',
      '.fGGGGGGGGGGf.',
      'fGGWWWWWWGGAAf',
      'fGGWW..WWGGAAf',
      'fGGWWWWWWGGAAf',
      'fGGWW..WWGGAAf',
      'fGGWWWWWWGGAAf',
      'fGGGGGGGGGGf..',
      '.fGGGGGGGGf...',
      '..fffffffff...'
    ],
    'F': [
      '..RRRRRRRRRR..',
      '.RRRRRRRRRRRR.',
      'RR..RRRRRR..RR',
      'RR..RRRRRR..RR',
      'RRRR..RR..RRRR',
      'RRRR..RR..RRRR',
      'RR..RRRRRR..RR',
      'RR..RRRRRR..RR',
      '.RRRRRRRRRRRR.',
      '..RRRRRRRRRR..'
    ]
  }
};

/* Motor de sonido 100% sintetizado con Web Audio API (Cero archivos externos, 100% libre de derechos y offline) */
var LunarAudio = (function () {
  'use strict';
  var ctx = null;
  var activo = true;

  function obtenerCtx() {
    if (typeof window === 'undefined') return null;
    if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function tono(freq, tipo, dur, gainIni, gainFin) {
    if (!activo) return;
    var c = obtenerCtx();
    if (!c) return;
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = tipo || 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(gainIni || 0.05, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainFin || 0.0001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch (e) {}
  }

  return {
    click: function () { tono(960, 'sine', 0.03, 0.04); },
    paso: function () { tono(110, 'triangle', 0.04, 0.03); },
    perforar: function () {
      if (!activo) return;
      var c = obtenerCtx();
      if (!c) return;
      try {
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, c.currentTime);
        osc.frequency.linearRampToValueAtTime(130, c.currentTime + 0.25);
        gain.gain.setValueAtTime(0.06, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.3);
      } catch (e) {}
    },
    alerta: function () {
      tono(520, 'square', 0.07, 0.05);
      setTimeout(function () { tono(520, 'square', 0.07, 0.05); }, 110);
    },
    escanear: function () {
      [880, 1174, 1760].forEach(function (f, i) {
        setTimeout(function () { tono(f, 'sine', 0.08, 0.05); }, i * 60);
      });
    },
    exito: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        setTimeout(function () { tono(f, 'sine', 0.16, 0.07); }, i * 90);
      });
    },
    conmutar: function () {
      activo = !activo;
      if (activo) obtenerCtx();
      return activo;
    },
    estaActivo: function () { return activo; }
  };
})();

/* Puntos de interés y obstáculos geológicos en mapas lunares */
var PUNTOS_INTERES_LUNARES = {
  Site01: {
    obstaculos: [[12, 10], [13, 10], [20, 8], [21, 8], [26, 18], [27, 18]],
    escaneos: [
      { id: 'poi_01_a', pos: [15, 6], nombre: 'Cráter Secundario Menor', hallazgo: 'Esferas de vidrio volcánico piroclástico ricas en titanio.', ciencia: 15 },
      { id: 'poi_01_b', pos: [28, 20], nombre: 'Afloramiento de Ilmenita', hallazgo: 'Concentración de óxidos de hierro y titanio aptos para producción de oxígeno.', ciencia: 20 }
    ]
  },
  Site04: {
    obstaculos: [[10, 8], [11, 8], [18, 14], [19, 14], [28, 22], [29, 22]],
    escaneos: [
      { id: 'poi_04_a', pos: [8, 14], nombre: 'Escarpe de Compresión', hallazgo: 'Falla tectónica reciente con regolito puro no expuesto a meteoritos.', ciencia: 20 },
      { id: 'poi_04_b', pos: [22, 12], nombre: 'Trampa Térmica de Shackleton', hallazgo: 'Lectura infrarroja a 40 K con firma confirmada de hielo de agua atrapado.', ciencia: 25 }
    ]
  },
  Site11: {
    obstaculos: [[8, 10], [9, 10], [18, 18], [19, 18], [26, 12], [27, 12]],
    escaneos: [
      { id: 'poi_11_a', pos: [12, 8], nombre: 'Brecha de Impacto Anortosítica', hallazgo: 'Roca primordial de las tierras altas lunares generada durante el Gran Bombardeo.', ciencia: 25 },
      { id: 'poi_11_b', pos: [25, 20], nombre: 'Depósito Volátil de Gerlache', hallazgo: 'Anomalía de neutrones con alta proporción de hidrógeno polar conservado.', ciencia: 30 }
    ]
  }
};

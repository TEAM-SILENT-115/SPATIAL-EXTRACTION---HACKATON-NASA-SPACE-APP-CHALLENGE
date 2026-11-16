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
    desbloquea: 'Site04',
    // --- nivel jugable: qué sistemas entran en juego y qué decide el jugador ---
    nivelNombre: 'BÁSICO',
    lema: 'Lo esencial: llevar energía para ir y para volver.',
    decides: 'Ruta y batería',
    terreno: 'Terreno suave',
    sistemas: {oxigeno: false, carga: false, combustible: false, escaner: false, formulas: false},
    presupuesto: 1100,
    cohete: 'halcon',
    kit: ['o2chico', 'taladro', 'cont1'],
    pasos: ['ruta', 'bateria', 'revision'],
    novedades: []
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
    desbloquea: 'Site11',
    nivelNombre: 'INTERMEDIO',
    lema: 'Ahora también respiras, pesas y pagas.',
    decides: 'Ruta, batería y oxígeno',
    terreno: 'Pendientes mixtas',
    sistemas: {oxigeno: true, carga: true, combustible: false, escaner: false, formulas: false},
    // 950 créditos: caben batería grande + tanque chico, o batería chica +
    // tanque grande, pero no las dos mejoras a la vez. Hay que elegir.
    presupuesto: 950,
    cohete: 'halcon',
    kit: ['taladro', 'cont1'],
    pasos: ['ruta', 'bateria', 'oxigeno', 'revision'],
    novedades: [
      ['OXÍGENO', 'Se gasta con cada metro. Si se acaba, no vuelves.'],
      ['MASA', 'Cada kilo que subes a la nave hace que cada paso gaste más energía.'],
      ['PRESUPUESTO', 'No alcanza para llevarlo todo. Hay que elegir.']
    ]
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
    desbloquea: null,
    nivelNombre: 'AVANZADO',
    lema: 'Terreno extremo: aquí cada decisión cuenta.',
    decides: 'Todo: ruta, batería, oxígeno, cohete y extras',
    terreno: 'Pendientes extremas',
    sistemas: {oxigeno: true, carga: true, combustible: true, escaner: true, formulas: true},
    // 1200 créditos: alcanza para el plan completo con Halcón (1140), pero
    // entonces la carga queda a 2 kg del límite. Con Titán sobra carga y
    // falta dinero para el contenedor doble.
    presupuesto: 1200,
    cohete: 'halcon',
    kit: ['taladro', 'cont1'],
    pasos: ['ruta', 'bateria', 'oxigeno', 'cohete', 'extras', 'revision'],
    novedades: [
      ['COMBUSTIBLE', 'En vuelo puedes corregir el descenso y aterrizar más cerca del cráter.'],
      ['ESCÁNER', 'Revela una segunda muestra. Más ciencia, más riesgo.'],
      ['FÓRMULAS', 'Puedes abrir de dónde sale cada número.']
    ]
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

/* Textos de la interfaz guiada: la misión en tres pasos, lo que se decide en
   cada pantalla y la voz de AIDA. Solo texto: ninguna regla vive aquí. */
var TEXTOS_LUNARES = {
  lema: 'Planea. Explora. Y vuelve.',
  mision: [
    ['IR', 'Camina desde el módulo hasta el cráter.'],
    ['PERFORAR', 'Saca el núcleo de hielo que hay dentro.'],
    ['VOLVER', 'Regresa al módulo. La muestra solo cuenta si vuelves.']
  ],
  regla: 'Cada paso gasta energía, y en terreno empinado gasta mucho más. Si se acaba lejos del módulo, pierdes la muestra.',
  controles: [
    ['← ↑ ↓ →', 'Caminar (también W A S D)'],
    ['E', 'Perforar, recoger o entregar'],
    ['ESC', 'Pausa'],
    ['M', 'Sonido']
  ],
  pasos: {
    ruta: {
      corto: 'RUTA',
      titulo: '¿Por dónde vas al cráter?',
      ayuda: 'En el mapa, lo oscuro y rayado es terreno empinado: ahí cada paso gasta más energía.'
    },
    bateria: {
      corto: 'BATERÍA',
      titulo: '¿Qué batería llevas?',
      ayuda: 'La batería es toda la energía que tendrás para ir, perforar y volver. Se mide en Wh.'
    },
    oxigeno: {
      corto: 'OXÍGENO',
      titulo: '¿Cuánto oxígeno llevas?',
      ayuda: 'El oxígeno se gasta con cada metro que caminas. Llevar de más también pesa.'
    },
    cohete: {
      corto: 'COHETE',
      titulo: '¿En qué cohete viajas?',
      ayuda: 'El cohete decide cuántos kilos puedes subir y cuánto combustible tienes para maniobrar.'
    },
    extras: {
      corto: 'EXTRAS',
      titulo: '¿Qué extras subes a la nave?',
      ayuda: 'Ninguno es obligatorio. Cada uno abre una posibilidad, pero pesa y cuesta.'
    },
    revision: {
      corto: 'REVISIÓN',
      titulo: 'Revisa tu plan antes de lanzar',
      ayuda: 'Después del lanzamiento ya no podrás cambiar nada.'
    }
  },
  // Glosario: qué es cada cosa y qué implica al decidir. {reserva} y {pendiente}
  // se rellenan con las reglas vigentes.
  glosario: [
    ['ENERGÍA (Wh)', 'Lo que guarda la batería. Caminar, perforar y escanear la gastan. Si llega a cero lejos del módulo, no vuelves.'],
    ['RESERVA', 'La energía que te sobra al volver. Se recomienda el {reserva} % de lo que pide el viaje: es el colchón para un desvío.'],
    ['PENDIENTE', 'La inclinación del terreno. Cuenta al cuadrado: el doble de pendiente cuesta mucho más del doble. Por encima de {pendiente}° no se pasa.'],
    ['MASA', 'Los kilos que subes a la nave. Cada kilo encarece cada paso, y el cohete tiene un tope de carga.'],
    ['PRESUPUESTO', 'Los créditos de la misión. No alcanzan para todo: llevar algo es renunciar a otra cosa.'],
    ['OXÍGENO', 'Se gasta con cada metro que caminas. El tanque grande dura más, pero pesa y cuesta más.'],
    ['COMBUSTIBLE', 'Sirve para corregir el descenso y aterrizar más cerca del cráter. Si no lo subiste, esa opción no existe.'],
    ['NÚCLEO', 'La muestra de hielo del cráter: el objetivo científico. Solo cuenta si la entregas en el módulo.']
  ],
  // Qué es dato real y qué es regla de juego (créditos y documentación).
  real: 'Los tres mapas son pendientes reales del Polo Sur de la Luna, medidas por el altímetro LOLA de la sonda LRO de la NASA: 5 m por píxel, agrupados en celdas de 20 m. Connecting Ridge, el borde de Shackleton y el borde de De Gerlache son sitios que la NASA estudia para futuros alunizajes.',
  juego: 'La energía, el oxígeno, la masa, los costos y la posición del módulo, del cráter, de las rocas y de los hallazgos son reglas de juego: están pensadas para enseñar a decidir, no para simular una misión real.',
  fuente: 'Fuente: Barker et al. (2021), «Improved LOLA Elevation Maps for South Pole Landing Sites», Planetary and Space Science 203, 105119. Datos: NASA GSFC, PGDA, producto 78.',
  aida: {
    niveles: 'Soy AIDA, tu control de misión. Empieza por el nivel básico: cada nivel añade algo nuevo.',
    briefing: 'Regla de oro: una muestra que no vuelve al módulo no cuenta.',
    ruta: 'Elige una ruta y mira abajo cuánta energía pide el viaje.',
    bateria: 'Elige una batería. La barra de abajo te dice si alcanza para volver.',
    oxigeno: 'Mira cuánto oxígeno pide el viaje antes de cargar el tanque grande.',
    cohete: 'Un cohete más grande carga más, pero se come el presupuesto.',
    extras: 'Puedes lanzar sin extras. Súbelos solo si tienes un plan para usarlos.',
    despegue: 'Motores encendidos. Ya no hay vuelta atrás.',
    viaje: 'El plan quedó sellado: lo que no subiste a la nave, ya no lo tendrás.',
    viajeDecision: 'Corregir gasta combustible y te deja más cerca. Mantener lo conserva. Tú decides.',
    descenso: 'Contacto en tres, dos, uno…',
    caminar: 'Usa las flechas o W A S D para caminar. Sigue la línea punteada hasta el cráter.',
    alCrater: 'Vas bien. La barra de arriba te dice cuánto cuesta volver desde donde estás.',
    enCrater: 'Estás sobre el cráter. Pulsa E para perforar.',
    volver: 'Tienes el núcleo. Sigue la línea azul hasta el módulo y pulsa E para entregarlo.',
    justo: 'Cuidado: te queda poco margen para volver. Regresa ya.',
    sinRetorno: 'Ya no te alcanza para volver. Acércate todo lo que puedas al módulo.',
    extra: 'Hay una señal cerca. Desviarte cuesta energía: mira la barra antes de ir.',
    // Una frase por final: la personalidad de AIDA al cerrar la misión.
    finales: {
      pionero: 'Impecable. Voy a enmarcar este plan en la sala de control.',
      maestro: 'Limpio y sin dramas. Así da gusto dirigir una misión.',
      revolucion: 'Ciencia de primera en terreno de tercera. Bien jugado.',
      in_extremis: 'Volviste… con el corazón en la boca. No lo hagamos costumbre.',
      tactico: 'Sin muestra, pero con tripulación. Lo prefiero así.',
      forense: 'Perdimos la señal. Mira dónde se rompió el margen y vuelve a intentarlo.'
    }
  }
};

/* Retrato de AIDA para la barra de guía (dos cuadros: ojos abiertos y parpadeo). */
var SPRITE_AIDA = [
  [
    '..AAAAAA..',
    '.AWWWWWWA.',
    'AWWWWWWWWA',
    'AWVVWWVVWA',
    'AWVVWWVVWA',
    'AWWWWWWWWA',
    'AWWVVVVWWA',
    '.AWWWWWWA.',
    '..AAAAAA..'
  ],
  [
    '..AAAAAA..',
    '.AWWWWWWA.',
    'AWWWWWWWWA',
    'AWWWWWWWWA',
    'AWVVWWVVWA',
    'AWWWWWWWWA',
    'AWWVVVVWWA',
    '.AWWWWWWA.',
    '..AAAAAA..'
  ]
];

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
    // Despegue: rugido grave que sube de tono.
    despegue: function () {
      if (!activo) return;
      var c = obtenerCtx();
      if (!c) return;
      try {
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(45, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(190, c.currentTime + 2.2);
        gain.gain.setValueAtTime(0.0001, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2.4);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 2.4);
      } catch (e) {}
    },
    // Contacto con la superficie: golpe sordo.
    contacto: function () {
      tono(70, 'triangle', 0.25, 0.09);
      setTimeout(function () { tono(52, 'triangle', 0.3, 0.06); }, 90);
    },
    // Elegir una opción en un menú.
    elegir: function () {
      tono(660, 'square', 0.05, 0.03);
      setTimeout(function () { tono(880, 'square', 0.06, 0.03); }, 55);
    },
    // Misión perdida: tres notas que bajan.
    fallo: function () {
      [392, 311.13, 233.08].forEach(function (f, i) {
        setTimeout(function () { tono(f, 'triangle', 0.28, 0.07); }, i * 170);
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

/* Modelos gráficos y sprites pixel art para recursos lunares a explorar */
var SPRITES_RECURSOS_LUNARES = {
  paleta: {
    W: '#ffffff', // blanco polar
    L: '#7df9ff', // cian hielo claro
    C: '#00f2fe', // cian neón brillante
    B: '#0284c7', // azul silicio / solar
    D: '#fbbf24', // dorado reflectante
    Y: '#f59e0b', // ámbar / ilmenita
    N: '#e2e8f0', // cara iluminada
    G: '#64748b', // basalto gris
    g: '#1e293b', // basalto oscuro / contorno
    R: '#ef4444', // rojo telemetría
    K: '#0f172a'  // sombra profunda
  },
  nucleo: [
    '....WWWW....',
    '..WWLLLLWW..',
    '.WLLCCCCLLW.',
    '.WLCCCCCCLW.',
    '.WLCCCCCCLW.',
    '..WWLLLLWW..',
    '....WWWW....',
    '....DDDD....',
    '..DDVVVVDD..',
    '.DVV....VVD.',
    'DD........DD'
  ],
  hielo: [
    '.....W.....',
    '....WLW....',
    '...WLLLW...',
    '..WLLCLLW..',
    '.WLLCCCLLW.',
    'WLLCCCCCLLW',
    '.WLLCCCLLW.',
    '..WLLCLLW..',
    '...WLLLW...',
    '....WLW....',
    '.....W.....'
  ],
  sonda: [
    '....YY....',
    '...Y..Y...',
    '....YY....',
    '....WW....',
    '..BBBBBB..',
    '.BBDDDDBB.',
    '.BBDDDDBB.',
    '..BBBBBB..',
    '..GG..GG..',
    '.gg....gg.'
  ],
  mineral: [
    '....gggg....',
    '..ggGGYYgg..',
    '.gGGYYGGYYg.',
    '.gYYYYGGGGg.',
    'gGGGGYYYYGGg',
    'gGGYYYYGGGGg',
    '.gGGGGYYGGg.',
    '..ggGGGGgg..',
    '....gggg....'
  ],
  escarpe: [
    '..gggggggg..',
    '.gNNNNNNNNg.',
    'gGGGGGGGGGGg',
    'gKKLLLLKKGGg',
    'gKKCCCCKKGGg',
    '.gKKKKKKGGg.',
    '..gggggggg..'
  ],
  roca_3d: [
    '....gg......',
    '..ggNNgg....',
    '.gNNNNGGgg..',
    '.gNNNNGGGGg.',
    'gNNNNGGGGGGg',
    'gNNGGGGGGGgg',
    '.gGGGGGGGgg.',
    '..ggGGGGgg..',
    '....gggg....'
  ]
};

/* Puntos de interés y obstáculos geológicos en mapas lunares */
var PUNTOS_INTERES_LUNARES = {
  Site01: {
    obstaculos: [[12, 10], [13, 10], [20, 8], [21, 8], [26, 18], [27, 18], [8, 12], [17, 13], [31, 14]],
    escaneos: [
      { id: 'poi_01_a', tipo: 'sonda', pos: [15, 6], nombre: 'Baliza Sismológica NASA', hallazgo: 'Sensor de impacto meteorítico y sismos lunares profundos.', ciencia: 20 },
      { id: 'poi_01_b', tipo: 'mineral', pos: [28, 20], nombre: 'Afloramiento de Ilmenita', hallazgo: 'Óxidos de hierro y titanio para extracción in-situ de oxígeno (ISRU).', ciencia: 25 },
      { id: 'poi_01_c', tipo: 'hielo', pos: [10, 22], nombre: 'Pozo de Sombra Criogénica', hallazgo: 'Temperatura de 48 K con condensados de hielo polar atrapado.', ciencia: 30 },
      { id: 'poi_01_d', tipo: 'sonda', pos: [22, 13], nombre: 'Sonda Precursora VIPER', hallazgo: 'Módulo de penetrómetro con telemetría de densidad del regolito.', ciencia: 35 }
    ]
  },
  Site04: {
    obstaculos: [[10, 8], [11, 8], [18, 14], [19, 14], [28, 22], [29, 22], [14, 18], [24, 16], [32, 12]],
    escaneos: [
      { id: 'poi_04_a', tipo: 'escarpe', pos: [8, 14], nombre: 'Escarpe Tectónico Lobulado', hallazgo: 'Falla compresional activa por contracción del núcleo lunar.', ciencia: 25 },
      { id: 'poi_04_b', tipo: 'hielo', pos: [22, 10], nombre: 'Veta Glaciar de Shackleton', hallazgo: 'Concentración masiva de volátiles de agua al 5.5% en peso.', ciencia: 35 },
      { id: 'poi_04_c', tipo: 'sonda', pos: [16, 24], nombre: 'Reflector Láser Polar', hallazgo: 'Retrorreflector de esquina para telemetría milimétrica Tierra-Luna.', ciencia: 30 },
      { id: 'poi_04_d', tipo: 'mineral', pos: [30, 8], nombre: 'Dique Basáltico KREEP', hallazgo: 'Magma lunar primitivo enriquecido con tierras raras y potasio.', ciencia: 35 }
    ]
  },
  Site11: {
    obstaculos: [[8, 10], [9, 10], [18, 18], [19, 18], [26, 12], [27, 12], [15, 14], [23, 22], [30, 19]],
    escaneos: [
      { id: 'poi_11_a', tipo: 'mineral', pos: [12, 8], nombre: 'Brecha Anortosítica Mg-Suite', hallazgo: 'Muestra primordial del manto lunar con 4.360 millones de años.', ciencia: 30 },
      { id: 'poi_11_b', tipo: 'hielo', pos: [25, 20], nombre: 'Depósito Criogénico Gerlache', hallazgo: 'Firma a 38 K con amoníaco, metano y hielo ultra-puro conservado.', ciencia: 40 },
      { id: 'poi_11_c', tipo: 'sonda', pos: [19, 9], nombre: 'Estación Automática Artemis', hallazgo: 'Paquete de radiación cósmica y espectroscopía de rayos alfa.', ciencia: 35 },
      { id: 'poi_11_d', tipo: 'escarpe', pos: [32, 10], nombre: 'Boca de Tubo de Lava', hallazgo: 'Cavidad subterránea con protección total contra micrometeoritos.', ciencia: 45 }
    ]
  }
};

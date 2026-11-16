/* Simulation rules, not NASA engineering estimates. */
var REGLAS_LUNARES = {
  pendienteMax: 27, whMetro: 0.012, masaReferencia: 200, pendienteReferencia: 15,
  oxMetro: 0.025, reserva: 0.15, muestraKg: 1, pasoSegundos: 0.14,
  acciones: { perforar: {wh:25,ox:5}, escanear: {wh:5,ox:2}, recoger: {wh:3,ox:2} },
  categorias: ['Tools','Energy','Life Support','Samples'],
  usos: {
    taladro:'Enables Drill: extracts the scientific core (25 Wh).',
    escaner:'Enables Scan: reveals an optional sample (5 Wh).',
    bat100:'Powers movement and actions: 100 Wh upon landing.',
    bat160:'Powers movement and actions: 160 Wh; adds 15 kg compared to standard.',
    o2chico:'Allows breathing: 100 O₂ units, consumed by distance and work.',
    o2grande:'Allows breathing: 160 O₂ units to explore further.',
    cont1:'Stores 1 sample, unsecured until delivered.',
    cont2:'Stores 2 samples, unsecured until delivered.',
    fuelextra:'Enables descent correction: adds 30 fuel units.'
  }
};

/* Progresión escalonada de dificultad de sitios NASA */
var SITIOS_LUNARES = {
  Site01: {
    id: 'Site01',
    nombre: 'Connecting Ridge',
    nivel: 1,
    dificultad: 'Easy',
    estrellas: '★☆☆',
    claseDificultad: 'facil',
    descripcion: 'Gentle slopes (2°-15°). Stable terrain ideal for calibrating battery and mass.',
    desbloqueoRequerido: null,
    desbloquea: 'Site04',
    // --- nivel jugable: qué sistemas entran en juego y qué decide el jugador ---
    nivelNombre: 'BASIC',
    lema: 'The essentials: bring enough power to go and return.',
    decides: 'Route and battery',
    terreno: 'Gentle terrain',
    sistemas: {oxigeno: false, carga: false, combustible: false, escaner: false, formulas: false},
    presupuesto: 1100,
    cohete: 'halcon',
    kit: ['o2chico', 'taladro', 'cont1'],
    pasos: ['ruta', 'bateria', 'revision'],
    novedades: []
  },
  Site04: {
    id: 'Site04',
    nombre: 'Shackleton Rim',
    nivel: 2,
    dificultad: 'Challenging',
    estrellas: '★★☆',
    claseDificultad: 'medio',
    descripcion: 'Mixed slopes (10°-25°). Standard VIPER terrain with shadow traps and a steep crater.',
    desbloqueoRequerido: 'Site01',
    desbloquea: 'Site11',
    nivelNombre: 'INTERMEDIATE',
    lema: 'Now you also breathe, weigh, and pay.',
    decides: 'Route, battery, and oxygen',
    terreno: 'Mixed slopes',
    sistemas: {oxigeno: true, carga: true, combustible: false, escaner: false, formulas: false},
    // 950 credits
    presupuesto: 950,
    cohete: 'halcon',
    kit: ['taladro', 'cont1'],
    pasos: ['ruta', 'bateria', 'oxigeno', 'revision'],
    novedades: [
      ['OXYGEN', 'Consumed with every meter. If it runs out, you do not return.'],
      ['MASS', 'Every kilo added to the craft makes each step consume more energy.'],
      ['BUDGET', 'Not enough to take everything. Choices are mandatory.']
    ]
  },
  Site11: {
    id: 'Site11',
    nombre: 'de Gerlache Rim',
    nivel: 3,
    dificultad: 'Extreme',
    estrellas: '★★★',
    claseDificultad: 'dificil',
    descripcion: 'Extreme slopes (>25°). Rugged impassable cliffs demanding maximum watt optimization.',
    desbloqueoRequerido: 'Site04',
    desbloquea: null,
    nivelNombre: 'ADVANCED',
    lema: 'Extreme terrain: every decision matters here.',
    decides: 'Everything: route, battery, oxygen, rocket, and extras',
    terreno: 'Extreme slopes',
    sistemas: {oxigeno: true, carga: true, combustible: true, escaner: true, formulas: true},
    presupuesto: 1200,
    cohete: 'halcon',
    kit: ['taladro', 'cont1'],
    pasos: ['ruta', 'bateria', 'oxigeno', 'cohete', 'extras', 'revision'],
    novedades: [
      ['FUEL', 'In flight you can correct descent and land closer to the crater.'],
      ['SCANNER', 'Reveals a second sample. More science, more risk.'],
      ['FORMULAS', 'Inspect where every number comes from.']
    ]
  }
};

/* Sistema de 6 finales basados en las decisiones del jugador */
var FINALES_LUNARES = {
  pionero: {
    id: 'pionero',
    rango: 'S+',
    titulo: 'ARTEMIS PIONEER — GOLD STANDARD',
    subtitulo: 'Absolute Success at the Lunar South Pole',
    color: '#f6d365',
    icono: '👑',
    resumen: 'Retrieved the crater core and secondary sample while keeping your reserve intact (≥15%).',
    epilogo: 'Your precision in mass and energy distribution exceeded spaceflight engineering standards. NASA flight operations archives your mission plan as the reference protocol for future Artemis crews at the South Pole.',
    leccion: 'Redundancy does not mean overdesigning: it means holding the exact margin needed to answer uncertainty without risking return.'
  },
  maestro: {
    id: 'maestro',
    rango: 'S',
    titulo: 'MASTER ENGINEER — EXEMPLARY SIMULATION',
    subtitulo: 'Optimal Resource Planning',
    color: '#6dd6cf',
    icono: '⚙️',
    resumen: 'Primary scientific goal secured within an optimal balance of budget and battery.',
    epilogo: 'You proved disciplined technical design beats luck. Your balance between launch mass, watts per meter, and return reserve extracted the core without wasting a single agency credit.',
    leccion: 'Every kilogram left off the launch pad is energy your rover saves across every meter of lunar regolith.'
  },
  revolucion: {
    id: 'revolucion',
    rango: 'A+',
    titulo: 'POLAR REVOLUTION — SCIENTIFIC FRONTIER',
    subtitulo: 'Geological Daring in Deep Crater',
    color: '#86e5f4',
    icono: '🔬',
    resumen: 'High-impact exploration with scanner and samples retrieved from steep terrain.',
    epilogo: 'Samples gathered from permanently shadowed cold traps confirm key volatiles and water ice. Your expedition marks the first true step toward In-Situ Resource Utilization (ISRU) for sustainable human presence.',
    leccion: 'The most valuable science often rests on the steepest slopes; equipping the scanner and budgeting detour watts is what brings you home alive.'
  },
  in_extremis: {
    id: 'in_extremis',
    rango: 'A',
    titulo: 'MIRACULOUS ODYSSEY — ON THE BRINK',
    subtitulo: 'Heroic Return with Critical Margin',
    color: '#ff9f43',
    icono: '⚡',
    resumen: 'Sample delivered to module with battery in emergency reserve (≤5% Wh).',
    epilogo: 'The airlock sealed while battery indicators flashed critical red with just a few watts to spare. A feat of iron nerves that Mission Control will remember for generations.',
    leccion: 'You saved the mission through brinkmanship, but in real space operations this margin is unsustainable. Next time, add more battery or take the economy route.'
  },
  tactico: {
    id: 'tactico',
    rango: 'B',
    titulo: 'TACTICAL RETURN — OPERATIONAL PRUDENCE',
    subtitulo: 'Survival and Asset Preservation',
    color: '#54a0ff',
    icono: '🛡️',
    resumen: 'You aborted in time upon detecting insufficient margin, saving the spacecraft and instruments.',
    epilogo: 'You recognized the point of no return before becoming trapped in crater darkness. Although the deep core remained behind, crew, instruments, and telemetry returned intact to Earth.',
    leccion: 'In space exploration, knowing when to abort is just as valuable as knowing when to drill. Greed without reserve watts only produces lunar junk.'
  },
  forense: {
    id: 'forense',
    rango: 'F',
    titulo: 'SILENT MONOLITH — FORENSIC TELEMETRY',
    subtitulo: 'Mission Stranded in Cryogenic Regolith',
    color: '#ff6b6b',
    icono: '⚠️',
    resumen: 'Power or life support ran out before reaching the module airlock.',
    epilogo: 'The rover ceased operations in perpetual shadow just meters from safety. The NASA mishap investigation board isolates the root cause in telemetry to recalibrate mission simulators.',
    leccion: 'The regolith forgives nothing. If the uphill climb or sample mass is not budgeted before launch, the return margin breaks. Learn from the data and try again!'
  }
};

/* Textos de la interfaz guiada: la misión en tres pasos, lo que se decide en
   cada pantalla y la voz de AIDA. Solo texto: ninguna regla vive aquí. */
var TEXTOS_LUNARES = {
  lema: 'Plan. Explore. Return.',
  mision: [
    ['GO', 'Walk from the lander to the crater.'],
    ['DRILL', 'Extract the ice core located inside.'],
    ['RETURN', 'Get back to the module. The sample only counts if you return.']
  ],
  regla: 'Every step drains energy, and steep slopes cost much more. If power runs out far from the module, the sample is lost.',
  controles: [
    ['← ↑ ↓ →', 'Walk (also W A S D)'],
    ['E', 'Drill, collect or deliver'],
    ['ESC', 'Pause'],
    ['M', 'Sound toggle']
  ],
  pasos: {
    ruta: {
      corto: 'ROUTE',
      titulo: 'Which path to the crater?',
      ayuda: 'On the map, dark striped terrain is steep: every step there drains more power.'
    },
    bateria: {
      corto: 'BATTERY',
      titulo: 'Which battery will you carry?',
      ayuda: 'The battery is all the power you have to go, drill, and return. Measured in Wh.'
    },
    oxigeno: {
      corto: 'OXYGEN',
      titulo: 'How much oxygen will you carry?',
      ayuda: 'Oxygen depletes with every meter walked. Carrying extra also adds mass.'
    },
    cohete: {
      corto: 'ROCKET',
      titulo: 'Which rocket will you launch on?',
      ayuda: 'The rocket sets payload mass capacity and available maneuvering fuel.'
    },
    extras: {
      corto: 'EXTRAS',
      titulo: 'What extras will you load?',
      ayuda: 'None are required. Each adds a capability, but costs mass and credits.'
    },
    revision: {
      corto: 'REVIEW',
      titulo: 'Review your plan before launch',
      ayuda: 'After launch, mission parameters are sealed.'
    }
  },
  // Glosario: qué es cada cosa y qué implica al decidir. {reserva} y {pendiente}
  // se rellenan con las reglas vigentes.
  glosario: [
    ['ENERGY (Wh)', 'Stored in the battery. Walking, drilling, and scanning consume it. If it hits zero far from the module, you do not return.'],
    ['RESERVE', 'Power remaining upon return. Recommended {reserva}% of total journey demand: a vital cushion against terrain hazards.'],
    ['SLOPE', 'Terrain incline. Penalties scale quadratically: double the slope costs far more than double. Slopes above {pendiente}° are impassable.'],
    ['MASS', 'Payload kilograms loaded. Every kilo increases energy per step, and rockets have a payload cap.'],
    ['BUDGET', 'Mission credits. Insufficient for everything: picking one upgrade means sacrificing another.'],
    ['OXYGEN', 'Consumed with every meter walked. Larger tanks last longer, but weigh and cost more.'],
    ['FUEL', 'Used to correct trajectory and land closer to the target. If unequipped, this option is unavailable.'],
    ['CORE', 'The crater ice sample: the primary scientific objective. Only counts once delivered to the module.']
  ],
  // Qué es dato real y qué es regla de juego (créditos y documentación).
  real: 'The three maps represent real Lunar South Pole slopes measured by NASA LRO LOLA laser altimeter: 5 m per pixel, aggregated into 20 m grid cells. Connecting Ridge, Shackleton Rim, and de Gerlache Rim are candidate Artemis landing sites.',
  juego: 'Energy, oxygen, mass, costs, and placements of lander, crater, boulders, and findings are calibrated gameplay rules designed to teach engineering trade-offs, not formal flight software.',
  fuente: 'Source: Barker et al. (2021), "Improved LOLA Elevation Maps for South Pole Landing Sites", Planetary and Space Science 203, 105119. Data: NASA GSFC, PGDA product 78.',
  aida: {
    niveles: 'I am AIDA, your mission flight director. Start with the basic mission: each tier adds new systems.',
    briefing: 'Golden rule: a sample that does not make it back to the lander does not count.',
    ruta: 'Choose a route and check projected journey energy below.',
    bateria: 'Choose a battery. The meter below indicates if you have enough power to return.',
    oxigeno: 'Check how much oxygen the journey requires before taking a larger tank.',
    cohete: 'A heavy-lift rocket carries more payload, but consumes budget.',
    extras: 'You can launch without extras. Take them only if you have a plan to use them.',
    despegue: 'Engines ignited. Liftoff confirmed.',
    viaje: 'The plan is sealed: whatever stayed on Earth is not on board.',
    viajeDecision: 'Correcting uses fuel to land closer. Holding saves fuel. Your call.',
    descenso: 'Touchdown in three, two, one…',
    caminar: 'Use arrow keys or W A S D to walk. Follow the dotted line to the crater.',
    alCrater: 'Looking good. The top gauge shows return power cost from your current position.',
    enCrater: 'You are over the crater. Press E to drill.',
    volver: 'Core secured. Follow the blue line back to the module and press E to deliver.',
    justo: 'Warning: narrow return margin. Head back now.',
    sinRetorno: 'Insufficient power to return. Get as close to the module as possible.',
    extra: 'Signal detected nearby. Detours consume energy: check your gauge before diverging.',
    // Una frase por final: la personalidad de AIDA al cerrar la misión.
    finales: {
      pionero: 'Flawless execution. I am framing this flight plan in Mission Control.',
      maestro: 'Clean and disciplined. Exactly how an exploration mission should run.',
      revolucion: 'Top-tier science on extreme terrain. Well played.',
      in_extremis: 'You made it back... by a razor-thin margin. Let us not make that a habit.',
      tactico: 'No sample, but the crew is safe. I will take that any day.',
      forense: 'Telemetry lost. Examine where the margin broke and try again.'
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
      { id: 'poi_01_a', tipo: 'sonda', pos: [15, 6], nombre: 'NASA Seismological Beacon', hallazgo: 'Meteorite impact and deep moonquake seismic sensor.', ciencia: 20 },
      { id: 'poi_01_b', tipo: 'mineral', pos: [28, 20], nombre: 'Ilmenite Outcrop', hallazgo: 'Iron and titanium oxides for in-situ oxygen extraction (ISRU).', ciencia: 25 },
      { id: 'poi_01_c', tipo: 'hielo', pos: [10, 22], nombre: 'Cryogenic Cold Trap', hallazgo: 'Permanently shadowed 48 K cold trap holding trapped volatile ice.', ciencia: 30 },
      { id: 'poi_01_d', tipo: 'sonda', pos: [22, 13], nombre: 'VIPER Precursor Probe', hallazgo: 'Penetrometer sensor logging regolith mechanical strength.', ciencia: 35 }
    ]
  },
  Site04: {
    obstaculos: [[10, 8], [11, 8], [18, 14], [19, 14], [28, 22], [29, 22], [14, 18], [24, 16], [32, 12]],
    escaneos: [
      { id: 'poi_04_a', tipo: 'escarpe', pos: [8, 14], nombre: 'Lobate Tectonic Scarp', hallazgo: 'Active thrust fault from global lunar core contraction.', ciencia: 25 },
      { id: 'poi_04_b', tipo: 'hielo', pos: [22, 10], nombre: 'Shackleton Glacial Vein', hallazgo: 'Subsurface volatile deposit with 5.5% water ice by weight.', ciencia: 35 },
      { id: 'poi_04_c', tipo: 'sonda', pos: [16, 24], nombre: 'Polar Laser Reflector', hallazgo: 'Corner-cube retroreflector for sub-millimeter Earth-Moon ranging.', ciencia: 30 },
      { id: 'poi_04_d', tipo: 'mineral', pos: [30, 8], nombre: 'KREEP Basaltic Dike', hallazgo: 'Primitive lunar magma enriched with rare earths and potassium.', ciencia: 35 }
    ]
  },
  Site11: {
    obstaculos: [[8, 10], [9, 10], [18, 18], [19, 18], [26, 12], [27, 12], [15, 14], [23, 22], [30, 19]],
    escaneos: [
      { id: 'poi_11_a', tipo: 'mineral', pos: [12, 8], nombre: 'Mg-Suite Anorthositic Breccia', hallazgo: 'Primordial 4.36-billion-year-old lunar crust bedrock sample.', ciencia: 30 },
      { id: 'poi_11_b', tipo: 'hielo', pos: [25, 20], nombre: 'de Gerlache Cryo-Deposit', hallazgo: 'Ultra-cold 38 K deposit preserving ammonia, methane, and pure ice.', ciencia: 40 },
      { id: 'poi_11_c', tipo: 'sonda', pos: [19, 9], nombre: 'Artemis Automated Station', hallazgo: 'Cosmic radiation and alpha particle X-ray spectrometer array.', ciencia: 35 },
      { id: 'poi_11_d', tipo: 'escarpe', pos: [32, 10], nombre: 'Lava Tube Skylight', hallazgo: 'Subterranean lava tube cavity with complete micrometeorite shielding.', ciencia: 45 }
    ]
  }
};

/* ============================================================
   MISIÓN UMBRAL — CAPA DE DATOS
   Catálogo de objetos, costos, mapa y textos.
   JS plano, sin lógica. Todos los valores son ficticios y de
   juego: están calibrados para enseñar, no para simular la
   realidad.
   ============================================================ */

var DATOS = {

  // CALIBRACIÓN (ver EQUIPO.md · "Calibración vigente"): con 1100 créditos
  // caben las dos rutas ganadoras con escáner y contenedor doble
  // (batería 100 + combustible extra = 1030; batería 160 = 1060), pero no
  // ambas mejoras a la vez (1140). Elegir sigue siendo obligatorio.
  presupuestoTotal: 1100, // créditos

  cohetes: [
    {
      id: 'halcon',
      nombre: 'Falcon Light',
      costo: 300,
      capacidadMasa: 120,
      combustibleBase: 20,
      descripcion: 'Inexpensive and light, but carries limited maneuvering fuel.'
    },
    {
      id: 'titan',
      nombre: 'Titan Heavy',
      costo: 450,
      capacidadMasa: 180,
      combustibleBase: 40,
      descripcion: 'Expensive. Higher payload capacity and carries more maneuvering fuel.'
    }
  ],

  objetos: [
    { id: 'bat100',    nombre: 'Battery 100 Wh',     tipo: 'bateria',     energia: 100,  masa: 20, costo: 150, icono: '⚡', descripcion: 'Standard expedition power supply.' },
    { id: 'bat160',    nombre: 'Battery 160 Wh',     tipo: 'bateria',     energia: 160,  masa: 35, costo: 260, icono: '⚡', descripcion: 'Extended autonomy, but significantly heavier and more expensive.' },
    { id: 'o2chico',   nombre: 'O₂ Tank 100',        tipo: 'oxigeno',     oxigeno: 100,  masa: 15, costo: 100, icono: '◍', descripcion: 'Basic oxygen reserve.' },
    { id: 'o2grande',  nombre: 'O₂ Tank 160',        tipo: 'oxigeno',     oxigeno: 160,  masa: 28, costo: 180, icono: '◍', descripcion: 'Extended oxygen reserve.' },
    { id: 'taladro',   nombre: 'Core Drill',         tipo: 'herramienta', masa: 25, costo: 200, icono: '⛏', descripcion: 'Essential for extracting deep crater samples.' },
    { id: 'escaner',   nombre: 'Terrain Scanner',    tipo: 'herramienta', masa: 10, costo: 90,  icono: '◎', descripcion: 'Scans surface locations to uncover hidden scientific findings.' },
    { id: 'cont1',     nombre: 'Single Container',   tipo: 'contenedor',  capacidad: 1, masa: 8,  costo: 60,  icono: '▣', descripcion: 'Capacity for 1 sample.' },
    { id: 'cont2',     nombre: 'Dual Container',     tipo: 'contenedor',  capacidad: 2, masa: 18, costo: 110, icono: '▣', descripcion: 'Capacity for 2 samples.' },
    { id: 'fuelextra', nombre: 'Extra Fuel',         tipo: 'combustible', combustible: 30, masa: 15, costo: 80, icono: '▲', descripcion: 'Additional maneuvering propellant for the spacecraft.' }
  ],

  // Costos de acciones. La energía se mide en Wh, el oxígeno en unidades O₂.
  costos: {
    pasoEnergia: 5,        // Wh por paso de desplazamiento
    pasoOxigeno: 4,        // O₂ por paso
    perforar: 25,          // Wh, muestra profunda principal
    perforarOx: 5,
    veta: 10,              // Wh, segunda perforación (veta descubierta)
    vetaOx: 3,
    recoger: 3,            // Wh, muestra superficial
    recogerOx: 2,
    escanearSup: 5,        // Wh, escanear el punto actual (= 1 paso; deja 40 Wh en el momento 40/10/35)
    escanearSupOx: 2,
    maniobra: 30,          // combustible para corregir trayectoria en vuelo
    margenRecomendado: 0.10, // el simulador recomienda adverso + 10 %
    umbralAmbar: 0.15,     // el indicador de regreso pasa a ámbar bajo 15 % de margen
    pasoReserva: 5         // Wh que mueve cada pulsación de [ RESERVAR ]
  },

  // TERRENO VARIABLE: el escaneo del viaje tira un dado contra "probRocoso"
  // de la zona elegida. Si sale rocoso se cobran los recargos de abajo; si
  // sale despejado, la estimación normal se cumple. La probabilidad es
  // visible en el hangar: el margen se decide sabiendo el riesgo, no el resultado.
  //
  // Mapa de superficie según la zona de aterrizaje. El módulo siempre
  // está en el paso 0. "rocosos" son los pasos que encarecen el cruce
  // si el terreno resulta rocoso (evento del viaje). El recargo se cobra
  // por casilla de DESTINO de cada paso, así que para que ida y regreso
  // paguen lo mismo la lista debe ser simétrica respecto al tramo.
  //
  // Números clave (objetivo "1 profunda"):
  //   llanura normal  30 + 25 + 35 =  90 Wh   (ejemplo canónico)
  //   llanura rocosa  39 + 25 + 44 = 108 Wh   (canónico adverso: 100 Wh → faltan 8)
  //   cráter  normal  15 + 25 + 20 =  60 Wh
  //   cráter  rocoso  30 + 25 + 35 =  90 Wh   (igual que la llanura normal)
  // Momento 40/10/35: con batería 100 aterrizando junto al cráter (rocoso)
  // o corrigiendo desde el cráter hacia la llanura (normal), tras perforar
  // (25) y escanear (5) quedan 40 Wh, la veta cuesta 10 y volver 35 → −5.
  mapa: {
    llanura: {
      nombre: 'Frozen Plains',
      pasosACrater: 6,
      muestras: [2, 4],
      rocosos: [3, 4, 5],
      riesgoWh: 3,
      probRocoso: 0.3,
      salidaCrater: 5,
      nota: 'Known and stable terrain. The crater is far away.'
    },
    crater: {
      nombre: 'Crater Rim',
      pasosACrater: 3,
      muestras: [4, 5],
      rocosos: [0, 1, 2, 3],
      riesgoWh: 5,
      probRocoso: 0.6,
      salidaCrater: 5,
      nota: 'Land right by the crater (3 steps), but terrain is more uncertain: if rocky, each step costs double.'
    }
  },

  objetivos: {
    crater_profunda: {
      nombre: 'Extract 1 deep crater sample',
      corto: '1 deep',
      herramienta: 'Core Drill',
      espacioMinimo: 1
    },
    llanura_doble: {
      nombre: 'Retrieve 2 surface plain samples',
      corto: '2 surface',
      herramienta: 'Container with space for 2',
      espacioMinimo: 2
    }
  },

  // Centralized UI texts
  textos: {
    titulo: 'MISSION UMBRAL',
    pregunta: 'How would you prepare an expedition if you could only carry what fits on your rocket and did not yet know what you would find upon landing?',
    ficcion: 'All values are game mechanics: calibrated to teach, not to simulate real engineering.',
    btnEquipar: 'EQUIP', btnQuitar: 'REMOVE', btnObjetivo: 'OBJECTIVE',
    btnProbar: 'TEST', btnVerCalculo: 'VIEW CALCULATION', btnLanzar: 'LAUNCH',
    btnReservar: 'RESERVE', btnRecomendado: 'USE RECOMMENDATION',
    tramos: { ida: 'Outbound', exploracion: 'Exploration', regreso: 'Return' },
    tooltipReserva: 'Reserve: how much energy you budget for each leg. What is not budgeted for outbound or return remains for exploration.',
    reservaInvadida: 'Entered return reserve.',
    btnEscanear: 'SCAN', btnCorregir: 'CORRECT', btnMantener: 'HOLD',
    btnDescender: 'DESCEND', btnAvanzar: 'ADVANCE', btnRetroceder: 'RETURN',
    btnPerforar: 'DRILL', btnRecoger: 'COLLECT', btnRegresar: 'RETURN',
    btnRepetir: 'REPEAT CHANGING PLAN', btnNueva: 'NEW MISSION',
    btnEntendido: 'UNDERSTOOD',
    tooltipMargen: 'Margin: resources carried above estimated plan consumption. Keeps you alive when terrain is rougher than expected.',
    tooltipCargaUtil: 'Payload: total equipment mass the rocket can carry. Each equipped item consumes it.',
    tooltipAutonomia: 'Autonomy: how far you can operate on surface with power and oxygen carried, including return.',
    eventoViajeDespejado: 'New scan: landing zone terrain is CLEAR. Agency estimate holds.',
    riesgoTerreno: 'Rocky terrain risk',
    eventoViaje: 'New scan: landing zone terrain is ROCKY. Moving there costs more energy than expected.',
    regresoEstimado: 'Estimated return from here'
  }
};

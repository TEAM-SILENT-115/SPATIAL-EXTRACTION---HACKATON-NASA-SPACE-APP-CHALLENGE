/* ============================================================
   MISIÓN UMBRAL — CAPA DE DATOS
   Catálogo de objetos, costos, mapa y textos.
   JS plano, sin lógica. Todos los valores son ficticios y de
   juego: están calibrados para enseñar, no para simular la
   realidad.
   ============================================================ */

var DATOS = {

  presupuestoTotal: 1000, // créditos

  cohetes: [
    {
      id: 'halcon',
      nombre: 'Halcón ligero',
      costo: 300,
      capacidadMasa: 120,
      combustibleBase: 20,
      descripcion: 'Barato y liviano, pero trae poco combustible de maniobra.'
    },
    {
      id: 'titan',
      nombre: 'Titán pesado',
      costo: 450,
      capacidadMasa: 180,
      combustibleBase: 40,
      descripcion: 'Caro. Admite más carga y trae más combustible de maniobra.'
    }
  ],

  objetos: [
    { id: 'bat100',    nombre: 'Batería 100 Wh',     tipo: 'bateria',     energia: 100,  masa: 20, costo: 150, icono: '⚡', descripcion: 'Fuente de energía estándar para la expedición.' },
    { id: 'bat160',    nombre: 'Batería 160 Wh',     tipo: 'bateria',     energia: 160,  masa: 35, costo: 260, icono: '⚡', descripcion: 'Más autonomía, pero pesa y cuesta bastante más.' },
    { id: 'o2chico',   nombre: 'Tanque O₂ 100',      tipo: 'oxigeno',     oxigeno: 100,  masa: 15, costo: 100, icono: '◍', descripcion: 'Reserva de oxígeno básica.' },
    { id: 'o2grande',  nombre: 'Tanque O₂ 160',      tipo: 'oxigeno',     oxigeno: 160,  masa: 28, costo: 180, icono: '◍', descripcion: 'Reserva de oxígeno ampliada.' },
    { id: 'taladro',   nombre: 'Taladro de núcleo',  tipo: 'herramienta', masa: 25, costo: 200, icono: '⛏', descripcion: 'Imprescindible para extraer la muestra profunda del cráter.' },
    { id: 'escaner',   nombre: 'Escáner de terreno', tipo: 'herramienta', masa: 10, costo: 90,  icono: '◎', descripcion: 'Permite escanear cada punto de la superficie y descubrir hallazgos ocultos.' },
    { id: 'cont1',     nombre: 'Contenedor simple',  tipo: 'contenedor',  capacidad: 1, masa: 8,  costo: 60,  icono: '▣', descripcion: 'Espacio para 1 muestra.' },
    { id: 'cont2',     nombre: 'Contenedor doble',   tipo: 'contenedor',  capacidad: 2, masa: 18, costo: 110, icono: '▣', descripcion: 'Espacio para 2 muestras.' },
    { id: 'fuelextra', nombre: 'Combustible extra',  tipo: 'combustible', combustible: 30, masa: 15, costo: 80, icono: '▲', descripcion: 'Reserva de maniobra adicional para el cohete.' }
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
    escanearSup: 2,        // Wh, escanear el punto actual
    escanearSupOx: 1,
    maniobra: 30,          // combustible para corregir trayectoria en vuelo
    margenRecomendado: 0.10, // el simulador recomienda adverso + 10 %
    umbralAmbar: 0.15      // el indicador de regreso pasa a ámbar bajo 15 % de margen
  },

  // Mapa de superficie según la zona de aterrizaje. El módulo siempre
  // está en el paso 0. "rocosos" son los pasos que encarecen el cruce
  // si el terreno resulta rocoso (evento del viaje).
  mapa: {
    llanura: {
      nombre: 'Llanura helada',
      pasosACrater: 6,
      muestras: [2, 4],
      rocosos: [3, 4, 5],
      riesgoWh: 3,          // Wh extra por paso rocoso
      salidaCrater: 5,      // Wh extra al salir del cráter (subida)
      nota: 'Terreno conocido y estable. El cráter queda lejos.'
    },
    crater: {
      nombre: 'Borde del cráter',
      pasosACrater: 2,
      muestras: [4, 5],
      rocosos: [1, 2],
      riesgoWh: 4,
      salidaCrater: 5,
      nota: 'Aterrizas junto al cráter, pero el terreno es más incierto.'
    }
  },

  objetivos: {
    crater_profunda: {
      nombre: 'Extraer 1 muestra profunda del cráter',
      corto: '1 profunda',
      herramienta: 'Taladro de núcleo',
      espacioMinimo: 1
    },
    llanura_doble: {
      nombre: 'Traer 2 muestras superficiales de la llanura',
      corto: '2 superficiales',
      herramienta: 'Contenedor con espacio para 2',
      espacioMinimo: 2
    }
  },

  // Textos de interfaz centralizados (por si se traduce).
  textos: {
    titulo: 'MISIÓN UMBRAL',
    pregunta: '¿Cómo prepararías una expedición si solo pudieras llevar lo que cabe en tu cohete y todavía no supieras exactamente qué encontrarás al aterrizar?',
    ficcion: 'Todos los valores son ficticios y de juego: calibrados para enseñar, no para simular la realidad.',
    btnEquipar: 'EQUIPAR', btnQuitar: 'QUITAR', btnObjetivo: 'OBJETIVO',
    btnProbar: 'PROBAR', btnVerCalculo: 'VER CÁLCULO', btnLanzar: 'LANZAR',
    btnEscanear: 'ESCANEAR', btnCorregir: 'CORREGIR', btnMantener: 'MANTENER',
    btnDescender: 'DESCENDER', btnAvanzar: 'AVANZAR', btnRetroceder: 'VOLVER',
    btnPerforar: 'PERFORAR', btnRecoger: 'RECOGER', btnRegresar: 'REGRESAR',
    btnRepetir: 'REPETIR CAMBIANDO EL PLAN', btnNueva: 'MISIÓN NUEVA',
    tooltipMargen: 'Margen: recursos que llevas por encima de lo que el plan estima consumir.',
    tooltipCargaUtil: 'Carga útil: masa total del equipo que el cohete puede llevar.',
    tooltipAutonomia: 'Autonomía: cuánto tiempo (energía y oxígeno) puedes operar en superficie.',
    eventoViaje: 'Nuevo escaneo: el terreno de tu zona de descenso es ROCOSO. Desplazarse ahí costará más energía de la prevista.',
    regresoEstimado: 'Regreso estimado desde aquí'
  }
};

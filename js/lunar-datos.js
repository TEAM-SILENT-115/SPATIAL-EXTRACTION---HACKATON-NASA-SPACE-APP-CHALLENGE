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

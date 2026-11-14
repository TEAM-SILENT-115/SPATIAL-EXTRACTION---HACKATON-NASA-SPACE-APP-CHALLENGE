# Misión Umbral — Contexto del equipo y pendientes

## Qué estamos haciendo

Juego educativo para el NASA Space Apps Challenge 2026, reto "Space Mission Design Game".
El jugador diseña una misión en la agencia (presupuesto, masa, equipo), la opera en vuelo
y explora un planeta helado para traer una muestra de vuelta al módulo.

**La lección que enseña (todo lo demás se recorta si no la sirve):** un recurso que llevas
no es gratis —cuesta masa, presupuesto y espacio— y el margen que NO reservas al planificar
es el que te deja varado cuando el terreno resulta más difícil de lo previsto.

La especificación completa está en [`CONTEXTO.md`](CONTEXTO.md), en la raíz de este repo.
Es la única fuente de verdad; ante la duda, manda ese documento.

## Estado actual (versión base, ya jugable)

- Las 4 pantallas funcionan de punta a punta: hangar → viaje → superficie → informe.
- Ejemplo canónico implementado y verificado: batería 100 Wh, plan 30+25+35 = 90 Wh,
  terreno rocoso +18 → 108 Wh, faltan 8.
- Evento del viaje: escaneo revela terreno rocoso; CORREGIR (−30 combustible, ruta corta)
  o MANTENER (ruta cara). Sin combustible reservado, CORREGIR aparece bloqueado.
- Indicador permanente de "regreso estimado" (verde / ámbar <15 % / rojo no alcanza).
- Informe final causal escrito desde `historial` (decisión → efecto), con botón de
  repetir conservando el plan.
- Reglas duras ya aplicadas: la muestra solo cuenta al volver; quedarse sin energía/O₂
  lejos del módulo = varado con explicación; LANZAR solo se bloquea por masa o
  presupuesto (nunca por poco margen: equivocarse ahí es la lección).
- 23 pruebas del motor pasando: `node tests/motor.test.js`.

## Cómo está organizado (no romper esta separación)

- `js/datos.js` — SOLO números y textos. Para rebalancear el juego se toca únicamente
  este archivo. Sin lógica.
- `js/motor.js` — SOLO reglas. Funciones puras (estado, decisión) → estado nuevo.
  Prohibido meter DOM aquí. Si cambias una regla, corre los tests.
- `js/ui.js` + `css/style.css` — SOLO render y eventos. Lee del motor, nunca calcula.
- Sin dependencias, sin build, sin red: abrir `index.html` debe seguir funcionando
  offline con doble click (el wifi del hackatón es un riesgo real).

## Qué falta (en orden de valor)

1. **Jugar y recalibrar**: verificar que las dos rutas (corregir con batería chica /
   mantener con batería grande) se sienten viables y justas. Ajustar solo `datos.js`.
2. **Botón [ RESERVAR ]**: repartir recursos entre viaje / exploración / regreso con
   tres barras que se quitan entre sí (panel 3.3 de la spec). Es lo más grande pendiente.
3. **El momento 40/10/35**: existe la veta (segunda perforación de 10 Wh descubierta al
   escanear el cráter perforado), pero falta calibrar para que el jugador llegue ahí
   con ~40 Wh y sienta el dilema exacto de la spec.
4. **Tooltips de primera vez** para margen / carga útil / autonomía (hoy son `title=`
   al pasar el cursor; los textos ya están en `datos.js`).
5. **Animaciones** de despegue y descenso (hoy el cambio de etapa es seco).
6. **Sonido** (opcional, al final).
7. **Video de 30 s para el jurado**: 16 s hangar, 6 s decisión del cohete, 8 s
   extracción e informe.

## Convenciones de trabajo

- Commits con **conventional commits** en español: `feat(motor): ...`, `fix(ui): ...`,
  `docs: ...`, `test: ...`, `chore: ...`.
- Antes de subir cambios de motor o datos: `node tests/motor.test.js` en verde.
- Todo texto visible vive en `datos.js` (por si se traduce).
- Arte: 100 % original, dibujado por código. Nada de sprites, nombres o música de
  Nintendo ni de ninguna obra con derechos. Inspirarse en la sensación, no copiar.
- Accesibilidad: nunca comunicar estado solo con color (color + número + icono).

## Criterio de "terminado" (de la spec)

Una persona sin idea de ingeniería espacial puede: jugar una partida en <5 min,
fallar en algo, leer el informe y decir en voz alta qué haría distinto, y rejugar
cambiando UNA decisión para ver el efecto. Si no puede nombrar qué cambiaría,
el juego todavía no funciona.

# Misión Umbral — Contexto del equipo y pendientes

## Qué estamos haciendo

Juego educativo para el NASA Space Apps Challenge 2026, reto "Space Mission Design Game".
El jugador diseña una misión en la agencia (presupuesto, masa, equipo), la opera en vuelo
y explora el Polo Sur de la Luna para traer una muestra de hielo de vuelta al módulo.

**La lección que enseña (todo lo demás se recorta si no la sirve):** un recurso que llevas
no es gratis —cuesta masa, presupuesto y espacio— y el margen que NO reservas al planificar
es el que te deja varado cuando el terreno resulta más difícil de lo previsto.

La especificación completa está en [`CONTEXTO.md`](CONTEXTO.md), en la raíz de este repo.
Es la única fuente de verdad; ante la duda, manda ese documento.

## Interfaz guiada y niveles (15-nov-2026) — lo que hoy se ve en pantalla

> Las secciones de más abajo ("Estado actual", RESERVAR, terreno variable, comparación entre
> partidas…) describen la **versión clásica** (`js/ui.js`). Sigue en el repo y aporta el arte,
> pero la pantalla que arranca es la versión lunar (`js/lunar-ui.js`), descrita aquí.

**Por qué se rehízo.** Revisión como jugador nuevo de la versión anterior: 16 botones, 2
desplegables y unas 300 palabras en la primera pantalla; equipo escondido tras 4 pestañas;
texto de 9 a 12 px; el informe no cabía sin scroll; dos tutoriales distintos en la cabecera; y
al aterrizar, la tecla `E` cerraba la misión sin muestras. "Dificultad" eran tres mapas con la
misma pantalla compleja.

**Qué hay ahora.**

- **Una decisión por pantalla.** Título → niveles → misión → plan paso a paso → despegue →
  viaje → descenso → superficie → informe. En cada momento hay 2 o 3 opciones grandes y un
  botón principal (ámbar) que también responde a `Enter`.
- **La misión se explica antes de pedir nada**: tres pasos (ir, perforar, volver) con una
  animación en bucle que muestra la barra de energía y la zona "para volver".
- **Consecuencia en vivo.** Bajo el plan, una barra muestra ida + perforar + vuelta contra la
  batería: SOBRA en verde rayado o FALTA en rojo. En los niveles 2 y 3 se suman oxígeno, masa,
  créditos y combustible.
- **AIDA** habla en una sola línea abajo: dice qué hacer ahora y reacciona a lo elegido.
- **Superficie.** Vista más cercana, cámara suave, una sola línea guía a la vez (ámbar al
  cráter, azul de vuelta), flecha con distancia cuando el objetivo queda fuera de pantalla,
  botones de dirección para quien juega con ratón, y un marco ámbar o rojo cuando el regreso
  peligra. Antes de perforar se lee «Después te sobrarán / te FALTARÁN X Wh para volver».
- **Prevención de errores.** `E` al aterrizar no hace nada; volver sin muestra pide
  confirmación; el botón de la acción que rompe el regreso sale en rojo, no en ámbar; con un
  solo hueco en el contenedor se avisa de que la muestra extra dejaría fuera al núcleo.
- **Informe en una pantalla**: rango, dos o tres frases, barra de energía, lección y un consejo.
  El detalle (tabla plan / real) queda detrás de `DETALLE`.

**Niveles que suman sistemas** (datos en `SITIOS_LUNARES`, reglas en `Lunar.iniciarNivel`):

| | 1 · Básico | 2 · Intermedio | 3 · Avanzado |
|---|---|---|---|
| Sitio | Site01 Connecting Ridge | Site04 Shackleton | Site11 Gerlache |
| Pasos del plan | ruta, batería | + oxígeno | + cohete, extras |
| Sistemas | energía | + oxígeno, masa, presupuesto | + combustible, escáner, fórmulas |
| Presupuesto | 1100 (no se muestra) | **950** | **1200** |
| Ya a bordo | O₂ 100, taladro, contenedor | taladro, contenedor | taladro, contenedor |

- En el básico el oxígeno no se consume (`sistemas.oxigeno = false`) y no existe la muestra
  extra. Cualquier plan gana con rango S; la batería grande recibe la frase «cargaste más
  batería, y más peso, de la que hacía falta».
- En el intermedio, 950 créditos no alcanzan para batería grande + tanque grande. Batería
  chica por la ruta directa no llega (−5,6 Wh) y con el tanque grande encima deja varado.
- En el avanzado, sin corregir el descenso solo se llega con 3,6 Wh. Corregir pide 30 de
  combustible: Halcón + combustible extra (1000 cr) o Titán (1070 cr). El rango S+ pide
  además escáner y contenedor doble: 1140 cr y 118 de 120 kg. Con Titán el dinero no alcanza
  para el contenedor doble.
- `Lunar.nuevo()` sin nivel conserva todos los sistemas activos: las pruebas originales del
  motor siguen pasando sin cambios.

**Criterios de usabilidad que se comprueban solos** (`tests/browser.test.mjs`, 15 pantallas):
ningún texto por debajo de 13 px, nada que desborde la pantalla fija 1280×720, y como mucho 10
botones a la vez. La partida entera se puede jugar solo con teclado o solo con ratón.

**Lo que se integró de `main` (15-nov-2026).** Mientras se hacía la interfaz guiada, en
`main` se siguió trabajando sobre la pantalla anterior. Al fusionar se conservó la interfaz
guiada y se trajo lo que aporta juego:

| De `main` | Qué se hizo |
|---|---|
| Hallazgos científicos (4 por mapa, con dato real) | **Integrado.** Aparecen en el nivel avanzado, que es el que tiene escáner. Al registrarlos sale un aviso con el hallazgo y suman ciencia en el informe, solo si se vuelve. Cuentan para el final "Revolución polar". |
| Rocas que bloquean el paso | **Integrado** en los tres niveles: se ven en el mapa del plan, el minimapa y la superficie. Chocar no gasta energía. |
| Sprites de recursos (hielo, sonda, mineral, escarpe, roca) | **Integrado**: se usan para rocas y hallazgos. |
| Sonido de escaneo | **Integrado.** |
| Fondo con nebulosas | **Integrado** en el título y las escenas de vuelo, dibujado en canvas. |
| Selector `?modo=clasico` y animación de paso clásica | **Se conserva** tal cual (`js/ui.js`). |
| Todas las zonas desbloqueadas | **No se tomó**: rompe la progresión por niveles. Para demos existe `?niveles=todos`. |
| Tutorial por pasos del hangar de 4 pestañas | **No aplica**: ese hangar ya no existe. `Lunar.guiaPaso` sigue en el motor con sus pruebas, sin uso en pantalla. |
| Letra pixel VT323 / Press Start 2P (Google Fonts) | **No se usa en la interfaz guiada**: se descarga de internet y el juego debe verse igual sin conexión. Sigue cargándose para el modo clásico. Si se quiere, hay que incluir el archivo de la fuente en el repo y reajustar tamaños. |
| Paleta y estilos nuevos de `css/style.css` | La interfaz guiada fija su propia paleta y botones dentro de `.lunar`, así que no le afectan. |

**Identidad visual.** Azul oscuro NASA (`#0b1026`), ámbar para la acción principal, verde /
ámbar / rojo siempre acompañados de icono y cifra. Todas las escenas se mueven: estrellas,
astronauta, baliza del módulo, rutas, despegue, descenso, polvo al caminar, chispas al perforar
y el emblema del rango.

## Prueba de usabilidad con personas (guion)

Objetivo: comprobar que alguien que no conoce el juego completa el nivel básico **sin ayuda** y
entiende por qué ganó o perdió. Con 5 personas se detecta la mayoría de los problemas.

**Antes de cada persona:** `AYUDA → BORRAR PROGRESO`, volver al título, sonido activado. No
explicar nada; solo decir: «Es un juego. Juega como si estuvieras solo y di en voz alta lo que
piensas.»

| # | Tarea (sin dar pistas) | Se considera logrado si… |
|---|---|---|
| 1 | Empieza una partida | Llega al plan en menos de 1 minuto sin preguntar |
| 2 | Prepara la misión y lánzala | Elige ruta y batería y lanza sin quedarse atascado |
| 3 | Trae la muestra | Camina, perfora y vuelve al módulo; entrega con `E` |
| 4 | «¿Qué te dice esa barra de arriba?» (durante el regreso) | Explica que una parte es lo que necesita para volver |
| 5 | «¿Por qué obtuviste ese rango?» (en el informe) | Lo dice con sus palabras, citando la energía |
| 6 | Juega el nivel 2 y, si pierde, vuelve a intentarlo | Cambia una decisión concreta y sabe decir cuál |

**Qué anotar:** dónde duda más de 10 segundos, qué botón pulsa por error, qué palabra no
entiende, si lee o salta la pantalla "Tu misión", y si usa teclado o ratón.

**Umbrales para darlo por bueno:** 4 de 5 personas completan las tareas 1 a 3 sin ayuda en
menos de 5 minutos; 4 de 5 responden bien la 4 y la 5; nadie abandona antes del informe.
Al final, preguntar: «¿Qué fue lo más confuso?» y «¿Jugarías otro nivel?».

## Estado actual de la versión clásica (`js/ui.js`)

- Las 4 pantallas funcionan de punta a punta: hangar → viaje → superficie → informe.
- Ejemplo canónico implementado y verificado: batería 100 Wh, plan 30+25+35 = 90 Wh,
  terreno rocoso +18 → 108 Wh, faltan 8.
- Evento del viaje: el escaneo tira el dado del terreno (30 % de roca en la llanura, 60 % en
  el cráter) y revela si salió rocoso o despejado; CORREGIR (−30 combustible, a la otra zona
  con terreno despejado) o MANTENER. Sin combustible reservado, CORREGIR aparece bloqueado.
  Detalle en "Terreno variable".
- Indicador permanente de "regreso estimado" (verde / ámbar <15 % / rojo no alcanza).
- Informe final causal escrito desde `historial` (decisión → efecto), con botón de
  repetir conservando el plan.
- Reglas duras ya aplicadas: la muestra solo cuenta al volver; quedarse sin energía/O₂
  lejos del módulo = varado con explicación; LANZAR solo se bloquea por masa o
  presupuesto (nunca por poco margen: equivocarse ahí es la lección).
- **Calibración cerrada (14-nov-2026):** las dos rutas ganadoras caben en presupuesto
  y masa, y el momento 40/10/35 de la spec ocurre con los números exactos (detalle en
  "Calibración vigente", abajo). El informe de varado explica además cuando la veta fue
  la decisión que rompió el balance.
- **Botón [ RESERVAR ] implementado (14-nov-2026):** la energía se reparte en tres barras
  (ida / exploración / regreso) que se quitan entre sí; [ PROBAR ] marca en rojo el tramo
  cuya reserva no alcanza; en superficie un chip avisa al entrar en la reserva de regreso;
  el informe compara reservado contra real por tramo. Detalle en "Cómo funciona RESERVAR".
- **Tooltips de primera vez (14-nov-2026):** los términos *carga útil*, *autonomía*, *margen*
  y *reserva* salen subrayados; la primera vez que uno aparece se muestra una burbuja de una
  línea con [ ENTENDIDO ] y después se reabre con clic. Detalle en "Glosario de primera vez".
- **Toda cifra se puede abrir (14-nov-2026):** el indicador "Regreso" de la superficie es
  clicable y abre su desglose; las dos tarjetas del evento del viaje muestran la fórmula de
  cada total y si lo que llevas alcanza; VER CÁLCULO explica el escenario rocoso por partes.
- **Comparación entre partidas (14-nov-2026):** tras REPETIR, el informe muestra la frase
  «Cambiaste una sola decisión (Batería: 100 → 160) y el resultado pasó de … a …» y la tabla
  ANTES vs AHORA. Detalle en "Comparación entre partidas".
- 166 pruebas del motor pasando: `node tests/motor.test.js` (23 base + 15 de calibración +
  30 de reserva por tramos + 20 de desglose + 24 de comparación + 7 de lanzar sin batería +
  47 de terreno variable). La interfaz se verifica a mano o con un
  navegador sin cabeza.

## Calibración vigente (solo `datos.js`)

Qué cambió respecto a la versión base y por qué. Si se vuelve a tocar un número, repetir
las pruebas de la sección "Calibración" y "Momento 40/10/35" del test.

| Parámetro | Antes | Ahora | Motivo |
|---|---|---|---|
| `presupuestoTotal` | 1000 | 1100 | Con 1000 ninguna ruta ganadora podía llevar escáner + contenedor doble (lo que hace aparecer la veta). Con 1100 caben la ruta A (1030) y la B (1060), pero no batería 160 + combustible extra juntos (1140): elegir sigue siendo obligatorio. |
| `costos.escanearSup` / `escanearSupOx` | 2 / 1 | 5 / 2 | Escanear cuesta lo mismo que un paso y deja exactamente 40 Wh en el momento central. |
| `mapa.crater.pasosACrater` | 2 | 3 | Mitad del camino de la llanura (6). Con 2 pasos el cráter era casi gratis. |
| `mapa.crater.rocosos` | [1, 2] | [0, 1, 2, 3] | El recargo rocoso se cobra por casilla de destino; incluir el punto de aterrizaje hace que ida y regreso paguen lo mismo (+15 cada tramo). |
| `mapa.crater.riesgoWh` | 4 | 5 | Cada paso rocoso cuesta el doble (10 Wh). |

Costos resultantes para el objetivo "1 profunda" (ida + tarea + regreso):

| Zona | Terreno normal | Terreno rocoso |
|---|---|---|
| Llanura helada (6 pasos) | 30 + 25 + 35 = **90 Wh** (ejemplo canónico) | 39 + 25 + 44 = **108 Wh** (con 100 Wh faltan 8) |
| Borde del cráter (3 pasos) | 15 + 25 + 20 = **60 Wh** | 30 + 25 + 35 = **90 Wh** |

Rutas verificadas por las pruebas (Halcón ligero, O₂ 100, taladro, contenedor doble, escáner):

| Ruta | Equipo extra | Costo | Decisión en vuelo | Resultado |
|---|---|---|---|---|
| A — "corrijo" | batería 100 + combustible extra | 1030 cr, 103 masa | CORREGIR hacia el cráter | Gana; sobra energía incluso perforando la veta. |
| B — "aguanto" | batería 160 | 1060 cr, 103 masa | MANTENER en la llanura rocosa | Gana; sobra energía incluso perforando la veta. |
| Canónica | batería 100, sin combustible | 950 cr | Solo puede MANTENER | 100 Wh no cubren 108: varada (la lección). |
| Momento 40/10/35 | batería 100, aterrizando junto al cráter | 950 cr (1030 si corrige) | MANTENER (rocoso) o CORREGIR a la llanura (normal): ambas cuestan 90 Wh | Tras perforar (25) y escanear (5) quedan **40 Wh**, la veta cuesta **10**, volver **35** → −5. Volver sin la veta = éxito con 5 Wh; perforarla = varado, y el informe lo dice. |

La zona del cráter es más barata para la muestra profunda pero mucho más volátil (+30 Wh si
sale rocosa, contra +18 en la llanura) y peor para las dos muestras superficiales (61 Wh
frente a 46). Esa es la incertidumbre que la spec pide: ninguna zona es "la correcta".

## Cómo está organizado (no romper esta separación)

- `js/datos.js` — SOLO números y textos. Para rebalancear el juego se toca únicamente
  este archivo. Sin lógica.
- `js/motor.js` — SOLO reglas. Funciones puras (estado, decisión) → estado nuevo.
  Prohibido meter DOM aquí. Si cambias una regla, corre los tests.
- `js/ui.js` + `css/style.css` — SOLO render y eventos. Lee del motor, nunca calcula.
- Sin dependencias, sin build, sin red: abrir `index.html` debe seguir funcionando
  offline con doble click (el wifi del hackatón es un riesgo real).

## Cómo funciona [ RESERVAR ] (panel 3.3 de la spec)

Es una decisión de **planificación**, no un candado. Lo que hace y lo que no:

- **Qué reparte:** solo la energía (Wh). El oxígeno nunca es el recurso que ata en esta
  versión, así que no se reparte; el combustible es del cohete, no de la caminata.
- **Reparto automático** (si el jugador no toca nada): ida y regreso reciben la estimación
  del terreno normal; **todo el resto va a exploración**. Es lo que haría un planificador
  sin margen, y por eso el regreso sale en ámbar (⚠) hasta que alguien le reserva más.
- **Controles:** en el modal, cada `[ + ]` toma 5 Wh (`costos.pasoReserva`) de la exploración
  y cada `[ − ]` se los devuelve; en la fila de exploración el intercambio es con el regreso.
  `[ USAR RECOMENDACIÓN ]` reparte según el escenario adverso: primero el regreso, luego la
  ida, el resto a explorar. El motor solo sabe `moverReserva(estado, desde, hacia, wh)`; la
  pareja de tramos es una convención de la interfaz.
- **Si cambia la batería:** una reserva no tocada se recalcula; una tocada conserva sus
  números, el sobrante va a exploración y el faltante se recorta de exploración, luego
  regreso, luego ida.
- **Colores por tramo** (color + número + icono): verde ✓ cubre incluso el terreno rocoso;
  ámbar ⚠ cubre el normal pero no el rocoso; rojo ✖ no cubre ni el normal.
- **En vuelo y superficie:** la reserva se sella en `plan.reserva` al lanzar y queda en el
  historial. El consumo real se atribuye por fase (`estado.fase`): *ida* hasta pisar el paso
  del objetivo, *exploración* desde ahí o desde la primera tarea (escanear, recoger,
  perforar), *regreso* desde que se pulsa REGRESAR. Si la energía baja de la reserva de
  regreso antes de volver, el chip del HUD pasa a ámbar y el historial anota el momento una
  sola vez ("Entró en la reserva de regreso…").
- **En el informe:** tabla "Por tramo" con reservado vs real (en rojo el tramo que se pasó)
  y, si acabó varado, la frase «Habías reservado X Wh para volver; al dar la vuelta el
  regreso costaba Y Wh y te quedaban Z».
- **Lo que no hace, a propósito:** no bloquea LANZAR ni ninguna acción en superficie
  (regla de la spec: equivocarse de margen es la lección).

## Desglose de toda cifra (regla 4 de la spec)

- **Una sola fuente:** `Motor.componentesTramo(zona, desde, hasta, rocoso)` devuelve
  `{ pasos, base, pasosRocosos, recargoUnitario, recargo, salida, total }`. `costoTramoEnergia`
  es su `total`, y `desglose()` expone `componentes.ida` y `componentes.regreso`. Si una cifra
  de recorrido no sale de ahí, está mal.
- **Superficie:** el chip "Regreso: X Wh · Y O₂ ⓘ" abre el modal "De dónde sale el regreso":
  pasos × costo base, pasos rocosos × recargo, subida del cráter, total contra lo que tienes
  (sobran / faltan) y lo mismo para el oxígeno. Lo calcula `Motor.desgloseRegreso(estado)`.
- **Viaje:** cada tarjeta (MANTENER / CORREGIR) lista "Ida 30 (3 paso(s) × 5 Wh + 3 rocoso(s)
  × 5 Wh) · perforar 25 · regreso 35 (…)" y "Llevas 100 Wh → sobran 10 ✓ · O₂ 29 de 100".
  Para que quepan, la escena del viaje mide 320×84 a escala 4 (1280×336) en vez de 440 px.
- **Hangar:** VER CÁLCULO usa la misma fórmula para ida y regreso y, en el escenario rocoso,
  dice "ida +15 (3 rocoso(s) × 5 Wh) · regreso +15 (3 × 5 Wh)" en lugar de un "+30" seco.
- **Burbujas del glosario:** de paso se corrigió que la burbuja de "Carga útil" tapara el
  botón ELEGIR del primer cohete. Ahora se ancla hacia la izquierda cuando el término está en
  la mitad izquierda de la pantalla y, además, deja pasar los clics salvo en su propio botón.

## Terreno variable (el dado del escaneo)

Antes el terreno salía siempre rocoso y la segunda partida ya no tenía incertidumbre. Ahora:

- **Riesgo por zona** en `datos.js` (`mapa.<zona>.probRocoso`): llanura **0.3**, cráter **0.6**.
  La llanura es más segura y más lejana; el cráter, más cerca, más probable que salga mal y
  más caro cuando sale mal (+30 Wh contra +18). Los costos de cada escenario no cambiaron:
  toda la "Calibración vigente" sigue valiendo, solo que el rocoso ya no es seguro.
- **Cuándo se tira:** en `Motor.escanearViaje(estado, azar)`. `azar` es un número en [0, 1);
  sale roca si `azar < probRocoso`. La interfaz pasa `Math.random()`; las pruebas pasan 0
  (roca) o 0.99 (despejado), así que el motor sigue siendo determinista y testeable.
- **Qué guarda:** `estado.viaje.rocoso` (lo que salió en la zona planeada) y
  `estado.viaje.probRocoso`. MANTENER aplica ese terreno; CORREGIR lleva a la otra zona con
  terreno despejado (el combustible compra certeza). También se puede corregir con terreno
  despejado: desde la llanura, 30 de combustible ahorran 30 Wh.
- **Dónde se ve el riesgo antes de decidir:** panel 1 del hangar ("Riesgo de terreno rocoso:
  30 % · si sale, +18 Wh"), [ PROBAR ] (las dos columnas llevan su porcentaje), VER CÁLCULO y
  la banda previa al escaneo. El jugador decide el margen conociendo el riesgo, no el resultado.
- **El informe separa suerte de decisión:**
  - Ganó con terreno despejado y el plan no cubría el rocoso → «Esta vez fue suerte, no
    margen… te habrían faltado 8 Wh y no llevabas combustible para corregir».
  - Ganó con despejado y llevaba combustible → reconoce que corregir era su salida.
  - Ganó con despejado y el plan cubría el rocoso → «tu plan no dependía de eso».
  - Varado con roca → añade «El riesgo estaba avisado: 30 % en esa zona».
- **En la comparación entre partidas** el terreno no cuenta como decisión: va en una fila
  aparte, "Terreno (azar)". Si cambió, la frase lo dice: con las mismas decisiones, «esa
  diferencia es suerte»; con un solo cambio, «no se puede atribuir solo a tu cambio. Repite
  para confirmarlo».
- **Demo y video con resultado fijo:** `index.html?terreno=rocoso` o `?terreno=despejado`
  (lo lee `azarTerreno()` en `ui.js`). Sin el parámetro, el dado es real.
- **Informe que siempre cabe:** con las frases nuevas el informe podía pasarse del alto de
  la pantalla. `ajustarInforme()` recorta la cadena de decisiones por el principio y, si aun
  así no cabe, compacta la letra de las frases. Las muestras entregadas pasaron a la columna
  derecha. Comprobado en el navegador en cinco casos (primera partida ganada y varada,
  repetir con 0, 1 y 9 cambios).
- **Pendiente de decidir con gente:** con 30 % en la llanura, el plan sin margen gana 7 de
  cada 10 veces (y el informe le dice que fue suerte). Si en las pruebas la lección se ve
  poco, subir `probRocoso` es cambiar un número.

## Comparación entre partidas (informe tras REPETIR)

- **Qué guarda:** `Motor.repetirConPlan` deja en `estado.anterior` un resumen de la partida
  terminada (`Motor.resumenPartida`): cohete, objetivo, zona elegida en el hangar, equipo por
  tipo, reserva de regreso, trayectoria en vuelo, muestras recogidas y resultado. Solo la
  partida inmediatamente anterior, y solo en memoria: MISIÓN NUEVA o recargar la borran.
- **Qué cuenta como una decisión:** cada fila de `Motor.compararConAnterior(estado).cambios`.
  Cambiar batería 100 por 160 es **una** (se agrupa por tipo de equipo, no por pieza).
  Corregir en vuelo cuenta como "Trayectoria", no como cambio de zona. La reserva de regreso
  solo cuenta si alguna de las dos partidas la movió a mano (la automática depende de la zona).
- **La frase:** 1 cambio → «…Ese cambio es la causa» (o «no era la que ataba» si el resultado
  no cambió); 2 o más → «…no se sabe cuál pesó: repite cambiando solo una»; 0 → lo dice y, si
  el resultado difiere, lo atribuye a cuánto se caminó o escaneó en superficie.
- **En pantalla:** la frase va arriba, con borde de acento y el icono ⇄; la tabla ANTES vs
  AHORA va sobre la cadena de decisiones, que se acorta (de 8 a entre 2 y 4 entradas) para que
  todo quepa en 720 px. Con más de 3 cambios la tabla muestra 2 filas y resume el resto en una
  ("… y 7 cambios más"), para no empujar los botones fuera de la pantalla. Comprobado con 1 y 9.
- **Lanzar sin batería o con el plan corto:** LANZAR sigue sin bloquearse, pero el hangar avisa
  sobre el botón y el informe nombra esa causa en vez de hablar de un "margen de −46 Wh".

## Glosario de primera vez (tooltips)

- **Textos** en `datos.js` (`tooltipMargen`, `tooltipCargaUtil`, `tooltipAutonomia`,
  `tooltipReserva`, botón `btnEntendido`). Una línea cada uno, en vocabulario llano.
- **Dónde aparece cada término por primera vez:** *carga útil* en la barra de masa de la
  cabecera del hangar (antes decía "Masa"); *autonomía* como título de la tabla del panel 3;
  *margen* en "Margen de energía"; *reserva* en "Reserva por tramos".
- **Cómo se presenta:** `ui.termino(clave, etiqueta)` pinta el término con subrayado punteado
  y `title`. Tras cada render, `colocarGlosario()` añade una burbuja bajo el primer término en
  pantalla que aún no se presentó (una sola burbuja a la vez, en orden de lectura). La
  burbuja se cierra con [ ENTENDIDO ] **o con cualquier otra acción** (ya se presentó; no
  estorba a quien va rápido). Un clic sobre un término subrayado la reabre; otro la cierra.
- **Memoria:** solo durante la sesión (`vistos` en `ui.js`). Al recargar la página vuelven a
  salir, a propósito: en la demo para el jurado cada partida arranca "de cero". MISIÓN NUEVA y
  REPETIR no las reinician, porque el jugador ya las leyó.
- **Posición:** se calcula con `getBoundingClientRect` dividido por la escala del marco
  1280×720; se sujeta dentro de la pantalla y, si no cabe debajo, sale encima del término.
- **Accesibilidad:** la burbuja lleva `role="note"`, icono ⓘ y texto; el término conserva el
  `title` para quien pase el cursor.

## Entregables del hackatón

Son **dos enlaces**:

1. **Enlace de presentación** (el pitch para el jurado). **Es el foco actual.**
2. **Enlace del proyecto desplegado** (el juego jugable en línea). **Pendiente**; por
   ahora el juego se abre con doble clic en `index.html`.

## Qué falta (en orden de valor)

1. ~~Jugar y recalibrar~~ — hecho el 14-nov-2026, ver "Calibración vigente". Queda
   confirmarlo **jugando** en el navegador (las pruebas lo verifican con el motor).
2. ~~Botón [ RESERVAR ]~~ — hecho el 14-nov-2026, ver "Cómo funciona RESERVAR". Queda
   probarlo jugando y decidir si el reparto automático debe salir en ámbar (hoy sí).
3. ~~El momento 40/10/35~~ — hecho: ocurre con los números exactos al aterrizar junto al
   cráter con batería 100 (ver tabla de rutas).
4. ~~Tooltips de primera vez~~ — hecho el 14-nov-2026, ver "Glosario de primera vez".
   Si en las pruebas con gente las cuatro burbujas seguidas del hangar cansan, la opción
   barata es presentar *reserva* solo al abrir [ RESERVAR ].
5. ~~Desglose abrible de toda cifra~~ — hecho el 14-nov-2026, ver "Desglose de toda
   cifra".
6. ~~[ PROBAR ] marca en rojo el tramo donde faltaría~~ — hecho junto con RESERVAR:
   cada escenario lista ida / exploración / regreso con su reserva y lo que necesita.
7. **Animaciones** de despegue y descenso (hoy el cambio de etapa es seco).
8. **Sonido** (opcional, al final).
9. **Video de 30 s para el jurado**: 16 s hangar, 6 s decisión del cohete, 8 s
   extracción e informe.
10. **Despliegue** del juego en línea (segundo enlace del hackatón).

## Bitácora de cambios sin commit (para el commit único del equipo)

> Lo anterior al 14-nov-2026 por la tarde ya está en el commit `d14e2b1`
> ("feat(juego): calibra el balance, añade [ RESERVAR ] y tooltips de primera vez").

15-nov-2026 — interfaz guiada, niveles y pulido de usabilidad (pendiente de commit):

- `js/lunar-datos.js`: cada sitio trae su nivel (`nivelNombre`, `sistemas`, `presupuesto`,
  `kit`, `pasos`, `novedades`); `TEXTOS_LUNARES` (misión, pasos, voz de AIDA, frases por
  final); `SPRITE_AIDA`; sonidos `despegue`, `contacto`, `elegir`, `fallo`.
- `js/lunar-motor.js`: `iniciarNivel`, `sistemas`; el oxígeno no se gasta si el nivel no lo
  usa; la muestra extra solo existe con escáner; `evaluar` devuelve `energia` y `cerca` y
  redacta los avisos en lenguaje llano; `contexto().aviso`; `informe().resumen`
  (frases + consejo); `s.agotado`.
- `js/lunar-ui.js`: reescrito. Pantallas guiadas, medidor del plan, escenas animadas, HUD
  con zona "para volver", cruceta para ratón, navegación por teclado, progreso y rangos.
- `css/lunar.css`: reescrito para la interfaz nueva.
- `tests/lunar.test.js`: 738 comprobaciones nuevas de niveles (total 2366).
- Fusión de `main`: hallazgos, rocas, sprites, sonido de escaneo y nebulosas dentro de la
  interfaz guiada; 183 comprobaciones más (total 2549). Ver "Lo que se integró de `main`".
- `tests/browser.test.mjs`: reescrito para el flujo nuevo, con las comprobaciones de
  legibilidad por pantalla.
- `README.md` y `EQUIPO.md`: esta documentación.

14-nov-2026 — terreno variable (pendiente de commit):

- `js/datos.js`: `mapa.<zona>.probRocoso`, textos `eventoViajeDespejado` y `riesgoTerreno`.
- `js/motor.js`: `escanearViaje(estado, azar)` tira el dado y lo anota en el historial;
  `viaje.rocoso` / `viaje.probRocoso`; `proyeccionesViaje` y `mantener` usan el terreno
  revelado; `causal` añade las frases de suerte y de riesgo avisado; `resumenPartida` guarda
  el terreno y `compararConAnterior` devuelve `terrenoCambio` y matiza la frase.
- `js/ui.js`: riesgo en el hangar, en PROBAR, en VER CÁLCULO y antes del escaneo; banda verde
  cuando sale despejado; rocas sobre el planeta cuando sale rocoso; `azarTerreno()` con el
  parámetro `?terreno=`; fila "Terreno (azar)" en ANTES vs AHORA; `ajustarInforme()`.
- `css/style.css`: `.banda.evento.despejado`, `.informe.compacto`.
- `tests/motor.test.js`: las pruebas anteriores fijan el dado en roca (`escanearViaje(e, 0)`)
  y hay 47 nuevas. Total 166.
- `README.md`, `EQUIPO.md` y una nota en `CONTEXTO.md`.

14-nov-2026 — comparación entre partidas (ya en la rama `feature/comparacionpartidas`):

- `js/motor.js`: `estado.anterior`, `resumenPartida`, `compararConAnterior`;
  `repetirConPlan` guarda el resumen; `generarInforme` expone `comparacion`.
- `js/ui.js`: frase de comparación y tabla ANTES vs AHORA en el informe.
- `css/style.css`: `.causal.comparacion`.
- `tests/motor.test.js`: 31 pruebas nuevas (24 de comparación, 7 de lanzar sin batería o con el plan corto). Total 119.
- `EQUIPO.md` y `README.md`: esta documentación.

14-nov-2026 — desglose de toda cifra (ya en `db9e01d`):

- `js/motor.js`: `componentesTramo` (nueva fuente única del costo de un tramo),
  `costoTramoEnergia` pasa a usarla, `desglose()` expone `componentes`, `desgloseRegreso`.
- `js/ui.js`: `formulaTramo`, `desgloseOpcion`; chip del regreso clicable con modal
  `regreso`; tarjetas del viaje con desglose; VER CÁLCULO por componentes; escena del viaje
  320×84; burbuja del glosario anclada por lado y sin bloquear clics.
- `css/style.css`: `.chip.clicable`, `.escena-viaje`, `.opcion .dato`, `.burbuja` con
  `pointer-events` y variante `.derecha`.
- `tests/motor.test.js`: 20 pruebas nuevas (componentes por tramo, consistencia con el
  indicador, desglose del regreso en el momento 40/10/35). Total 88.
- `EQUIPO.md` y `README.md`: esta documentación.

14-nov-2026 — recalibración (ya en `d14e2b1`):

- `js/datos.js`: presupuesto 1100; escanear en superficie 5 Wh / 2 O₂; zona del cráter a
  3 pasos, rocosos [0,1,2,3], recargo 5 Wh; comentarios con los números clave.
- `js/motor.js`: el informe de varado añade una frase causal cuando la veta extra fue la
  perforación que rompió el balance; la recomendación del simulador corrige un redondeo
  de coma flotante (90 × 1.1 mostraba 100 Wh en vez de 99).
- `js/ui.js`: no dibuja la roca encima del módulo cuando el punto de aterrizaje es rocoso.
- `tests/motor.test.js`: adapta las pruebas al cráter a 3 pasos y añade 15 pruebas
  (rutas A y B viables, exclusión batería 160 + combustible, momento 40/10/35 por las
  dos decisiones, prudente vs codicioso, frase causal de la veta).
- `EQUIPO.md` y `README.md`: esta documentación.

14-nov-2026 — tooltips de primera vez:

- `js/datos.js`: `btnEntendido`; textos del glosario reescritos en una línea con la
  consecuencia ("es lo que te salva cuando el terreno sale peor").
- `js/ui.js`: `GLOSARIO`, `vistos`, `terminoAbierto`, `escala`; `termino()`,
  `colocarGlosario()`; la barra de masa pasa a "Carga útil"; "Autonomía" encabeza la tabla del
  panel 3; "Margen" y "Reserva" usan `termino()`; `manejar` cierra la burbuja con cualquier
  acción y gestiona `termino` / `entendido`; `render` coloca la burbuja al final.
- `css/style.css`: `.termino`, `.burbuja` (con flecha).
- `EQUIPO.md` y `README.md`: esta documentación.

14-nov-2026 — botón [ RESERVAR ]:

- `js/datos.js`: `costos.pasoReserva` (5 Wh), textos `btnReservar`, `btnRecomendado`,
  `tramos`, `tooltipReserva`, `reservaInvadida`.
- `js/motor.js`: `reservaPorDefecto`, `ajustarReserva`, `moverReserva`,
  `reservarRecomendado`, `evaluarReserva`; `lanzar` sella `plan.reserva` y lo anota en el
  historial; `descender` abre la fase *ida*; `gastar` atribuye el consumo a
  `real.porTramo[fase]` y anota una vez la entrada en la reserva de regreso; `avanzar`,
  `escanearSuperficie`, `recoger`, `perforar` y `regresar` cambian de fase (y ahora
  actualizan la posición antes de gastar, para que el historial diga el paso correcto);
  `regresar` guarda `regresoNecesario` y `energiaAlVolver`; `causal` añade las frases de
  reserva; `generarInforme` expone `reserva`, `porTramo`, `reservaInvadida`;
  `repetirConPlan` conserva una reserva manual.
- `js/ui.js`: componente `htmlReserva` (tres barras), barras de solo lectura en el panel 3,
  botón [ RESERVAR ] y modal con `[ − ]`/`[ + ]` y [ USAR RECOMENDACIÓN ], [ PROBAR ] con
  tramos en rojo, chip "Reserva regreso" en superficie, tabla "Por tramo" en el informe.
- `css/style.css`: estilos `.reserva*`, `.btn.mini.cuadrado`, `.chip.ok/.ambar`.
- `tests/motor.test.js`: 30 pruebas nuevas (reparto automático, mover, recorte al cambiar
  batería, recomendación, sellado al lanzar, consumo por tramo, entrada en la reserva,
  frase causal, repetir con reserva). Total 68.
- `EQUIPO.md` y `README.md`: esta documentación.

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

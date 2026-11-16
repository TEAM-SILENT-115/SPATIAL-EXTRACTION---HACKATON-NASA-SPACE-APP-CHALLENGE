# Misión Umbral — Contexto y especificación para implementación

> **Para quien lea esto:** eres un agente de código que va a construir este juego desde cero.
> Este documento es la única fuente de verdad. Contiene el contexto del concurso, el diseño del
> juego, la especificación técnica y los números a usar. Léelo completo antes de escribir código.

---

## 1. Contexto: qué es esto y por qué existe

Esto es un proyecto para el **NASA Space Apps Challenge 2026**, un hackatón internacional.
El reto que estamos resolviendo se llama **"Space Mission Design Game"** (Juego de diseño de
misiones espaciales), dificultad Intermedio / Principiante-Juventud, tema: Juegos.

### Qué pide el reto (resumen fiel del enunciado oficial)

Diseñar una misión espacial exige equilibrar exigencias contrapuestas: objetivos de la misión,
diseño de la nave, instrumentos científicos, vehículo de lanzamiento, presupuesto, energía, masa,
comunicaciones y restricciones orbitales. Para los estudiantes, que rara vez experimentan una
misión completa desde el concepto hasta la operación, estos compromisos quedan en lo abstracto.

El reto pide **crear un juego interactivo** donde los participantes diseñen, gestionen y simulen
una misión espacial completa, tomando decisiones de ingeniería, administrando recursos limitados
y evaluando cómo cada elección influye en el éxito de la misión.

Puntos del enunciado que el jurado valorará y que este diseño ataca directamente:

- Que cada decisión de diseño importante **tenga una consecuencia**. Ejemplo del propio enunciado:
  añadir un instrumento más capaz sube el valor científico pero también la masa, el consumo de
  energía, el costo y el volumen de datos.
- Que se demuestre que **rara vez hay una única solución perfecta**.
- Restricciones realistas: presupuesto, masa, energía, comunicaciones, vida útil.
- Que se enseñe **por qué** una decisión afecta el desempeño, no solo si estuvo bien o mal.
- Un **informe posterior a la misión** que explique por qué tuvo éxito o fracasó.
- Accesible para distintos niveles de conocimiento.
- Posibilidad de rejugar modificando el diseño y volver a simular.

### La pregunta que guía todo el diseño

> **"¿Qué decisión queremos que un estudiante entienda mejor después de jugar dos veces?"**

**Respuesta elegida, y es una sola:**

> Un recurso que llevas no es gratis: cuesta masa, presupuesto y espacio. Y el margen que **no**
> reservas al planificar es el que te deja varado cuando el terreno resulta más difícil de lo
> previsto.

Todo el juego existe para enseñar eso. Si una funcionalidad no sirve a esa lección, se recorta.

### Formulación del bucle central

> El jugador debe lograr **traer una muestra científica de vuelta al módulo de descenso**, pero
> solo cuenta con **la energía, el oxígeno y la masa que decidió llevar desde la agencia**, así que
> debe elegir entre **seguir explorando para conseguir una muestra mejor** y **regresar con lo que
> ya tiene antes de quedarse sin reserva**.

### Referentes de diseño (importante: inspiración, NO clonación)

- **Estética tipo Super Mario Galaxy:** planetas pequeños y redondos, órbitas dibujadas como líneas
  luminosas, colores saturados, tono amable y accesible.
- **Mecánica tipo Pikmin:** un total limitado que repartes, consecuencias permanentes, un indicador
  constante de "¿me alcanza para volver?".

⚠️ **Prohibido:** usar personajes, nombres, música, sprites, logos o cualquier activo de Nintendo o
de cualquier otra obra con derechos. La identidad visual debe ser **100% original**. Inspírate en la
*sensación*, nunca copies el contenido. Todo arte es generado o primitivas dibujadas por código.

---

## 2. El juego: Misión Umbral (Mission Threshold)

Juego educativo de exploración y extracción espacial. El jugador dirige una misión desde su diseño
en la agencia espacial hasta la recuperación de una muestra en un planeta desconocido.

La partida abre con esta pregunta en pantalla:

> «¿Cómo prepararías una expedición si solo pudieras llevar lo que cabe en tu cohete y todavía no
> supieras exactamente qué encontrarás al aterrizar?»

### Las tres etapas

1. **Antes del viaje** — Desarrollar la misión (la agencia / el hangar)
2. **Durante el viaje** — Operar el cohete en el espacio
3. **Después de la llegada** — Explorar y completar la extracción

**Lo que une las tres:** el jugador carga consigo el plan y los recursos que eligió al principio.
Si dejó atrás una herramienta, gastó de más en el cohete o calculó mal la reserva, descubre las
consecuencias en el viaje o en la superficie. **Nunca se puede volver atrás a corregir el equipaje.**

### Reparto de esfuerzo

La etapa 1 (hangar) es **la pantalla principal y la parte más importante**. Concentra el mayor
desarrollo. Las etapas 2 y 3 existen para *cobrar* las decisiones tomadas en la 1.

En el video de 30 segundos para el jurado: 16s hangar, 6s decisión en el cohete, 8s extracción y
resultado.

---

## 3. Etapa 1 — Antes del viaje (hangar)

El jugador está en una agencia espacial de diseño propio, inspirada en el trabajo de planificación
de la NASA pero con identidad visual original. Sobre la mesa hay un **informe preliminar del
planeta**: el reconocimiento identificó dos posibles zonas de descenso, pero hay incertidumbre
sobre el terreno. Con esa información incompleta, el jugador diseña su misión.

Cuatro paneles:

### 3.1 Objetivo científico y mapa

- **Decide:** entre traer **dos muestras superficiales de una llanura** o extraer **una muestra
  profunda de un cráter**. Marca dónde aterrizar y hasta dónde explorar.
- **Muestra:** distancia de ida y vuelta, información conocida del terreno, las incertidumbres
  explícitas, y qué herramienta exige cada objetivo.

### 3.2 Cohete y equipo

- **Decide:** selecciona el cohete, equipa el módulo de descenso y prepara el inventario de
  exploración. Compara baterías, tanques de oxígeno, taladro, escáner y contenedores.
- **Muestra:** cada objeto tiene función, costo y masa. Al equiparlo se actualizan en vivo el
  presupuesto, la carga útil y el espacio disponible para traer muestras.

### 3.3 Recursos y recomendaciones

- **Decide:** distribuye los recursos entre viaje, exploración y regreso al módulo. Decide cuánto
  margen reservar.
- **Muestra:** para cada recurso, **tres cantidades**: cuánto lleva, cuánto estima consumir, cuánto
  recomienda el simulador. El jugador puede **abrir el cálculo** para entender de dónde sale la
  recomendación. Esta transparencia es el corazón pedagógico del juego — no es una caja negra.

### 3.4 Simulador de misión

- **Decide:** prueba el plan en condiciones normales y en un escenario adverso. Cambia una pieza,
  la ruta o el lugar de aterrizaje y compara resultados.
- **Muestra:** proyección de llegada, autonomía en superficie, margen para regresar y objetivo
  científico alcanzable con cada configuración.

### El ejemplo pedagógico canónico (implementar exactamente así)

El jugador equipa una batería de **100 Wh**. El simulador estima:

| Tramo | Consumo |
|---|---|
| Ida | 30 Wh |
| Perforar | 25 Wh |
| Regreso | 35 Wh |
| **Total previsto** | **90 Wh** |

Le sobran 10 Wh. Parece suficiente. Pero si el **terreno difícil** añade 18 Wh, la necesidad real
sube a **108 Wh** y le faltan **8 Wh**.

El jugador ve el faltante y puede probar dos soluciones:

- **Llevar una batería mayor** → añade masa, que compite con el resto de la carga.
- **Aterrizar más cerca del cráter** → acorta el recorrido, pero ese terreno es más incierto.

Con una sola interacción el estudiante practica balance de energía, margen de reserva y comparación
de diseños. **Ninguna de las dos soluciones es la correcta** — ese es el punto.

> Todos los valores numéricos son **ficticios y de juego**, calibrados para enseñar, no para
> simular la realidad. Indicarlo en pantalla una vez.

---

## 4. Etapa 2 — Durante el viaje

Tras el despegue, el jugador pasa del escritorio de diseño a la cabina. Ve la trayectoria, el
combustible y los recursos que espera tener al aterrizar. Su tarea es gestionar el viaje y revisar
si el plan original sigue siendo viable.

**Para la demo, un solo acontecimiento importante.** Al aproximarse al planeta, un nuevo escaneo
revela **terreno rocoso en la zona de descenso elegida**. Dos opciones:

> **Actualización (14-nov-2026):** el escaneo ya no revela siempre terreno rocoso. Cada zona
> tiene un riesgo visible desde el hangar (llanura 30 %, cráter 60 %) y el escaneo dice qué
> salió en esa partida. Las dos opciones y sus costos son los mismos. Para la demo con el
> resultado de esta sección, abrir `game.html?terreno=rocoso`. Detalle en `EQUIPO.md`,
> "Terreno variable".

| Opción | Costo | Beneficio |
|---|---|---|
| **Corregir trayectoria** y aterrizar cerca del cráter | Gasta combustible de maniobra | Acorta el recorrido de exploración |
| **Mantener trayectoria** y aterrizar en la llanura | Conserva combustible | Recorrido mayor en superficie si mantiene el objetivo del cráter |

Antes de confirmar, el tablero **actualiza la proyección de ambas rutas** lado a lado.

Aquí se cobra la etapa 1: si reservó combustible, tiene libertad para corregir. Si equipó una
batería mayor, aguanta el recorrido largo. **La decisión en el cohete pone a prueba la preparación
hecha en la agencia.** Un jugador que no reservó margen descubre que una de las dos opciones
simplemente no está disponible para él.

---

## 5. Etapa 3 — Después de la llegada

El jugador sale del módulo con el equipo que preparó. Puede desplazarse, escanear, recolectar,
perforar y regresar. El inventario muestra las muestras que lleva y el espacio restante.

**Durante toda la exploración permanecen visibles dos indicadores:**

1. **Recursos disponibles**
2. **Recursos estimados para volver al módulo desde la posición actual** ← este es el indicador
   más importante del juego. Es la tensión constante.

### El momento central (implementar exactamente así)

El jugador ya tiene una muestra y descubre otra más profunda. Estado:

| Dato | Valor |
|---|---|
| Energía restante | 40 Wh |
| Costo de perforar | 10 Wh |
| Costo del regreso desde aquí | 35 Wh |

40 − 10 − 35 = **−5 Wh**. No alcanza para las dos cosas. Debe decidir: sigue explorando o inicia la
extracción con lo conseguido.

**Regla crítica:** una muestra cuenta para el objetivo científico **solo cuando el jugador consigue
llevarla de vuelta al módulo**. Quedarse varado con la mejor muestra del planeta es una derrota.

### Informe final

Compara **plan inicial / consumo real / resultado científico**. La devolución debe explicar **una
consecuencia concreta**, con esta voz:

> «Recuperaste la muestra profunda. La corrección de trayectoria acortó el recorrido y te permitió
> regresar con la batería que habías elegido.»

Nunca "ganaste" o "perdiste" a secas. Siempre **la cadena causal**: qué decisión → qué efecto.

Botón para **repetir la misión cambiando una decisión de la agencia** y observar qué sucede. La
segunda partida es donde ocurre el aprendizaje.

---

## 6. Alcance de la versión del hackatón

| Elemento | Cantidad |
|---|---|
| Planetas | 1 |
| Zonas de aterrizaje | 2 (llanura, cráter) |
| Objetivos científicos | 2 (dos muestras superficiales / una profunda) |
| Eventos durante el viaje | 1 (escaneo revela terreno rocoso) |
| Expedición | Corta |

**No implementar** (fuera de alcance, aunque el enunciado los mencione como opcionales):
multijugador en red, tablas de clasificación, modo sandbox, múltiples planetas, árbol tecnológico,
cuentas de usuario, backend.

El modo equipo de hasta 4 participantes se cubre como **colaboración alrededor de una misma
pantalla** (los cuatro deciden juntos), no como netcode. Mencionarlo en la documentación, no
programarlo.

---

## 7. Especificación técnica

### Stack

- **HTML + CSS + JavaScript vanilla**, un solo proyecto estático.
- Render 2D con **Canvas** o SVG. **Sin 3D, sin motor de juego, sin build complejo.**
- **Sin dependencias de red en tiempo de ejecución.** Debe funcionar abriendo el archivo, offline.
  El wifi de un hackatón es un riesgo real.
- Estética de juego Flash clásico: **una sola pantalla fija, sin scroll**, barras de recursos
  arriba, escena al centro, botones abajo.
- Resolución de diseño: **1280×720**, escalado proporcional al viewport.

### Entregable

Un **artifact publicado** (página HTML autocontenida) para que el equipo lo abra y lo pruebe desde
un link. Si el código crece, separar en archivos y publicar como artifact multiarchivo.

### Arquitectura

Separación estricta en tres capas:

```
/datos      → catálogo de objetos, costos, consumos, textos. JS plano, sin lógica.
/motor      → simulación pura: funciones (estado, decisión) → estado nuevo. Sin DOM.
/ui         → render y eventos. Lee del motor, nunca calcula reglas.
```

**El motor debe ser puro y testeable sin navegador.** Durante el hackatón se van a cambiar números
veinte veces; si la lógica está enredada con el DOM, cada ajuste cuesta media hora que no tienes.

### Estado del juego (forma orientativa)

```js
{
  etapa: 'hangar' | 'viaje' | 'superficie' | 'informe',
  presupuesto: { total, gastado },
  masa: { capacidad, usada },
  objetivo: 'llanura_doble' | 'crater_profunda',
  zonaAterrizaje: 'llanura' | 'crater',
  equipo: [ idObjeto, ... ],
  recursos: { energiaWh, oxigeno, combustible },
  plan: { estimadoIda, estimadoTarea, estimadoRegreso, margenReservado },
  real: { consumido, eventos: [] },
  posicion: { x, y },
  muestras: { recogidas: [], entregadas: [] },
  historial: [ { decision, efecto } ]   // alimenta el informe final
}
```

`historial` se va llenando en cada decisión relevante. **El informe final se escribe desde ahí**,
no se recalcula al final. Esto es lo que permite explicar el *por qué*.

### Botones — Hangar

| Botón | Consume | Qué cambia en pantalla |
|---|---|---|
| `[ EQUIPAR ]` | Masa y presupuesto | La pieza se encaja en la nave; suben las barras de masa y costo; el panel lateral muestra cuánta energía pedirá en superficie |
| `[ QUITAR ]` | — (devuelve masa y presupuesto) | La pieza se desprende; bajan las barras; la silueta de la nave se simplifica |
| `[ OBJETIVO ]` | — | Cambia la zona marcada en el mapa; se recalculan distancia ida/vuelta y la herramienta exigida |
| `[ RESERVAR ]` | Margen de los tramos | Mueve recursos entre viaje / exploración / regreso; tres barras que se quitan entre sí |
| `[ PROBAR ]` | Nada | Proyección en seco, normal y adverso, lado a lado; marca en rojo el tramo donde faltaría |
| `[ VER CÁLCULO ]` | Nada | Despliega el desglose de la recomendación (los 30+25+35 Wh) |
| `[ LANZAR ]` | Cierra el presupuesto | Animación corta de despegue; pasa a la etapa de viaje |

`[ LANZAR ]` se bloquea si la masa o el presupuesto están excedidos, con el motivo escrito.
**Nunca se bloquea por llevar poco margen** — equivocarse ahí es la lección.

### Botones — Viaje

| Botón | Consume | Qué cambia en pantalla |
|---|---|---|
| `[ ESCANEAR ]` | Un ciclo | Revela el terreno rocoso; dispara el evento |
| `[ CORREGIR ]` | Combustible de maniobra | La línea de trayectoria se dobla hacia el cráter; baja la barra de combustible; se actualiza la proyección de superficie |
| `[ MANTENER ]` | Nada | Conserva combustible; la proyección de recorrido en superficie se alarga |
| `[ DESCENDER ]` | — | Animación de descenso; pasa a la etapa de superficie |

### Botones — Superficie

| Botón | Consume | Qué cambia en pantalla |
|---|---|---|
| `[ AVANZAR ]` | Energía y oxígeno según distancia | La figura se desplaza; **sube el costo estimado de regreso** |
| `[ ESCANEAR ]` | Poca energía | Revela qué hay en el punto actual |
| `[ PERFORAR ]` | Energía (requiere taladro equipado) | Extrae la muestra profunda; ocupa espacio en el contenedor |
| `[ RECOGER ]` | Poca energía | Suma muestra superficial; ocupa espacio |
| `[ REGRESAR ]` | Energía y oxígeno del trayecto | Vuelve al módulo; **entrega las muestras**; fin de la misión |

El indicador de **regreso estimado** se recalcula tras cada acción y se pinta en ámbar cuando el
margen baja del 15%, en rojo cuando ya no alcanza. Sin texto de alarma — que el número hable.

### Reglas que no se negocian

1. **Una muestra solo cuenta si vuelve al módulo.**
2. **Quedarse sin energía u oxígeno lejos del módulo = misión perdida**, pero con informe que
   explica en qué decisión se rompió el balance. Nunca una pantalla seca de "perdiste".
3. **Las decisiones del hangar no se pueden deshacer** una vez lanzado.
4. **Toda cifra mostrada debe poder desglosarse.** Si el juego dice "necesitas 108 Wh", el jugador
   puede abrir de dónde salen.
5. **Nunca hay una única configuración ganadora.** Las dos rutas deben ser viables con planes
   distintos. Calibrar los números hasta que esto sea cierto, y verificarlo jugando.

### Accesibilidad

- Texto legible a 1280×720 sin zoom.
- Nunca comunicar estado solo con color: color + número + icono.
- Vocabulario llano. Los términos técnicos (margen, carga útil, autonomía) se introducen con un
  tooltip de una línea la primera vez que aparecen.
- Todo en **español**. Dejar los textos en un único archivo de datos por si se traduce.

---

## 8. Orden de construcción sugerido

1. **Motor + datos primero**, con los números del ejemplo canónico. Verificar por consola que
   100 Wh con terreno difícil da −8 Wh.
2. **Hangar completo y jugable.** Es el 60% del valor del proyecto.
3. **Informe final**, aunque las etapas 2 y 3 todavía no existan. Sin informe, el juego no enseña y
   no cumple el reto.
4. **Superficie**, con el momento de los 40/10/35 Wh.
5. **Viaje** (el más simple: una decisión binaria).
6. Pulido visual, animaciones, tooltips.

Si el tiempo se acaba, **un hangar excelente con informe explicativo vale más que tres etapas a
medias.** Recortar por el final, nunca por el principio.

---

## 9. Criterio de "terminado"

El proyecto está listo cuando una persona que no sabe nada de ingeniería espacial puede:

- jugar una partida completa en menos de 5 minutos,
- fallar o quedarse corta en algo,
- leer el informe y **decir en voz alta qué haría distinto**,
- rejugar cambiando una sola decisión y ver el efecto.

Si el jugador no puede nombrar qué cambiaría, el juego todavía no funciona.

# Misión Umbral 🚀

Juego educativo de diseño de misiones espaciales, hecho para el **NASA Space Apps Challenge 2026**
(reto *Space Mission Design Game*). Diriges una misión completa: la diseñas en la agencia, la
operas en vuelo y la terminas explorando el Polo Sur de la Luna para traer una muestra de hielo.

La idea que el juego quiere enseñar cabe en dos líneas:

> Un recurso que llevas no es gratis: cuesta masa, presupuesto y espacio. Y el margen que **no**
> reservas al planificar es el que te deja varado cuando el terreno resulta más difícil de lo previsto.

## Para quién es

Para estudiantes desde los 12 años y público general **sin conocimientos previos** de
ingeniería espacial. Por eso cada pantalla pide una sola decisión, el asistente AIDA explica en
una línea qué se está decidiendo, el glosario (`AYUDA → GLOSARIO`) dice qué es cada término y
qué implica, y los sistemas se introducen de a pocos en tres niveles.

## Qué es real y qué es de juego

**Real.** Los tres mapas son pendientes medidas del Polo Sur de la Luna: datos del altímetro
LOLA de la sonda Lunar Reconnaissance Orbiter (LRO) de la NASA, a 5 m por píxel, agrupados en
celdas de 20 m. Los sitios son Connecting Ridge (Site01), el borde de Shackleton (Site04) y el
borde de De Gerlache (Site11), zonas que la NASA estudia para futuros alunizajes. El terreno
que pisas y lo que cuesta cruzarlo sale de esos datos.

**De juego.** Las cifras de energía, oxígeno, masa y costo, la fórmula de consumo y la posición
del módulo, del cráter, de las rocas y de los hallazgos científicos están inventadas y
calibradas para enseñar a decidir. Los hallazgos describen fenómenos lunares reales (hielo en
sombra permanente, ilmenita, tubos de lava), pero su ubicación en el mapa es ficticia.

**Alcance.** La misión cubre el diseño en la agencia, el descenso y la exploración a pie hasta
volver al módulo. El viaje de regreso a la Tierra, la tripulación y los materiales del cohete
no se simulan: están en el trabajo futuro (ver [`ENTREGA.md`](ENTREGA.md)).

## Cómo empezar

El juego no tiene dependencias ni paso de compilación: son archivos HTML, CSS y JavaScript que
el navegador abre directamente. Solo necesitas un navegador moderno (Chrome, Edge o Firefox).

### 1. Consigue el código

Con Git:

```bash
git clone https://github.com/WilsonDnx115/SPATIAL-EXTRACTION---HACKATON-NASA-SPACE-APP-CHALLENGE.git
```

```bash
cd SPATIAL-EXTRACTION---HACKATON-NASA-SPACE-APP-CHALLENGE
```

Sin Git: en la página del repositorio pulsa **Code → Download ZIP** y descomprime la carpeta.

### 2. Abre el juego

Abre `index.html` para ver la página del proyecto y jugar desde ella, o abre `game.html` para ir directamente al juego. Para abrir el juego desde la terminal:

| Sistema | Comando |
|---|---|
| Windows | `start game.html` |
| macOS | `open game.html` |
| Linux | `xdg-open game.html` |

Funciona sin conexión y en una sola pantalla (1280×720, escalada al tamaño de tu ventana). Para
verlo más grande, pon el navegador en pantalla completa con `F11`.

### 3. Empieza la partida

Pulsa `JUGAR`, entra al **nivel básico** y sigue lo que te dice AIDA en la barra de abajo. Se
puede jugar entero con el teclado o con el ratón:

| Tecla | Qué hace |
|---|---|
| `Enter` | La acción principal de cada pantalla (el botón ámbar) |
| `1` `2` `3` o flechas | Elegir una opción en los menús |
| `← ↑ ↓ →` o `W A S D` | Caminar por la superficie |
| `E` | Perforar, recoger o entregar |
| `Esc` | Pausa |
| `M` | Sonido |

Para una primera partida que termine bien: en el nivel básico elige cualquier ruta y la
**batería de 160 Wh**, camina por la línea punteada hasta el cráter, pulsa `E`, y vuelve por la
línea azul hasta el módulo. Después repite con la batería de 100 Wh y compara lo que dice el informe.

### Opcional: servirlo desde un servidor local

No hace falta para jugar, pero sirve para probarlo desde otro dispositivo de la misma red. Con
Python instalado, dentro de la carpeta del proyecto:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000` en el navegador.

### Opcional: correr las pruebas

Solo si vas a tocar las reglas o los números del juego. Requiere [Node.js](https://nodejs.org):

```bash
node tests/motor.test.js
```

Debe terminar con «Todas las pruebas pasaron».

### Para colaborar

1. Crea una rama desde `main`: `git checkout -b feature/nombre-del-cambio`.
2. Haz tus cambios y corre las pruebas si tocaste `js/motor.js` o `js/datos.js`.
3. Sube la rama con `git push -u origin feature/nombre-del-cambio` y abre un pull request.

Las convenciones del equipo (mensajes de commit, qué va en cada archivo) están en
[`EQUIPO.md`](EQUIPO.md).

## Cómo jugar

La misión es siempre la misma y cabe en tres pasos: **ir** del módulo al cráter, **perforar** el
núcleo de hielo y **volver** al módulo. La muestra solo cuenta si vuelves. Cada paso gasta
energía, y en terreno empinado gasta mucho más.

Cada pantalla pide **una sola decisión**, con dos o tres opciones grandes, y una barra abajo
muestra al instante qué cambia: cuánta energía pide el viaje, cuánta llevas y cuánta te sobra o
te falta.

1. **Planear** — Un paso por decisión (ruta, batería…). La revisión final dice si el plan es
   sólido, arriesgado o imposible, y por qué. Puedes lanzar con riesgo: equivocarte ahí es la
   lección. Solo se bloquea si te pasas de masa o de presupuesto.
2. **Viajar** — El plan queda sellado. En el nivel avanzado decides si gastas combustible para
   corregir el descenso y aterrizar más cerca.
3. **Explorar** — Caminas por un mapa real de pendientes de la Luna. La barra de energía marca
   en todo momento la parte que necesitas **para volver**: mientras lo verde la supere, llegas.
   Antes de perforar, el juego te dice si después te seguirá alcanzando.
4. **Informe** — Un rango (de F a S+), dos o tres frases con lo que pasó y por qué, una lección
   y un consejo concreto para el siguiente intento. `REPETIR` te devuelve a la revisión con tus
   decisiones intactas para cambiar una sola.

### Tres niveles que suman sistemas

Cada nivel usa un sitio real del Polo Sur lunar y añade algo nuevo. Se desbloquean en orden.

| Nivel | Sitio | Decides | Lo nuevo |
|---|---|---|---|
| 1 · Básico | Connecting Ridge (suave) | Ruta y batería | Solo energía: aprender a ir y volver |
| 2 · Intermedio | Borde de Shackleton (mixto) | + oxígeno | Oxígeno, masa y un presupuesto que no alcanza para todo |
| 3 · Avanzado | Borde de Gerlache (extremo) | + cohete y extras | Combustible para corregir el descenso, escáner y fórmulas |

En los tres mapas hay **rocas** que cortan el paso y obligan a rodear. En el nivel avanzado,
además, el escáner permite registrar **hallazgos científicos** repartidos por el mapa (una
sonda precursora, vetas de hielo, un tubo de lava…): cada uno suma ciencia, pero ir a por él
cuesta energía.

El básico no se puede perder si sigues la línea: está hecho para aprender el ciclo. En el
intermedio ya hay planes que no vuelven, y el juego lo avisa antes de lanzar. En el avanzado
casi nada alcanza sin corregir el descenso, y el rango máximo (S+) exige traer dos muestras con
la carga a 2 kg del límite.

Todos los valores son de juego: están calibrados para enseñar, no para simular la realidad. Las
pendientes del terreno sí son datos reales (NASA LRO-LOLA).

## El ejemplo que resume el juego

Nivel intermedio, batería de 100 Wh. Por la **ruta directa** el viaje pide 105,6 Wh: faltan 5,6.
Por la **ruta de ahorro**, más larga pero más suave, pide 91: sobran 9, menos que la reserva
recomendada. Con la batería de 160 Wh sobra energía por cualquiera de las dos, pero entonces el
presupuesto ya no alcanza para el tanque de oxígeno grande. Ninguna opción es "la correcta":
ese es el punto.

## Arquitectura

```
index.html              página de presentación con el juego integrado
landing.css             estilos de la página de presentación
game.html               pantalla única del juego
css/style.css           base: marco 1280×720, botones, modales
css/lunar.css           interfaz guiada (azul NASA, pixel art)
js/datos.js             catálogo de equipo y costos (sin lógica)
js/motor.js             contabilidad de masa, presupuesto y equipo (sin DOM)
js/lunar-datos.js       reglas, niveles, finales, textos, sprites y sonido
js/lunar-motor.js       simulación del viaje y la superficie (sin DOM)
js/lunar-ui.js          pantallas, animaciones y eventos; nunca calcula reglas
js/ui.js                versión clásica y arte compartido (sprites)
data/nasa/processed/    mapas de pendientes ya procesados
tests/                  pruebas del motor (Node) y del flujo (navegador)
```

Las reglas son testeables sin abrir el navegador:

```bash
node tests/lunar.test.js
```

```bash
node tests/motor.test.js
```

`tests/lunar.test.js` (2549 comprobaciones) juega misiones completas en los tres mapas y
verifica los tres niveles: qué sistemas activa cada uno, que el básico se gana con cualquier
plan, que en el intermedio el presupuesto obliga a elegir y un plan corto deja varado, que en
el avanzado se gana corrigiendo el descenso, que el rango S+ es alcanzable, que ninguna roca
tapa una ruta o un punto clave y que los hallazgos solo cuentan si la expedición vuelve.

`tests/browser.test.mjs` recorre los tres niveles en un navegador real, con ratón y teclado, y
en cada pantalla comprueba tres cosas medibles de usabilidad: ningún texto por debajo de 13 px,
nada que se salga de la pantalla fija y no más de 10 botones a la vez. Necesita Edge abierto
sin cabeza en el puerto 9223 (el encabezado del archivo trae el comando).

Dos parámetros útiles para demos: `game.html?niveles=todos` abre los tres niveles sin tener
que ganarlos, `game.html?modo=clasico` abre la versión clásica, y en `AYUDA → BORRAR PROGRESO` se vuelve a empezar de cero (para que otra persona
pruebe el juego en el mismo equipo).

Todo el arte es pixel art original dibujado por código (sprites y primitivas de canvas) y el
sonido es sintetizado; no se usa ningún activo de terceros.

## Modo equipo

Hasta 4 personas juegan alrededor de una misma pantalla: una defiende el presupuesto, otra la
ciencia, otra los recursos y otra opera. Las decisiones se toman en voz alta antes de pulsar el
botón. No hay netcode ni cuentas: es colaboración de mesa, a propósito.

## Estado del proyecto

Versión jugable de punta a punta en tres niveles, con interfaz guiada (una decisión por
pantalla), seis finales, progreso guardado en el navegador, animaciones en todas las escenas y
sonido. El detalle del diseño, los criterios de usabilidad y el guion para probarlo con
personas están en [`EQUIPO.md`](EQUIPO.md).

Pendiente para iterar en equipo:

- **Probarlo con personas que no lo conozcan** (guion en `EQUIPO.md`) y ajustar lo que salga.
- Versión en inglés.
- Licencia del repositorio.
- Despliegue en línea (segundo enlace del hackatón; el primero es la presentación).

## Referencias

Recursos de la NASA:

- NASA GSFC, Planetary Geodesy Data Archive (PGDA). *High-Resolution LOLA Topography for Lunar
  South Pole Sites* (producto 78): <https://pgda.gsfc.nasa.gov/products/78>. De aquí salen los
  mapas de pendiente de 5 m por píxel de Site01, Site04 y Site11.
- NASA Science. *Lunar Reconnaissance Orbiter*: <https://science.nasa.gov/mission/lro/>.
- NASA Science. *VIPER*: <https://science.nasa.gov/mission/viper/>.
- NASA (2022). *NASA Identifies Candidate Regions for Landing Next Americans on Moon*:
  <https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/>.

Otras referencias:

- Barker, M. K., et al. (2021). Improved LOLA Elevation Maps for South Pole Landing Sites: Error
  Estimates and Their Impact on Illumination Conditions. *Planetary and Space Science*, 203,
  105119. <https://doi.org/10.1016/j.pss.2020.105119>.

## Créditos

Proyecto del equipo para el NASA Space Apps Challenge 2026. Inspirado en la *sensación* de los
juegos de planetas pequeños y de gestión de recursos limitados, con identidad visual 100 % propia.

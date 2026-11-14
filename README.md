# Misión Umbral 🚀

Juego educativo de diseño de misiones espaciales, hecho para el **NASA Space Apps Challenge 2026**
(reto *Space Mission Design Game*). Diriges una misión completa: la diseñas en la agencia, la
operas en vuelo y la terminas explorando un planeta helado para traer una muestra de vuelta.

La idea que el juego quiere enseñar cabe en dos líneas:

> Un recurso que llevas no es gratis: cuesta masa, presupuesto y espacio. Y el margen que **no**
> reservas al planificar es el que te deja varado cuando el terreno resulta más difícil de lo previsto.

## Cómo jugar

No hay nada que instalar. Descarga o clona el repositorio y abre `index.html` en cualquier
navegador. Funciona offline y en una sola pantalla (1280×720 escalada al tamaño de tu ventana).

Una partida dura menos de 5 minutos:

1. **Hangar** — Elige objetivo científico y zona de aterrizaje, equipa el cohete y revisa el
   simulador. Cada pieza cuesta créditos y masa. El botón `[ VER CÁLCULO ]` abre el desglose de
   cada número: nada es caja negra.
2. **Viaje** — Un escaneo revela terreno rocoso en tu zona. ¿Corriges trayectoria gastando
   combustible o mantienes el rumbo y asumes el recorrido caro? Si no reservaste combustible,
   una de las dos opciones ni siquiera existe para ti.
3. **Superficie** — Explora, escanea, recoge y perfora. El indicador clave está siempre arriba:
   *cuánto cuesta volver al módulo desde donde estás*. Una muestra solo cuenta si la entregas.
4. **Informe** — El juego explica la cadena causal (qué decisión produjo qué efecto) y te invita
   a repetir cambiando una sola decisión. La segunda partida es donde ocurre el aprendizaje.

Todos los valores son ficticios y de juego: están calibrados para enseñar, no para simular la realidad.

## El ejemplo que resume el juego

Llevas una batería de 100 Wh. El simulador estima: ida 30 + perforar 25 + regreso 35 = **90 Wh**.
Sobran 10. Pero si el terreno sale rocoso suma +18 y la necesidad real es **108 Wh**: faltan 8.
¿Batería más grande (más masa) o aterrizar más cerca (terreno más incierto)? Ninguna de las dos
es "la correcta" — ese es el punto.

## Arquitectura

```
index.html        pantalla única
css/style.css     estética pixel / juego Flash clásico
js/datos.js       catálogo, costos, mapa y textos (sin lógica)
js/motor.js       simulación pura: (estado, decisión) → estado nuevo (sin DOM)
js/ui.js          render y eventos; lee del motor, nunca calcula reglas
tests/motor.test.js  pruebas del motor con Node, sin navegador
```

El motor es testeable sin abrir el navegador:

```
node tests/motor.test.js
```

Las pruebas verifican, entre otras cosas, el ejemplo canónico (100 Wh con terreno difícil → −8 Wh),
que lanzar solo se bloquee por masa o presupuesto (equivocarse de margen es la lección, no un error),
y que una muestra no cuente hasta volver al módulo.

Todo el arte es pixel art original dibujado por código (sprites y primitivas de canvas); no se usa
ningún activo de terceros.

## Modo equipo

Hasta 4 personas juegan alrededor de una misma pantalla: una defiende el presupuesto, otra la
ciencia, otra los recursos y otra opera. Las decisiones se toman en voz alta antes de pulsar el
botón. No hay netcode ni cuentas: es colaboración de mesa, a propósito.

## Estado del proyecto

Versión base jugable de punta a punta (hangar → viaje → superficie → informe). Pendiente para
iterar en equipo:

- Reparto fino de recursos entre tramos (botón `[ RESERVAR ]` con tres barras).
- Animaciones de despegue y descenso.
- Tooltips de primera aparición para términos técnicos (hoy son títulos al pasar el cursor).
- Recalibrar números jugando hasta confirmar que ambas rutas ganadoras se sienten justas.
- Sonido.

## Créditos

Proyecto del equipo para el NASA Space Apps Challenge 2026. Inspirado en la *sensación* de los
juegos de planetas pequeños y de gestión de recursos limitados, con identidad visual 100 % propia.

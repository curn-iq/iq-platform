# El frontend de SIVRI por dentro

Cómo está hecha la app de la cámara. Cómo se corre y se despliega:
[`../frontend/README.md`](../frontend/README.md).

## Decisiones

| Tema | Decisión |
|---|---|
| Computador o celular | `(hover: hover) and (pointer: fine)` es un computador: la entrada muestra la dirección con un código QR y no hay camino a la cámara, que no vería la mesa desde arriba |
| Qué pide cuenta | La entrada y la página del computador son públicas; la cámara pide cuenta |
| Qué se manda | El cuadro completo en JPEG de calidad 0,75 y 640 px de lado mayor, uno cada 400 ms y uno a la vez |
| Cuándo se compara | «Ya armé la mesa» se activa con los cuatro marcadores; el resultado se fija cuando la misma técnica sale primera en 5 resultados seguidos |
| Dónde se dibuja | Mientras se arma, sobre el video; el resultado fijado, sobre el cuadro que se mandó |
| Pieza por mover | Caja y etiqueta en `alerta-noche` y una flecha en la dirección de `move` |
| Pieza que falta | Solo en la lista: el backend no da la caja esperada |
| Código QR | SVG estático (`public/qr-sivri.svg`); si cambia la dirección, se genera de nuevo |
| Presupuesto | Código inicial: aviso a los 300 KB y error a los 500 KB |

## Arquitectura

Solo `data/` sabe que existe HTTP o un WebSocket. `domain/` es lógica pura, sin
Angular, y es lo que se prueba más a fondo. `check` usa `camera`, `data`,
`domain` y `core`; `domain` no usa nada de Angular ni de las APIs.

## El recorrido (`domain/flow.ts`)

Una máquina de estados pura: permiso → encuadrar → armar → resultado → pieza por
mover → revisar de nuevo, más los estados de error. No toca la cámara ni la red:
`CheckService` le avisa lo que pasa y deja la cámara y la conexión como las pide
el estado.

- Con el resultado fijado se apagan la cámara y la conexión, para no gastar datos.
- Los dudosos cuentan como en su lugar y no se marcan.
- Lo que hay que corregir se recorre en orden: mover, falta y sobra.

## Cámara y conexión

- **Cámara:** la trasera (`facingMode: 'environment'`); se apaga al salir de la
  pantalla o al ocultar la pestaña, y vuelve sola.
- **Token corto:** se pide a DataIQ con la cookie y se reutiliza mientras le
  quede más de un minuto de los 5 que dura.
- **WebSocket:** el primer mensaje lleva el token y cada cuadro va como mensaje
  binario. Si se corta, reconecta esperando 1, 2, 4, 8 y 15 segundos. Un cierre
  4401 se reintenta una vez con un token nuevo; dos seguidos son sesión vencida.

## Rutas

| Ruta | Qué muestra | Cuenta |
|---|---|---|
| `/sivri` | La entrada: en el celular, «Abrir la cámara»; en el computador, la dirección y el código QR | No |
| `/sivri/camara` | La cámara, sin la barra del shell. `?tecnica=<id>` valida esa técnica en vez de reconocerla | Sí |

Es el destino de «Comprobar con la cámara» en DataIQ.

## Errores

Cada uno es una página de texto con titular, párrafo y una acción
(`check/error-page/error-copy.ts`):

| Estado | Cuándo | Acción |
|---|---|---|
| Sin conexión | El WebSocket se corta o no hay red | Intentar de nuevo |
| Cámara bloqueada | No se dio el permiso | Ya la permití |
| Equipo sin cámara | No hay cámara, otra app la usa o no es HTTPS | Intentar de nuevo |
| Sesión vencida | 401 de DataIQ o dos cierres 4401 seguidos | Ingresar |
| Técnica fuera del alcance | Cierre 4404 | Revisar de nuevo |
| Técnica no reconocida | La mesa se ve pero ninguna técnica se parece | Revisar de nuevo |

# Checklist — Backend de SIMIQ3D

Avance del backend de SIMIQ3D. Se marca cada pieza al terminarla. Cómo está
hecho y cómo se corre: [`backend/README.md`](../backend/README.md).

## Base del proyecto

- [x] Proyecto Python con `uv` (Python 3.14), FastAPI y arquitectura hexagonal
- [x] Configuración con `pydantic-settings` y `.env.example`
- [x] `GET /health`
- [x] Ruff y pytest
- [x] Imagen de contenedor (`Dockerfile`) y `vercel.json` (región `cle1`)

## Sesión

- [x] Validar el JWT de DataIQ con su clave pública (JWKS), de la cookie o de
  `Authorization: Bearer`
- [x] `X-IQ-Client` en las escrituras con cookie; CORS cerrado por defecto
- [x] Seguir validando con las claves conocidas si DataIQ no responde; `503`
  si nunca las tuvo

## Base de datos

- [x] PostgreSQL 18 local en contenedor (`simiq3d-db`, puerto 5433)
- [x] Esquema en [`esquema.dbml`](esquema.dbml): `model_mappings` y `chat_logs`
- [x] Migraciones con Alembic (acciones `answer` y `clarify` en una aparte)
- [x] Proyecto de SIMIQ3D en Neon (`simiq3d`, PostgreSQL 18, Ohio), migrado

## Catálogo de DataIQ

- [x] Cliente de `GET /catalog/full` con el token de quien pregunta, copia de
  5 minutos y `ETag`
- [x] Si DataIQ no responde, se usa la última copia
- [x] Ubicación de cada objeto dicha como en la práctica: zona de la mesa,
  vecinos y número del diagrama (nunca fila y columna)

## Chat

- [x] Plantillas de respuesta con datos de DataIQ (motor por defecto y respaldo)
- [x] Agente con Ollama: consulta el catálogo (técnicas, instrumentos, comparar
  mesas, visor) y redacta la respuesta
- [x] Verificación de la respuesta del agente (nombres, números, ubicaciones,
  sin cuadrícula); si no pasa, responden las plantillas
- [x] «¿Quizás quisiste decir…?» para nombres mal escritos
- [x] Pregunta ambigua: pide precisar en qué técnica
- [x] Sin tiempos quirúrgicos (2026-11-02): una pregunta por tiempos
  (diéresis, hemostasia, síntesis…) o por el orden en que se usa el
  instrumental la responde una regla fija, y el prompt le prohíbe al modelo
  ordenar las piezas por tiempos. Antes, el modelo presentaba las posiciones
  de la mesa de Tiroidectomía como «el orden por tiempo quirúrgico» y lo
  justificaba con una frase propia; la verificación no lo detectó, porque
  compara nombres, números y ubicaciones, no lo que se afirma de ellos.
  Preguntas 113 a 117 del banco; el banco completo, en local con Qwen3-VL el
  2026-11-02, dio 115 de 117 (98,3 %): fallan la 50 (pendiente, abajo) y la
  54, que pasa al repetirla sola
- [x] Una llamada escrita como texto («reply("…")») después de la respuesta ya
  no la repite
- [x] «¿Y la Kelly Adson?» con Eventrorrafia abierta (pregunta 50 del banco):
  el modelo abría la técnica con `show_in_3d` sin el instrumento, y la pinza
  no se señalaba. Desde el 2026-11-02, si el modelo abre la técnica sin el
  instrumento por el que se preguntó y ese instrumento va en su mesa, se
  señala igual
- [x] `POST /chat` con el contrato acordado con el frontend
- [x] Probado con Qwen2.5 7B y Qwen3-VL 8B en la RX 6600 XT
- [x] Modelo del MVP: Qwen3-VL 8B instruct
- [x] Banco de preguntas con su respuesta correcta, para medir la exactitud
  (`eval/banco.csv` y el comando `chat_bank`)
- [x] La acción sale de la pregunta también con el modelo de lenguaje
  (2026-11-02). Antes solo salía como `show_technique` o
  `highlight_instrument` (más `answer` y `clarify`): «¿Qué es la tijera de
  Mayo?» no abría la ficha, aunque el texto la describía, y un dato clínico
  salía como «Mostrar técnica». Ahora el modelo escribe el texto y la acción
  sale de la misma regla de las plantillas (`asked_action`): describir, dato
  clínico con su campo, lista o técnica. El banco califica también la acción
  en «describir», «dato» y «listar»

### El modelo entiende y DataIQ responde

Decidido por Mauricio el 2026-11-03 (README de SIMIQ3D, «Chat»).

- [x] Comprobar que Qwen3-VL 8B, en Ollama, pide varias consultas en un mismo
  turno y elige bien entre los pedidos, con las preguntas de la conversación
  del 2026-11-02, antes de cambiar el agente. Probado el 2026-11-03 en local,
  con 17 preguntas (las 9 de esa conversación y 8 de otros tipos): con las
  instrucciones ajustadas, 15 eligieron bien sus pedidos, entre ellas
  «Dime todo sobre la mastectomía, indicaciones, complicaciones, anestesia y
  posición, instrumental de la mesa y tiempo quirúrgico», que salió con sus
  cinco pedidos en un turno. Mediana de 1,7 s por pregunta y máximo de 8,4 s.
  Fallaron los dos seguimientos, con la conversación como resumen; con la
  pregunta anterior como turno de la conversación, los 5 seguimientos probados
  salieron bien. Son preguntas de desarrollo: la medida es el banco
- [x] Los pedidos como consultas del modelo (`locate`, `describe`,
  `clinical_data`, `list_instruments`, `show_technique`, `find_instrument`,
  `compare`, `rank`, `out_of_scope`, `greeting`), cada uno con su plantilla;
  «el bisturí» o un nombre parecido piden aclarar en vez de adivinar
- [x] La respuesta une los pedidos en orden; la escena es la del pedido más
  visual
- [x] Respuesta parcial: lo que está fuera de alcance va en una línea al final,
  con lo que sí hay
- [x] Lo que pide el modelo se valida contra la conversación: una técnica o un
  instrumento que nadie nombró no cuenta, un «fuera de alcance» que nombra algo
  de DataIQ pasa a las reglas fijas, y los tiempos quirúrgicos siempre llevan
  su nota. En el banco, sin técnica abierta, el modelo ponía una técnica de la
  lista en «¿Dónde va la Kelly?»
- [x] Contexto: `POST /chat` devuelve los pedidos de cada respuesta y recibe
  hasta 3 preguntas anteriores con sus pedidos, que van al modelo como turnos
  de la conversación
- [x] Respaldo: si el Servidor PC2 está lento u ocupado, las reglas fijas
  interpretan la pregunta y responden las mismas plantillas; «sin tiempos
  quirúrgicos» ya no bloquea la pregunta
- [x] Sin la verificación del texto del modelo (`grounding.py`) ni las
  consultas que el modelo ya no hace
- [x] Banco: 21 preguntas de tipos nuevos (varias cosas, una parte fuera de
  alcance, negación, saludo, seguimiento con la pregunta anterior), con las de
  la conversación del 2026-11-02. Corrido en local con Qwen3-VL 8B el
  2026-11-03, antes y después del cambio:

  | | Antes | Después |
  |---|---|---|
  | Las 117 de antes | 117 | 117 |
  | Las 21 nuevas | 5 | 20 |
  | Total | 122/138 (88,4 %) | 137/138 (99,3 %) |
  | Mediana por pregunta | 4,3 s | 1,4 s |

  Falla «Bueno pero dime lo demás sin tiempo quirúrgico», que supone que la
  pregunta anterior quedó sin responder. El 99,3 % es sobre el banco con que se
  ajustó el chat
- [x] Documentación: el README del backend («Cómo responde el chat»), el
  contrato de `POST /chat` y `.claude/rules/simiq3d.md`

### La redacción

Decidido por Mauricio el 2026-11-03 (README de SIMIQ3D, «Chat», «La
redacción»).

- [x] Prueba con las 8 preguntas de la conversación del celular, antes de
  construir: las 8 pasaron la verificación; redactar sumó de 1,5 a 8 s, y 17 s
  la más larga
- [x] El modelo redacta solo con los datos de cada pedido y la descripción de
  la técnica (`app/domain/writing.py`); la mesa de Mayo va después, tal como
  sale de DataIQ
- [x] Verificación: nombres, números en cifras y en letras, cuadrícula,
  tiempos quirúrgicos u orden de uso, explicaciones y relleno, datos omitidos,
  lo que DataIQ no tiene dicho y nada más dado por faltante, y el largo
- [x] Respaldo: lo armado si no pasa o si tarda más de `LLM_WRITE_DEADLINE`
  (20 s); tope de `max_tokens` en las dos llamadas; las aclaraciones y las
  negativas no se redactan; `LLM_WRITE=false` la apaga
- [x] «No va en esta mesa» dice dónde sí va, con la pregunta para verlo ahí
- [x] `compare` con el ejemplo de «qué lleva X que no lleve Y»
- [x] Banco: el juez de fidelidad (`--fidelidad`), que revisa cada frase
  redactada contra sus datos, y «modelo, texto armado» en quién respondió
- [x] La fuente en el campo de pregunta: «Responde con los datos de DataIQ»
- [x] Banco con la redacción, en local con Qwen3-VL 8B el 2026-11-03. Cada
  corrida ajustó las instrucciones o la verificación según lo que marcó el
  juez:

  | Corrida | Exactitud | Redactadas | Sin frases sin respaldo (juez) | Mediana |
  |---|---|---|---|---|
  | Sin redacción (#68) | 137/138 | — | — | 1,4 s |
  | 1. Instrucciones iniciales | 135/138 | 102 | 93 | 3,7 s |
  | 2. Con lo que muestra el visor como contexto | 137/138 | 93 | 67 | 4,9 s |
  | 3. Instrucciones en positivo | 137/138 | 78 | 62 | 4,9 s |
  | 4. Las iniciales, sin contar objetos ni explicar, con toda la verificación | 137/138 | 90 | 88 | 3,6 s |

  Queda la 4. Las respuestas no redactadas son aclaraciones, negativas o
  textos que no pasaron la verificación (18), que muestran lo armado. El juez
  es el mismo modelo y se equivoca: en una respuesta no respondió frase por
  frase. Falla la misma pregunta que sin redacción («dime lo demás sin tiempo
  quirúrgico»)
- [x] Tope de la redacción en 20 s (2026-11-03): en producción, «Dime todo
  sobre la mastectomía…» pasaba de 12 s y se mostraba lo armado; en el MVP se
  acepta esperar más (decidido por Mauricio). El log dice también cuándo la
  redacción no terminó a tiempo, como cuando no pasa la verificación
- [ ] Probar en producción, con el Servidor PC2: el tiempo de punta a punta

## Modelos 3D

- [x] `GET /models` con `Cache-Control` y `ETag`
- [x] Comando `load_models`: de `models/modelos.csv` (nombre o alias) a los ids
  del DataIQ de cada entorno
- [x] Cargar el mapeo cuando estén los GLB (23 modelos, en local y en Neon)

## Registro de conversaciones

- [x] Registro anónimo con `CHAT_LOG_ENABLED` (acción, ids, quién respondió,
  demora)
- [x] Tiempo máximo por pregunta (30 s); si se acaba, responden las plantillas
- [x] Tope de preguntas por cuenta (`chat_quota`, id cifrado con HMAC)
- [x] Filtro del Servidor PC2 con límite de preguntas simultáneas (`429`)
- [x] `CHAT_QUOTA_SECRET` en Vercel y la migración del tope en Neon
- [x] Comando `chat_log` para exportarlo a CSV y borrarlo
- [x] La exportación trae la fecha y hora de cada pregunta, y separa una
  sesión de evaluación con `--desde` y `--hasta`

## Despliegue

- [x] Workflow de GitHub Actions (estilo y pruebas en cada PR; despliegue en
  cada push a `main` e imagen en ghcr.io)
- [x] Proyecto de Vercel `simiq3d-backend`, con las variables que no son secretas
- [x] `DATABASE_URL` de Neon, `LLM_URL` y `LLM_API_KEY` en Vercel
- [x] Filtro con clave del Servidor PC2 (`servidor-pc2/filtro.py`), con pruebas
  y probado con Ollama
- [x] Servidor PC2: filtro como servicio de usuario (sigue sin sesión abierta)
  y Tailscale Funnel (`https://fedora.tail5cf085.ts.net`, solo el filtro)
- [x] Servidor PC2 sin suspensión por inactividad
- [x] Desplegado en producción: https://simiq3d-backend.vercel.app (sesión
  validada contra la clave pública del DataIQ de producción)
- [x] Chat probado de punta a punta en producción, con una cuenta de DataIQ

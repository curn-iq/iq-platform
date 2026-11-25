# El chat de SIMIQ3D

Cómo responde el tutor del chat, qué límites no puede cruzar y por qué está hecho
así. Cómo se corre el backend: [`../backend/README.md`](../backend/README.md).
Cómo se muestra en pantalla: [`frontend.md`](frontend.md#el-chat).

## Cómo responde el chat

Una sola llamada al modelo de lenguaje por pregunta:

1. **El código decide de qué se habla** (`app/domain/focus.py`): las técnicas y
   los instrumentos que nombra la pregunta, la técnica abierta en el visor y, en
   un seguimiento, lo de las preguntas anteriores. Un nombre mal escrito
   («kely») se corrige antes, sin preguntar.
2. **Trae de DataIQ solo eso** (`app/domain/tutor.py`): los datos clínicos de la
   técnica, su mesa de Mayo objeto por objeto (número, zona, vecinos y para qué
   sirve) y lo que DataIQ no tiene, dicho como tal.
3. **Decide qué hace el visor:** señalar un instrumento, abrir su ficha, abrir
   una técnica o no cambiar nada. El modelo no decide la escena.
4. **El modelo redacta la respuesta** con esos datos y puede explicar con su
   conocimiento general lo que DataIQ no trae, diciéndolo («en general…»).
5. **Cada frase se revisa contra DataIQ** a medida que llega
   (`app/domain/review.py`): la que cruza un límite se cambia por el dato real.

Con `LANGUAGE_MODEL=fake` responden reglas fijas con plantillas, sin el modelo,
para desarrollar.

## Los límites

| Límite | Qué queda en su lugar |
|---|---|
| La mesa de Mayo: un instrumento que no va, un número, una zona o una cantidad distinta de DataIQ | Dónde va de verdad, según DataIQ |
| Ordenar o agrupar la mesa por tiempos quirúrgicos u orden de uso | Que DataIQ no tiene los tiempos ni el orden de uso |
| Dosis de medicamentos | Que las dosis las indica el equipo médico |
| Filas, columnas o celdas | Nada: la frase sale; la mesa se describe por zona, vecinos y número |

Ante una pregunta sobre la salud de quien escribe, explica en general y dice que
la decisión es del equipo médico. Ante algo que no es del tema, lo dice en una
frase y ofrece ayuda con la mesa.

## Sin el modelo

Si el Servidor PC2 está apagado, ocupado o tarda más de `LLM_DEADLINE`, la
respuesta lo dice y muestra lo que DataIQ tiene de lo que se nombró. Si deja de
responder a mitad, lo mostrado queda con una nota.

## La respuesta a medida que se escribe

`POST /chat/stream` manda primero lo que hace el visor (`start`), después cada
frase ya revisada (`text`) y al final la respuesta completa (`end`). El visor se
mueve antes de que el modelo empiece a escribir, y nunca se muestra algo que
después se quite. `POST /chat`, que responde todo junto, queda para el banco de
preguntas.

## El modelo de lenguaje

Qwen3-VL 8B instruct con Ollama, en el Servidor PC2 (GPU de 8 GB), detrás de un
filtro con clave publicado por Tailscale Funnel
([`../servidor-pc2/README.md`](../servidor-pc2/README.md)). Se eligió frente a
Qwen2.5 7B porque da respuestas más completas a cambio de más segundos. Es
gratuito y no depende de un tercero; el backend habla con él por la API
compatible con OpenAI, así que cambiarlo es cambiar la configuración.

## Por qué así

El primer chat convertía cada pregunta en un pedido con plantilla: era fiel a
DataIQ pero no conversaba. El tutor conversa, y la confianza la dan la revisión
de cada frase y la línea bajo cada respuesta: «Mesa y técnica: DataIQ. Lo demás
lo explica un modelo de IA y puede equivocarse». Se siguieron estas guías:

- Empezar por lo más simple, un modelo con la información que necesita
  ([Anthropic, *Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents)).
- Revisar frase por frase contra la fuente
  ([OpenAI, *Developing hallucination guardrails*](https://developers.openai.com/cookbook/examples/developing_hallucination_guardrails)).
- Dejar claro qué hace el sistema y degradar con gracia cuando falla
  ([Microsoft, guías de interacción humano-IA](https://www.microsoft.com/en-us/haxtoolkit/library/pattern/)).
- Mostrar avance si la espera pasa de 10 s
  ([Nielsen, *Response Times*](https://www.nngroup.com/articles/response-times-3-important-limits/)).

Riesgo aceptado: un modelo de 8B puede equivocarse al explicar lo que DataIQ no
trae. Se controla con la revisión, la línea de fuentes y el banco de preguntas;
un modelo mayor queda para después del MVP
([`docs/despues-del-mvp.md`](../../docs/despues-del-mvp.md)).

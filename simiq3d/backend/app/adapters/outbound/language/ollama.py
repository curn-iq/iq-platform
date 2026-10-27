import json
import logging
import re
from dataclasses import replace
from uuid import UUID

import httpx

from app.adapters.outbound.language.fake import TemplateChat
from app.domain import tools
from app.domain.catalog import (
    Catalog,
    find_instrument,
    in_scope,
    item_with,
    normalize,
    technique_by_id,
)
from app.domain.chat import ChatAction, Reply, Vocabulary, the
from app.domain.grounding import unsupported
from app.domain.names import asks_to_describe, contains, instrument_in
from app.ports.chat import ModelUnavailable

logger = logging.getLogger(__name__)

SYSTEM = """Eres el chat de SIMIQ3D: ayudas a estudiantes de Instrumentación \
Quirúrgica a explorar la mesa de Mayo de las técnicas de Cirugía General, que \
se ven en 3D.
Reglas:
- No sabes nada por tu cuenta. Todo dato sale de las herramientas: consúltalas \
antes de responder, las veces que haga falta.
- Si una herramienta devuelve "quizas" en vez del dato, no supongas: pregunta \
«¿Quizás te refieres a …?».
- Si la pregunta no trata de estas técnicas o de su instrumental, o te pide otra \
cosa, dilo en una frase.
- Cuando hables de una técnica o de dónde va un instrumento, llama a show_in_3d \
para que el visor lo muestre.
- Para decir dónde va algo, usa la ubicacion (la zona de la mesa), lo que \
tiene junto_a y su numero_en_el_diagrama. Nunca hables de filas, columnas ni \
celdas: la mesa real es un campo sin cuadrícula.
- Los datos clínicos (indicaciones, complicaciones, anestesia…) se citan como \
vienen; no los resumas con palabras tuyas.
- Si un instrumento va en varias técnicas, di su ubicación en cada una: no \
generalices («en todas va en…») si cambia.
- Si preguntan qué es un instrumento y su descripción dice que DataIQ no tiene \
el dato, responde eso; después puedes decir dónde va.

- Termina siempre llamando a reply con la respuesta en español, breve (una a \
tres frases), sin inventar nada que no esté en lo que devolvieron las \
herramientas.
- Si DataIQ no tiene un dato, dilo así."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": {k: {"type": t, "description": d} for k, t, d in params},
                "required": [k for k, _, _ in params if k not in optional],
            },
        },
    }
    for name, description, params, optional in [
        (
            "list_techniques",
            "Las técnicas que hay, con cuántos objetos lleva cada mesa de Mayo "
            "(de más a menos).",
            [],
            (),
        ),
        (
            "compare_techniques",
            "Compara el instrumental de las mesas de Mayo de dos técnicas: qué "
            "comparten y qué lleva solo cada una.",
            [
                ("first", "string", "Primera técnica"),
                ("second", "string", "Segunda técnica"),
            ],
            (),
        ),
        (
            "get_technique",
            "Datos clínicos de una técnica y su mesa de Mayo (número, objeto y celda).",
            [("technique", "string", "Nombre de la técnica, aunque esté mal escrito")],
            (),
        ),
        (
            "find_instrument",
            "Un instrumento: su descripción y en qué técnicas va, con número y celda.",
            [
                (
                    "instrument",
                    "string",
                    "Nombre del instrumento, aunque esté mal escrito",
                )
            ],
            (),
        ),
        (
            "show_in_3d",
            "Abre una técnica en el visor 3D y, si se da, resalta un instrumento.",
            [
                ("technique", "string", "Nombre de la técnica"),
                ("instrument", "string", "Nombre del instrumento a resaltar"),
            ],
            ("instrument",),
        ),
        (
            "reply",
            "La respuesta final para el estudiante. Llamarla siempre al terminar.",
            [("text", "string", "La respuesta, en español")],
            (),
        ),
    ]
]


class OllamaAgent:
    """El chat con el modelo de lenguaje del Servidor PC2 (Ollama, API compatible
    con OpenAI). El modelo decide qué consultar del catálogo, en varios pasos, y
    redacta la respuesta con lo que devolvieron las consultas.

    Riesgo aceptado (decisión del 2026-10-27): el texto lo escribe el modelo. Se
    controla con dos cosas: el modelo solo ve lo que devuelven las consultas, y
    antes de responder se verifica que cada nombre y cada número del texto esté
    en esos resultados. Si no pasa, o si el modelo no termina en pocos pasos,
    responden las plantillas. Lo que se muestra en 3D sale de show_in_3d, con
    ids reales, nunca del texto."""

    MAX_STEPS = 6

    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        timeout: float = 60,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/v1/chat/completions"
        self._model = model
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._timeout = timeout
        self._transport = transport
        self._fallback = TemplateChat()
        self.name = model

    async def reply(
        self, question: str, catalog: Catalog, open_technique_id: UUID | None
    ) -> Reply:
        open_technique = technique_by_id(catalog, open_technique_id)
        context = (
            f"Técnica abierta en el visor: {open_technique.name}.\n"
            if open_technique
            else ""
        )
        messages = [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"{context}{question}"},
        ]
        results: list[dict] = []
        scene: tools.Scene | None = None
        async with httpx.AsyncClient(
            transport=self._transport, timeout=self._timeout
        ) as client:
            for _ in range(self.MAX_STEPS):
                message = await self._ask(client, messages)
                calls = message.get("tool_calls") or []
                if not calls:
                    # Respondió con texto en vez de llamar a reply.
                    return await self._finish(
                        message.get("content") or "",
                        results,
                        scene,
                        question,
                        catalog,
                        open_technique_id,
                    )
                messages.append(
                    {
                        "role": "assistant",
                        "content": message.get("content") or "",
                        "tool_calls": calls,
                    }
                )
                for call in calls:
                    name, args = _read_call(call)
                    if name == "reply":
                        return await self._finish(
                            str(args.get("text", "")),
                            results,
                            scene,
                            question,
                            catalog,
                            open_technique_id,
                        )
                    result, found_scene = _run(name, args, catalog)
                    scene = found_scene or scene
                    results.append(result)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": call.get("id", name),
                            "content": json.dumps(result, ensure_ascii=False),
                        }
                    )
        logger.warning("El modelo no terminó en %s pasos: %r", self.MAX_STEPS, question)
        return await self._fall_back(question, catalog, open_technique_id)

    async def _ask(self, client: httpx.AsyncClient, messages: list[dict]) -> dict:
        body = {
            "model": self._model,
            "temperature": 0,
            "messages": messages,
            "tools": TOOLS,
        }
        try:
            response = await client.post(self._url, json=body, headers=self._headers)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]
        except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
            raise ModelUnavailable(str(error)) from error

    async def _finish(
        self, text, results, scene, question, catalog, open_technique_id
    ) -> Reply:
        text, trailing = _clean(text)
        # «¿Quizás te refieres a…?» no es una sugerencia para seguir: es la
        # respuesta. Se conserva, y la opción es la pregunta corregida.
        did_you_mean = next(
            (q for q in trailing if normalize(q).startswith("¿quizas")), None
        )
        if did_you_mean:
            text = f"{text} {did_you_mean}".strip()
        text = _say_missing_description(text, question, results)
        if not results:
            # Respondió sin consultar nada: no hay de dónde salga lo que dice.
            return await self._fall_back(question, catalog, open_technique_id)
        problems = unsupported(text, results, catalog) if text else ["respuesta vacía"]
        if problems:
            logger.warning("Respuesta sin respaldo en DataIQ %s: %r", problems, text)
            return await self._fall_back(question, catalog, open_technique_id)
        if scene is None:
            scene = _implied_scene(text, catalog, open_technique_id)
        if did_you_mean:
            return Reply(
                ChatAction.clarify,
                text,
                options=_corrected_questions(question, results),
                answered_by=self.name,
            )
        options = _follow_ups(results, scene)
        if scene is None:
            return Reply(
                ChatAction.answer, text, options=options, answered_by=self.name
            )
        instrument = scene.instrument
        return Reply(
            ChatAction.highlight_instrument
            if instrument
            else ChatAction.show_technique,
            text,
            technique_id=scene.technique.id,
            instrument_id=instrument.id if instrument else None,
            options=options,
            answered_by=self.name,
        )

    async def _fall_back(self, question, catalog, open_technique_id) -> Reply:
        reply = await self._fallback.reply(question, catalog, open_technique_id)
        return replace(
            reply, answered_by=f"{self._fallback.name} (respaldo de {self.name})"
        )


def _read_call(call: dict) -> tuple[str, dict]:
    """Nombre y argumentos de una llamada. Los modelos pequeños a veces mandan
    los argumentos como texto o mal formados: se leen como se puede."""
    function = call.get("function") or {}
    args = function.get("arguments") or {}
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except ValueError:
            args = {}
    return str(function.get("name", "")), args if isinstance(args, dict) else {}


def _run(name: str, args: dict, catalog: Catalog) -> tuple[dict, tools.Scene | None]:
    """Ejecuta una consulta del catálogo. Lo que no se reconoce devuelve un error
    que el modelo puede leer y corregir."""
    match name:
        case "list_techniques":
            return tools.list_techniques(catalog), None
        case "compare_techniques":
            first, second = str(args.get("first", "")), str(args.get("second", ""))
            return tools.compare_techniques(catalog, first, second), None
        case "get_technique":
            return tools.get_technique(catalog, str(args.get("technique", ""))), None
        case "find_instrument":
            return tools.find_instrument(catalog, str(args.get("instrument", ""))), None
        case "show_in_3d":
            found = tools.show_in_3d(
                catalog, str(args.get("technique", "")), args.get("instrument") or None
            )
            if isinstance(found, tools.Scene):
                shown = {"tecnica": found.technique.name}
                if found.instrument:
                    shown["instrumento"] = found.instrument.name
                return {"ok": True, "en_el_visor": shown}, found
            return found, None
    return {"error": f"No existe la herramienta «{name}»"}, None


# Sugerencias que hablan de la cuadrícula («¿en qué celda exacta…?») no sirven.
_GRID = re.compile(r"\b(?:filas?|columnas?|celdas?|cuadricula)\b")

_TOOL_NAMES = re.compile(
    r"\b(?:reply|show_in_3d|get_technique|find_instrument|list_techniques|"
    r"compare_techniques)\b"
)


def _clean(text: str) -> tuple[str, list[str]]:
    """Quita lo que no es para el estudiante: las «Sugerencias:» que el modelo
    escribe dentro del texto (pasan a ser opciones), las líneas con nombres de
    herramientas y el formato Markdown."""
    text = text.replace("**", "").strip()
    suggestions: list[str] = []
    match = re.search(r"(?i)\bsugerencias?\s*:", text)
    if match:
        tail = text[match.end() :]
        text = text[: match.start()]
        for piece in re.split(r"\n|(?<=\?)\s+(?=¿)", tail):
            piece = piece.strip(" -•\t")
            if piece and not _TOOL_NAMES.search(piece):
                suggestions.append(piece)
    lines = [line for line in text.splitlines() if not _TOOL_NAMES.search(line)]
    text = "\n".join(lines).strip()
    # Las preguntas que deja al final del texto también son sugerencias.
    while (match := re.search(r"\s*(¿[^¿]*\?)\s*$", text)) and match.start() > 0:
        suggestions.insert(0, match.group(1))
        text = text[: match.start()].rstrip()
    return text, suggestions


def _implied_scene(
    text: str, catalog: Catalog, open_technique_id
) -> tools.Scene | None:
    """Si el modelo no llamó a show_in_3d, la escena sale de lo que dice: la
    técnica abierta, o la única técnica que nombra; y, si nombra un instrumento
    de esa mesa, se resalta."""
    said = normalize(text)
    named = [
        t for t in in_scope(catalog) if contains(said, normalize(t.name).split()[0])
    ]
    technique = technique_by_id(catalog, open_technique_id) or (
        named[0] if len(named) == 1 else None
    )
    if technique is None:
        return None
    name = instrument_in(text, Vocabulary.from_catalog(catalog))
    instrument = find_instrument(catalog, name)
    if instrument and item_with(technique, instrument.id):
        return tools.Scene(technique, instrument)
    return tools.Scene(technique)


def _follow_ups(results: list[dict], scene: tools.Scene | None) -> tuple[str, ...]:
    """Las preguntas para seguir, armadas con lo que se consultó: así siempre se
    pueden responder (las que escribe un modelo pequeño a menudo no)."""
    options: list[str] = []
    for result in results:
        if "instrumento" in result and "en_tecnicas" in result:
            name = result["instrumento"]
            options.append(f"¿Qué es {the(name)}?")
            options += [
                f"¿Dónde va {the(name)} en {t['tecnica']}?"
                for t in result["en_tecnicas"]
            ]
        elif "tecnica" in result and "mesa_de_mayo" in result:
            options += [
                f"Complicaciones de {result['tecnica']}",
                f"¿Qué lleva la mesa de {result['tecnica']}?",
            ]
        elif "tecnica_1" in result:
            options += [
                f"¿Qué lleva la mesa de {result[k]}?"
                for k in ("tecnica_1", "tecnica_2")
            ]
    if scene and not options:
        options.append(f"¿Qué lleva la mesa de {scene.technique.name}?")
    seen: list[str] = []
    for option in options:
        if option not in seen:
            seen.append(option)
    return tuple(seen[:3])


def _say_missing_description(text: str, question: str, results: list[dict]) -> str:
    """Si preguntaron qué es un instrumento y DataIQ no tiene su descripción, la
    respuesta lo dice siempre, aunque el modelo solo haya dicho dónde va."""
    missing = any(r.get("descripcion") == tools.NO_DATA for r in results)
    if asks_to_describe(question) and missing and "no tiene" not in normalize(text):
        return f"{text} DataIQ todavía no tiene su descripción.".strip()
    return text


def _corrected_questions(question: str, results: list[dict]) -> tuple[str, ...]:
    """La pregunta del estudiante con el nombre que no se encontró cambiado por
    el que sugirió la consulta: «¿Dónde va la Kely rara?» → «¿Dónde va la Pinza
    Kelly?». Si el nombre buscado no está tal cual en la pregunta, la opción es
    el nombre sugerido."""
    options: list[str] = []
    for result in results:
        searched, suggested = result.get("buscado"), result.get("quizas") or []
        if not suggested:
            continue
        if searched and searched.lower() in question.lower():
            start = question.lower().index(searched.lower())
            options.append(
                question[:start] + suggested[0] + question[start + len(searched) :]
            )
        else:
            options.append(suggested[0])
    return tuple(dict.fromkeys(options))[:3]

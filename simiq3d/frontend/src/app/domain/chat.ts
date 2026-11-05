/**
 * Lo que hace el chat con una pregunta, sobre todo lo que cambia en el visor
 * (`ChatAction` del backend de SIMIQ3D). `domain/` no importa la API: este tipo
 * es el mismo, y `data/api/models.spec.ts` comprueba que coinciden.
 */
export type ChatAction =
  | 'show_technique'
  | 'highlight_instrument'
  | 'describe_instrument'
  | 'show_clinical_data'
  | 'list_instruments'
  | 'answer'
  | 'clarify'
  | 'no_answer';

/** El dato clínico de una técnica que trae la respuesta (`ClinicalField` del backend). */
export type ClinicalField = 'description' | 'indications' | 'complications' | 'anesthesia_position';

/** De qué trató una respuesta del chat (`RequestKind` del backend). */
export type RequestKind =
  'locate' | 'describe' | 'clinical_data' | 'list_instruments' | 'show_technique' | 'out_of_scope';

/**
 * Un pedido: de qué trató la respuesta (`ChatRequest`). El visor no lo usa; va de
 * vuelta con la siguiente pregunta, para entender un seguimiento.
 */
export interface ChatRequest {
  kind: RequestKind;
  technique?: string | null;
  instrument?: string | null;
  field?: ClinicalField | null;
  topic?: 'other_technique' | null;
}

/** La respuesta de `POST /chat` (`ChatOut`): la acción, sus ids, el texto y las opciones. */
export interface ChatReply {
  action: ChatAction;
  technique_id: string | null;
  instrument_id: string | null;
  field: ClinicalField | null;
  /** El texto, con Markdown sencillo (negrita y listas). */
  reply: string;
  /** Si lo escribió el modelo de IA con los datos de DataIQ (lleva la línea de fuentes). */
  generated: boolean;
  /** Preguntas que se pueden volver a enviar tal cual. */
  options: string[];
  /** Lo que se entendió de la pregunta. */
  requests: ChatRequest[];
}

/** Una pregunta anterior con los pedidos y el texto de su respuesta (`PreviousTurn`). */
export interface ChatTurn {
  question: string;
  requests: ChatRequest[];
  reply: string;
}

/**
 * Un evento de `POST /chat/stream`: `start` trae lo que hace el visor (sin texto),
 * `text` una parte ya revisada que se agrega y `end` la respuesta completa.
 */
export type ChatStreamEvent =
  | Flat<{ type: 'start' } & ChatReply>
  | { type: 'text'; text: string }
  | Flat<{ type: 'end' } & ChatReply>;

/** Un solo objeto con las propiedades de una intersección (para comparar tipos). */
type Flat<T> = { [K in keyof T]: T[K] };

/** Un mensaje de la conversación: la pregunta de la persona o la respuesta de SIMIQ3D. */
export type ChatMessage =
  | { id: number; from: 'person'; text: string }
  /** `writing`: la respuesta aún se está escribiendo; sus opciones esperan a que termine. */
  | { id: number; from: 'simiq3d'; reply: ChatReply; writing?: boolean };

/** Lo que hace el visor con una respuesta del chat. `null` es «no cambia». */
export interface SceneChange {
  /** La técnica cuya mesa se abre. */
  technique: string | null;
  /** El instrumento que se señala en la escena y en la leyenda. */
  instrument: string | null;
  /** Si se abre la ficha del instrumento señalado. */
  card: boolean;
  /** Si bajo el texto va la lista numerada de la mesa. */
  list: boolean;
}

const NOTHING: SceneChange = { technique: null, instrument: null, card: false, list: false };

/**
 * Qué cambia en el visor con cada `action` de `POST /chat`
 * (`simiq3d/frontend/README.md`, «El chat»). Sale solo de la acción y de sus ids,
 * nunca del texto. `answer`, `clarify` y `no_answer` no cambian el visor aunque
 * traigan ids: decir que un instrumento no va en una mesa no es señalarlo.
 */
export function sceneFor(reply: {
  action: ChatAction;
  technique_id: string | null;
  instrument_id: string | null;
}): SceneChange {
  const technique = reply.technique_id;
  switch (reply.action) {
    case 'show_technique':
    case 'show_clinical_data':
      return { ...NOTHING, technique };
    case 'list_instruments':
      return { ...NOTHING, technique, list: true };
    case 'highlight_instrument':
      return { ...NOTHING, technique, instrument: reply.instrument_id };
    case 'describe_instrument':
      return { ...NOTHING, technique, instrument: reply.instrument_id, card: true };
    case 'answer':
    case 'clarify':
    case 'no_answer':
      return NOTHING;
  }
}

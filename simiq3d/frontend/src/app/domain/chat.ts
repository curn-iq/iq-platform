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

/** Los tipos de pedido en que el chat convierte una pregunta (`RequestKind` del backend). */
export type RequestKind =
  | 'locate'
  | 'describe'
  | 'clinical_data'
  | 'list_instruments'
  | 'show_technique'
  | 'find_instrument'
  | 'compare'
  | 'rank'
  | 'out_of_scope'
  | 'greeting';

/**
 * Un pedido: lo que el chat entendió de una parte de la pregunta (`ChatRequest`). El
 * visor no lo usa; va de vuelta con la siguiente pregunta, para entender un seguimiento.
 */
export interface ChatRequest {
  kind: RequestKind;
  technique?: string | null;
  instrument?: string | null;
  field?: ClinicalField | null;
  other_technique?: string | null;
  comparison?: 'shared' | 'only_first' | 'differences' | null;
  topic?: 'surgical_times' | 'missing_clinical_data' | 'other_technique' | 'other' | null;
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

/** Un mensaje de la conversación: la pregunta de la persona o la respuesta de SIMIQ3D. */
export type ChatMessage =
  { id: number; from: 'person'; text: string } | { id: number; from: 'simiq3d'; reply: ChatReply };

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

/** Cómo se nombra cada dato clínico, como en las respuestas del backend (`FIELD_LABELS`). */
export const CLINICAL_LABELS: Record<ClinicalField, string> = {
  description: 'Para qué sirve',
  indications: 'Indicaciones',
  complications: 'Complicaciones',
  anesthesia_position: 'Anestesia y posición',
};

/** El chip bajo una respuesta: qué hizo el chat, y si cambió el visor. */
export interface ActionChip {
  label: string;
  /** `true` si cambió el visor (visto); `false` si pide precisar o no hubo respuesta (la «i»). */
  changed: boolean;
}

/**
 * El chip de una respuesta («Chip de acción» en `DESIGN.md`), con los nombres
 * de DataIQ de su técnica y su instrumento. Una respuesta solo en texto
 * (`answer`) no lleva chip.
 */
export function actionChip(
  reply: Pick<ChatReply, 'action' | 'field'>,
  names: { technique?: string; instrument?: string },
): ActionChip | null {
  const named = (verb: string, name: string | undefined) => (name ? `${verb} · ${name}` : verb);
  switch (reply.action) {
    case 'show_technique':
      return { label: named('Mostrar técnica', names.technique), changed: true };
    case 'highlight_instrument':
      return { label: named('Resaltar', names.instrument), changed: true };
    case 'describe_instrument':
      return { label: named('Describir', names.instrument), changed: true };
    case 'show_clinical_data':
      return {
        label: named('Datos clínicos', reply.field ? CLINICAL_LABELS[reply.field] : undefined),
        changed: true,
      };
    case 'list_instruments':
      return { label: named('Instrumental', names.technique), changed: true };
    case 'clarify':
      return { label: 'Aclarar', changed: false };
    case 'no_answer':
      return { label: 'Sin respuesta', changed: false };
    case 'answer':
      return null;
  }
}

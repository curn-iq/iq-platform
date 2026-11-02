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

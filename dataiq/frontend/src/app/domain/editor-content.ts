/** Los datos clínicos de la versión que son un texto (el paso «Datos clínicos» del editor los escribe). */
export type ClinicalTextField =
  | 'description'
  | 'indications'
  | 'complications'
  | 'surgical_technique'
  | 'source'
  | 'cups_code'
  | 'anesthesia'
  | 'drapes'
  | 'patient_position';

/** Una celda de un objeto en la mesa, contada desde 1. */
export interface EditorCell {
  row: number;
  column: number;
}

/**
 * Un componente de un objeto: un instrumento o una sutura del catálogo (nunca los dos). El `name`
 * es solo para mostrarlo: la API recibe el `id`.
 */
export interface EditorComponent {
  instrument_id: string | null;
  suture_id: string | null;
  name: string;
}

/** Un objeto de la mesa tal como lo edita el editor. Sin mesa (`zone_id: null`) es solo del listado de instrumental. */
export interface EditorItem {
  zone_id: string | null;
  legend_number: number | null;
  /** El texto literal de la fuente. */
  source_text: string;
  components: EditorComponent[];
  cells: EditorCell[];
}

/** Si la versión lleva una mesa y, si la lleva, su tamaño en celdas. */
export interface EditorZone {
  zone_id: string;
  /** El nombre de la mesa, como lo trae la API («Mesa de Mayo»). */
  zone: string;
  used: boolean;
  rows: number | null;
  columns: number | null;
}

/**
 * Una fila de «Suturas por plano»: un plano con su sutura, calibre y aguja (Resuelto 29 de
 * `dataiq/docs/checklist-frontend.md`). Todo es texto, y vacío es «sin dato»: una fila recién agregada
 * está vacía. La API no las guarda así: `data/sutures.ts` junta en una sola sutura los planos que
 * comparten sutura, calibre y aguja.
 */
export interface EditorSuture {
  /** «Piel», «Fascia»…; vacío si no se dice en qué plano se usa. */
  plane: string;
  /** La sutura. Sin nombre la fila no se guarda: la API lo exige. */
  name: string;
  gauge: string;
  needle_type: string;
}

/**
 * Todo el contenido de una versión que el editor tiene en pantalla y guarda con cada autoguardado
 * (`PUT /versions/{id}` reemplaza todo el contenido). Los campos tienen los nombres de la API, pero
 * el modelo es del editor: lleva lo que hace falta para mostrar (nombres de mesas y componentes) y
 * no lo que la API solo entrega (ids de objetos, descripciones de equipos). `data/version-content.ts`
 * lo convierte desde y hacia la API. Cumple `ProgressSource`: el avance sale de él directamente.
 */
export interface EditorContent {
  cups_code: string | null;
  anesthesia: string | null;
  patient_position: string | null;
  drapes: string | null;
  description: string | null;
  indications: string | null;
  complications: string | null;
  surgical_technique: string | null;
  source: string | null;
  zones: EditorZone[];
  items: EditorItem[];
  sutures: EditorSuture[];
  /** Equipos biomédicos, por nombre. */
  equipment: string[];
  /** Equipo médico-quirúrgico, por nombre. */
  devices: string[];
}

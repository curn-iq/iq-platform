import type {
  BoardObject,
  Box,
  Detection,
  FrameResult,
  Marker,
  TechniqueResult,
} from '../data/api/models';

/**
 * Cómo se lee un resultado del backend (`FrameOut`): lo que la pantalla muestra, sin
 * decidir cómo se ve. Todo es lógica pura, sin Angular.
 */

/** Los grupos del resultado, en el orden en que se muestran. */
export type GroupKind = 'move' | 'missing' | 'extra' | 'in-place';

/** Una pieza de la mesa, lista para mostrar. */
export interface Piece {
  /** Estable dentro de una técnica: sirve para `@for` y para elegir una pieza. */
  readonly id: string;
  readonly kind: GroupKind;
  readonly label: string;
  /** El número del instrumento en el diagrama de IQ. */
  readonly legendNumber: number | null;
  /** Lo que se le dice al estudiante de la pieza, sin repetir su nombre; `null` si está en su lugar. */
  readonly sentence: string | null;
  /** Dónde está (fracciones del cuadro); `null` si falta. */
  readonly box: Box | null;
  /** Cuántas celdas hay que moverla, para dibujar la flecha. */
  readonly move: { rows: number; columns: number } | null;
}

/** Una técnica con su porcentaje y sus piezas en grupos. */
export interface TechniqueReading {
  readonly techniqueId: string;
  readonly name: string;
  /** Entero de 0 a 100. */
  readonly percent: number;
  /** Cuántas están en su lugar: cuenta también las dudosas. */
  readonly inPlace: number;
  readonly expected: number;
  readonly move: readonly Piece[];
  readonly missing: readonly Piece[];
  readonly extra: readonly Piece[];
  /** Las que están en su lugar, con las dudosas: una dudosa no es un error, así que no se marca. */
  readonly placed: readonly Piece[];
}

/** Lo que se ve en el cuadro, nombrado por el modelo (para «mientras arma»). */
export interface NamedDetection {
  readonly label: string;
  readonly box: Box;
}

/** Un resultado, leído. */
export interface FrameReading {
  /** Están los cuatro marcadores: sin ellos solo se nombra lo que se ve. */
  readonly boardFound: boolean;
  readonly markers: readonly Marker[];
  readonly detections: readonly NamedDetection[];
  /** El modelo reconoció de qué técnica es la mesa. */
  readonly recognized: boolean;
  /** La que más se parece o, si quedan muy cerca, las dos que más. Vacío sin los cuatro marcadores. */
  readonly techniques: readonly TechniqueReading[];
}

const NO_LABEL = 'Instrumento sin nombre';

function byDiagram(a: Piece, b: Piece): number {
  // El orden del número del diagrama; los que no lo tienen, al final
  const x = a.legendNumber ?? Number.POSITIVE_INFINITY;
  const y = b.legendNumber ?? Number.POSITIVE_INFINITY;
  return x === y ? a.label.localeCompare(b.label, 'es') : x - y;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lo que se le dice al estudiante de una pieza. El backend escribe la frase con el nombre
 * adelante («Pinza Kelly (n.º 6): va en el centro.», «Falta Mango (n.º 10): va al final.»,
 * «Sobra Pinza: no va en esta mesa.»); la pantalla ya muestra el nombre y el número como
 * título, así que aquí se quita ese principio y queda la frase sola, con mayúscula.
 */
export function sentenceOf(object: BoardObject): string | null {
  let message = object.message?.trim();
  if (!message) return null;
  if (object.label) {
    const name =
      object.legend_number == null ? object.label : `${object.label} (n.º ${object.legend_number})`;
    message = message.replace(new RegExp(`^(?:Falta |Sobra )?${escapeRegExp(name)}: `), '');
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
}

function piece(object: BoardObject, kind: GroupKind, index: number): Piece {
  const label = object.label ?? NO_LABEL;
  return {
    id: `${kind}-${object.legend_number ?? label}-${index}`,
    kind,
    label,
    legendNumber: object.legend_number,
    sentence: kind === 'in-place' ? null : sentenceOf(object),
    box: object.box,
    move: object.move,
  };
}

function pieces(objects: readonly BoardObject[], kind: GroupKind): Piece[] {
  return objects.map((object, index) => piece(object, kind, index)).sort(byDiagram);
}

/** Lee una técnica: sus piezas en los grupos por mover, falta, sobra y en su lugar. */
export function readTechnique(technique: TechniqueResult): TechniqueReading {
  const of = (status: BoardObject['status']) =>
    technique.objects.filter((object) => object.status === status);
  return {
    techniqueId: technique.technique_id,
    name: technique.name,
    percent: Math.round(technique.percent * 100),
    inPlace: technique.in_place,
    expected: technique.expected,
    move: pieces(of('move'), 'move'),
    missing: pieces(of('missing'), 'missing'),
    extra: pieces(technique.extras, 'extra'),
    placed: pieces([...of('in_place'), ...of('doubtful')], 'in-place'),
  };
}

function named(detection: Detection): NamedDetection {
  return { label: detection.label, box: detection.box };
}

/** Lee un resultado completo del backend. */
export function readFrame(frame: FrameResult): FrameReading {
  return {
    boardFound: frame.board_found,
    markers: frame.markers,
    detections: frame.detections.map(named),
    recognized: frame.recognized,
    techniques: frame.techniques.map(readTechnique),
  };
}

/** Lo que hay que corregir, en el orden en que se recorre: por mover, falta y sobra. */
export function corrections(technique: TechniqueReading): readonly Piece[] {
  return [...technique.move, ...technique.missing, ...technique.extra];
}

/** El titular del resultado: «8 de 10 en su lugar.» */
export function headline(technique: TechniqueReading): string {
  return `${technique.inPlace} de ${technique.expected} en su lugar.`;
}

/** ¿Hay dos técnicas que se parecen casi igual? Entonces no se elige una por el estudiante. */
export function isClose(reading: FrameReading): boolean {
  return reading.techniques.length > 1;
}

/** «1 pieza», «8 piezas». */
export function piecesCount(count: number): string {
  return count === 1 ? '1 pieza' : `${count} piezas`;
}

/** Une los nombres como en español: «A, B y C». */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Cómo se llama cada grupo de piezas por corregir. */
export const GROUP_LABELS: Record<GroupKind, string> = {
  move: 'Por mover',
  missing: 'Falta',
  extra: 'Sobra',
  'in-place': 'En su lugar',
};

/**
 * La entradilla del resultado, con lo que hay que corregir: «Una pieza va en otro sitio y a la
 * mesa le falta otra. Lo demás está como lo publicó el programa de IQ.» Con la mesa como la
 * publicó IQ, lo dice.
 */
export function summaryOf(technique: TechniqueReading): string {
  const moves = technique.move.length;
  const missing = technique.missing.length;
  const extra = technique.extra.length;
  const clauses: string[] = [];
  if (moves > 0)
    clauses.push(moves === 1 ? 'una pieza va en otro sitio' : `${moves} piezas van en otro sitio`);
  if (missing > 0) {
    // «a la mesa le falta otra», si ya se habló de una pieza
    const one = moves === 1 ? 'otra' : 'una pieza';
    clauses.push(
      missing === 1 ? `a la mesa le falta ${one}` : `a la mesa le faltan ${missing} piezas`,
    );
  }
  if (extra > 0) clauses.push(extra === 1 ? 'sobra una pieza' : `sobran ${extra} piezas`);
  if (clauses.length === 0) return 'La mesa está como la publicó el programa de IQ.';
  const first = clauses[0].charAt(0).toUpperCase() + clauses[0].slice(1);
  const sentence = joinNames([first, ...clauses.slice(1)]) + '.';
  return technique.placed.length > 0
    ? `${sentence} Lo demás está como lo publicó el programa de IQ.`
    : sentence;
}

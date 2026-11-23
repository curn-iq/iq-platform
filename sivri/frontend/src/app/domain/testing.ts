import type { BoardObject, FrameResult, Marker, TechniqueResult } from '../data/api/models';

/** Resultados del backend armados a mano para las pruebas. */

export const ALL_MARKERS: Marker[] = [
  { id: 0, x: 0.1, y: 0.1 },
  { id: 1, x: 0.9, y: 0.1 },
  { id: 2, x: 0.9, y: 0.9 },
  { id: 3, x: 0.1, y: 0.9 },
];

export function object(
  status: BoardObject['status'],
  label: string,
  legendNumber: number | null,
  overrides: Partial<BoardObject> = {},
): BoardObject {
  return {
    status,
    label,
    instrument_id: null,
    legend_number: legendNumber,
    expected_cells: [],
    found_cell: null,
    box: status === 'missing' ? null : { x1: 0.2, y1: 0.3, x2: 0.4, y2: 0.35 },
    move: null,
    message: null,
    ...overrides,
  };
}

export function technique(
  id: string,
  name: string,
  objects: BoardObject[],
  overrides: Partial<TechniqueResult> = {},
): TechniqueResult {
  const placed = objects.filter((o) => o.status === 'in_place' || o.status === 'doubtful').length;
  const expected = objects.filter((o) => o.status !== 'extra').length;
  return {
    technique_id: id,
    name,
    percent: expected === 0 ? 0 : placed / expected,
    in_place: placed,
    expected,
    objects: objects.filter((o) => o.status !== 'extra'),
    extras: objects.filter((o) => o.status === 'extra'),
    ...overrides,
  };
}

export function frame(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    markers: ALL_MARKERS,
    board_found: true,
    detections: [],
    recognized: true,
    techniques: [],
    ranking: [],
    ...overrides,
  };
}

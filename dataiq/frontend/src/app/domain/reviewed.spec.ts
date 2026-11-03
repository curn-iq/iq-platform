import { formatReviewed, toReviewedRows as rowsOf, type ReviewedSource } from './reviewed';

const ME = 'Laura Pérez';
const toReviewedRows = (reviewer: string, sources: readonly ReviewedSource[]) =>
  rowsOf(sources, reviewer);

function source(
  state: ReviewedSource['summary']['state'],
  rejections: ReviewedSource['rejections'] = [],
  id = 'v-1',
): ReviewedSource {
  return {
    summary: {
      id,
      technique: 'Hemicolectomía laparoscópica',
      specialty: 'Cirugía laparoscópica',
      number: 2,
      state,
      author: 'Daniela Ortiz',
    },
    rejections,
  };
}

const RETURN = {
  reason: 'Mesa de Mayo · 4 Pinza Kelly: repetido.\nNota general: revisar la numeración.',
  rejected_by: 'Laura Pérez',
  created_at: new Date(2026, 9, 4, 9, 0).toISOString(),
};

describe('toReviewedRows', () => {
  it('un borrador con devolución es «Devuelta», con su fecha y su motivo', () => {
    const [row] = toReviewedRows(ME, [source('draft', [RETURN])]);

    expect(row).toEqual({
      id: 'v-1',
      technique: 'Hemicolectomía laparoscópica',
      specialty: 'Cirugía laparoscópica',
      number: 2,
      author: 'Daniela Ortiz',
      result: 'returned',
      reviewedAt: new Date(2026, 9, 4, 9, 0),
      reason: RETURN.reason,
    });
  });

  it('con varias devoluciones toma la más reciente, que es la primera', () => {
    const older = { ...RETURN, reason: 'Antes.', created_at: new Date(2026, 8, 1).toISOString() };
    const [row] = toReviewedRows(ME, [source('draft', [RETURN, older])]);

    expect(row.reason).toBe(RETURN.reason);
    expect(row.reviewedAt).toEqual(new Date(2026, 9, 4, 9, 0));
  });

  it('toma mi devolución más reciente, no la de otro revisor que la devolvió después', () => {
    const other = {
      reason: 'Otro motivo.',
      rejected_by: 'Carlos Ruiz',
      created_at: new Date(2026, 9, 10).toISOString(),
    };
    const [row] = toReviewedRows(ME, [source('draft', [other, RETURN])]);

    expect(row.reason).toBe(RETURN.reason);
    expect(row.reviewedAt).toEqual(new Date(2026, 9, 4, 9, 0));
  });

  it.each(['published', 'superseded', 'archived'] as const)(
    'una versión %s es «Aprobada», sin fecha ni motivo: la API no los guarda',
    (state) => {
      const [row] = toReviewedRows(ME, [source(state)]);

      expect(row.result).toBe('approved');
      expect(row.reviewedAt).toBeNull();
      expect(row.reason).toBeNull();
    },
  );

  it('una aprobada que antes se devolvió sigue siendo «Aprobada», sin el motivo viejo', () => {
    const [row] = toReviewedRows(ME, [source('published', [RETURN])]);

    expect(row.result).toBe('approved');
    expect(row.reason).toBeNull();
    expect(row.reviewedAt).toBeNull();
  });

  it('una devuelta que ya volvió a revisión espera de nuevo: está en «Por revisar», no aquí', () => {
    expect(toReviewedRows(ME, [source('in_review', [RETURN])])).toEqual([]);
  });

  it('un borrador sin devoluciones no tiene resultado', () => {
    expect(toReviewedRows(ME, [source('draft')])).toEqual([]);
  });

  it('conserva el orden en que llegan', () => {
    const rows = toReviewedRows(ME, [
      source('draft', [RETURN], 'a'),
      source('published', [], 'b'),
      source('draft', [RETURN], 'c'),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('formatReviewed', () => {
  const NOW = new Date(2026, 10, 2);

  it('una devuelta dice su día y mes', () => {
    expect(formatReviewed(new Date(2026, 9, 4), NOW)).toBe('4 oct');
  });

  it('con el año si no es el actual', () => {
    expect(formatReviewed(new Date(2025, 9, 4), NOW)).toBe('4 oct 2025');
  });

  it('una aprobada no tiene fecha: «—»', () => {
    expect(formatReviewed(null, NOW)).toBe('—');
  });
});

import {
  countDrafts,
  draftStatus,
  draftsSummary,
  filterDrafts,
  toDraftRows,
  type DraftRow,
  type DraftSource,
} from './drafts';

const EMPTY_CONTENT: DraftSource['content'] = { zones: [], items: [], sutures: [] };

const source = (
  id: string,
  state: DraftSource['summary']['state'],
  rejections: DraftSource['rejections'] = [],
  content: DraftSource['content'] = EMPTY_CONTENT,
): DraftSource => ({
  summary: {
    id,
    technique: `Técnica ${id}`,
    specialty: 'Cirugía general',
    number: 2,
    state,
    updated_at: '2026-10-03T15:00:00Z',
  },
  content,
  rejections,
});

const rejection = (reason: string, createdAt: string) => ({
  reason,
  rejected_by: 'Laura Pérez',
  created_at: createdAt,
});

describe('toDraftRows', () => {
  it('un borrador sin devoluciones es «Borrador», sin nota', () => {
    const [row] = toDraftRows([source('a', 'draft')]);

    expect(row.status).toBe('draft');
    expect(row.note).toBeNull();
  });

  it('un borrador con devoluciones es «Devuelta», con la más reciente como nota', () => {
    // La API entrega las devoluciones de la más reciente a la más vieja
    const [row] = toDraftRows([
      source('a', 'draft', [
        rejection('Revisar la numeración.\nFalta el 9.', '2026-10-04T09:00:00Z'),
        rejection('Antigua.', '2026-09-20T09:00:00Z'),
      ]),
    ]);

    expect(row.status).toBe('returned');
    expect(row.note).toEqual({
      reason: 'Revisar la numeración.\nFalta el 9.',
      date: new Date('2026-10-04T09:00:00Z'),
      by: 'Laura Pérez',
    });
  });

  it('una versión en revisión es «En revisión» y no lleva la nota de una devolución anterior', () => {
    const [row] = toDraftRows([
      source('a', 'in_review', [rejection('Vieja.', '2026-10-04T09:00:00Z')]),
    ]);

    expect(row.status).toBe('in_review');
    expect(row.note).toBeNull();
  });

  it('solo hay filas de lo que está en curso: lo demás no es un borrador', () => {
    const rows = toDraftRows([
      source('a', 'draft'),
      source('b', 'published'),
      source('c', 'superseded'),
      source('d', 'archived'),
      source('e', 'in_review'),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['a', 'e']);
  });

  it('conserva el orden de la API y trae el resumen de la versión', () => {
    const rows = toDraftRows([source('b', 'draft'), source('a', 'draft')]);

    expect(rows.map((row) => row.id)).toEqual(['b', 'a']);
    expect(rows[0]).toMatchObject({
      technique: 'Técnica b',
      specialty: 'Cirugía general',
      number: 2,
      updatedAt: new Date('2026-10-03T15:00:00Z'),
    });
  });

  it('calcula el avance de cada sección con la regla de `versionProgress`', () => {
    const [row] = toDraftRows([source('a', 'draft')]);

    expect(row.progress.clinical.status).toBe('pending');
    expect(row.progress.mayo.status).toBe('no_table');
  });
});

const row = (status: DraftRow['status']): DraftRow => ({ id: status, status }) as DraftRow;

const ROWS = [row('returned'), row('draft'), row('draft'), row('in_review')];

describe('filterDrafts', () => {
  it('«todas» deja todo, en orden', () => {
    expect(filterDrafts(ROWS, 'all')).toEqual(ROWS);
  });

  it('cada filtro deja solo las de su estado', () => {
    expect(filterDrafts(ROWS, 'returned')).toHaveLength(1);
    expect(filterDrafts(ROWS, 'draft')).toHaveLength(2);
    expect(filterDrafts(ROWS, 'in_review')).toHaveLength(1);
  });
});

describe('countDrafts', () => {
  it('cuenta cada filtro; «Borradores» no incluye las devueltas', () => {
    expect(countDrafts(ROWS)).toEqual({ all: 4, returned: 1, draft: 2, in_review: 1 });
  });

  it('sin filas, todo en cero', () => {
    expect(countDrafts([])).toEqual({ all: 0, returned: 0, draft: 0, in_review: 0 });
  });
});

describe('draftsSummary', () => {
  const rows = (...statuses: DraftRow['status'][]) => statuses.map(row);

  describe('colaborador', () => {
    it('cuenta las técnicas en curso', () => {
      expect(draftsSummary(rows('draft', 'in_review'), false)).toBe('2 técnicas en curso.');
    });

    it('una sola, en singular', () => {
      expect(draftsSummary(rows('draft'), false)).toBe('1 técnica en curso.');
    });

    it('dice cuántas volvieron de revisión: una', () => {
      expect(draftsSummary(rows('draft', 'draft', 'draft', 'returned'), false)).toBe(
        '4 técnicas en curso. Una volvió de revisión.',
      );
    });

    it('dice cuántas volvieron de revisión: varias', () => {
      expect(draftsSummary(rows('returned', 'returned', 'draft'), false)).toBe(
        '3 técnicas en curso. 2 volvieron de revisión.',
      );
    });

    it('sin nada en curso', () => {
      expect(draftsSummary([], false)).toBe('Nada en curso.');
    });
  });

  describe('quien publica lo suyo (revisor o admin)', () => {
    it('una técnica se publica al terminarla, sin pasar por revisión', () => {
      expect(draftsSummary(rows('draft'), true)).toBe(
        '1 técnica en curso. Se publica al terminarla, sin pasar por revisión.',
      );
    });

    it('varias, en plural', () => {
      expect(draftsSummary(rows('draft', 'draft'), true)).toBe(
        '2 técnicas en curso. Se publican al terminarlas, sin pasar por revisión.',
      );
    });

    it('sin nada en curso', () => {
      expect(draftsSummary([], true)).toBe('Nada en curso.');
    });
  });
});

describe('draftStatus', () => {
  const rejected = [{ reason: 'Falta la fuente.' }];

  it('un borrador sin devoluciones es «Borrador»', () => {
    expect(draftStatus('draft', [])).toBe('draft');
  });

  it('un borrador con devoluciones es «Devuelta»', () => {
    expect(draftStatus('draft', rejected)).toBe('returned');
  });

  it('en revisión es «En revisión», aunque antes se haya devuelto', () => {
    expect(draftStatus('in_review', [])).toBe('in_review');
    expect(draftStatus('in_review', rejected)).toBe('in_review');
  });

  it('lo que no está en curso no tiene estado de borrador', () => {
    for (const state of ['published', 'superseded', 'archived'] as const) {
      expect(draftStatus(state, rejected)).toBeNull();
    }
  });
});

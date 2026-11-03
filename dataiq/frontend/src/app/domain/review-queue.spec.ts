import {
  formatSent,
  queueSummary,
  toQueueRows,
  waitedDays,
  type QueueRow,
  type QueueSource,
} from './review-queue';

const NOW = new Date(2026, 9, 6, 15, 30); // 6 oct 2026, 15:30

function source(overrides: Partial<QueueSource> = {}): QueueSource {
  return {
    id: 'v-1',
    technique: 'Tiroidectomía',
    specialty: 'Cirugía general',
    number: 2,
    state: 'in_review',
    created_by: 'u-autor',
    author: 'Daniela Ortiz',
    updated_at: new Date(2026, 9, 1, 9, 0).toISOString(),
    ...overrides,
  };
}

function row(sentAt: Date): QueueRow {
  return {
    id: 'v',
    technique: 'T',
    specialty: 'E',
    number: 2,
    author: 'A',
    sentAt,
    kind: 'edit',
  };
}

describe('toQueueRows', () => {
  it('deja solo las versiones en revisión', () => {
    const rows = toQueueRows(
      [
        source({ id: 'a', state: 'in_review' }),
        source({ id: 'b', state: 'draft' }),
        source({ id: 'c', state: 'published' }),
      ],
      'u-revisor',
    );

    expect(rows.map((r) => r.id)).toEqual(['a']);
  });

  it('quita las que creó quien pregunta: las propias se publican desde el editor', () => {
    const rows = toQueueRows(
      [source({ id: 'mia', created_by: 'u-revisor' }), source({ id: 'ajena' })],
      'u-revisor',
    );

    expect(rows.map((r) => r.id)).toEqual(['ajena']);
  });

  it('pone primero la que lleva más esperando', () => {
    const rows = toQueueRows(
      [
        source({ id: 'reciente', updated_at: new Date(2026, 9, 4, 10).toISOString() }),
        source({ id: 'antigua', updated_at: new Date(2026, 9, 1, 9).toISOString() }),
        source({ id: 'media', updated_at: new Date(2026, 9, 3, 8).toISOString() }),
      ],
      'u-revisor',
    );

    expect(rows.map((r) => r.id)).toEqual(['antigua', 'media', 'reciente']);
  });

  it('una versión 1 es una técnica nueva y de la 2 en adelante, una edición de la publicada', () => {
    const rows = toQueueRows(
      [source({ id: 'nueva', number: 1 }), source({ id: 'edicion', number: 3 })],
      'u-revisor',
    );

    expect(rows.map((r) => [r.id, r.kind])).toEqual([
      ['nueva', 'new_technique'],
      ['edicion', 'edit'],
    ]);
  });

  it('trae el autor, la técnica, la especialidad, el número y cuándo se envió', () => {
    const [first] = toQueueRows([source()], 'u-revisor');

    expect(first).toEqual({
      id: 'v-1',
      technique: 'Tiroidectomía',
      specialty: 'Cirugía general',
      number: 2,
      author: 'Daniela Ortiz',
      sentAt: new Date(2026, 9, 1, 9, 0),
      kind: 'edit',
    });
  });

  it('sin versiones no hay filas', () => {
    expect(toQueueRows([], 'u-revisor')).toEqual([]);
  });
});

describe('waitedDays', () => {
  it('cuenta días de calendario, no horas', () => {
    expect(waitedDays(new Date(2026, 9, 6, 0, 5), NOW)).toBe(0);
    expect(waitedDays(new Date(2026, 9, 5, 23, 55), NOW)).toBe(1);
    expect(waitedDays(new Date(2026, 9, 1, 9, 0), NOW)).toBe(5);
  });

  it('cruza el fin de mes', () => {
    expect(waitedDays(new Date(2026, 8, 30, 18), NOW)).toBe(6);
  });

  it('un envío en el futuro (reloj adelantado) no es una espera negativa', () => {
    expect(waitedDays(new Date(2026, 9, 7, 9), NOW)).toBe(0);
  });
});

describe('formatSent', () => {
  it('dice la fecha y cuánto lleva: «1 oct · hace 5 días»', () => {
    expect(formatSent(new Date(2026, 9, 1, 9), NOW)).toBe('1 oct · hace 5 días');
  });

  it('dice «hoy» y «ayer»', () => {
    expect(formatSent(new Date(2026, 9, 6, 8), NOW)).toBe('6 oct · hoy');
    expect(formatSent(new Date(2026, 9, 5, 22), NOW)).toBe('5 oct · ayer');
  });

  it('suma el año si no es el actual', () => {
    expect(formatSent(new Date(2025, 11, 20, 9), NOW)).toBe('20 dic 2025 · hace 290 días');
  });
});

describe('queueSummary', () => {
  it('sin nada por revisar', () => {
    expect(queueSummary([], NOW)).toBe('Nada por revisar.');
  });

  it('con varias dice cuánto lleva la más antigua', () => {
    expect(queueSummary([row(new Date(2026, 9, 1)), row(new Date(2026, 9, 4))], NOW)).toBe(
      '2 versiones esperan revisión. La más antigua lleva 5 días.',
    );
  });

  it('con una usa el singular', () => {
    expect(queueSummary([row(new Date(2026, 9, 1))], NOW)).toBe(
      '1 versión espera revisión. Lleva 5 días.',
    );
  });

  it('si la más antigua es de hoy, dice que llegó hoy', () => {
    expect(queueSummary([row(new Date(2026, 9, 6, 8)), row(new Date(2026, 9, 6, 9))], NOW)).toBe(
      '2 versiones esperan revisión. La más antigua llegó hoy.',
    );
    expect(queueSummary([row(new Date(2026, 9, 6, 8))], NOW)).toBe(
      '1 versión espera revisión. Llegó hoy.',
    );
  });

  it('un solo día va en singular', () => {
    expect(queueSummary([row(new Date(2026, 9, 5, 22))], NOW)).toBe(
      '1 versión espera revisión. Lleva 1 día.',
    );
  });

  it('toma la más antigua aunque no vengan ordenadas', () => {
    expect(queueSummary([row(new Date(2026, 9, 4)), row(new Date(2026, 9, 2))], NOW)).toBe(
      '2 versiones esperan revisión. La más antigua lleva 4 días.',
    );
  });
});

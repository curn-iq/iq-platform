import {
  emptySutureRow,
  hasSutureName,
  removeSutureLabel,
  removeSutureRow,
  sutureRowNeedsName,
  withSutureField,
} from './suture-rows';

const row = (plane = '', name = '', gauge = '', needle_type = '') => ({
  plane,
  name,
  gauge,
  needle_type,
});

describe('emptySutureRow', () => {
  it('es una fila sin nada escrito, y cada vez una nueva', () => {
    expect(emptySutureRow()).toEqual(row());
    expect(emptySutureRow()).not.toBe(emptySutureRow());
  });
});

describe('withSutureField', () => {
  it('cambia solo ese campo, sin tocar la fila que recibe', () => {
    const original = row('Piel', 'Seda');

    const changed = withSutureField(original, 'gauge', '2/0');

    expect(changed).toEqual(row('Piel', 'Seda', '2/0'));
    expect(original).toEqual(row('Piel', 'Seda'));
  });
});

describe('removeSutureRow', () => {
  const rows = [row('Piel'), row('Fascia'), row('Músculo')];

  it('quita la fila de esa posición', () => {
    expect(removeSutureRow(rows, 1).map((r) => r.plane)).toEqual(['Piel', 'Músculo']);
  });

  it('una posición que no existe la deja igual, y no cambia la lista que recibe', () => {
    expect(removeSutureRow(rows, 9)).toHaveLength(3);
    expect(rows).toHaveLength(3);
  });
});

describe('hasSutureName', () => {
  it('con nombre, sí; en blanco o solo espacios, no', () => {
    expect(hasSutureName(row('', 'Seda'))).toBe(true);
    expect(hasSutureName(row('Piel', ''))).toBe(false);
    expect(hasSutureName(row('Piel', '   '))).toBe(false);
  });
});

describe('sutureRowNeedsName', () => {
  it('una fila vacía, recién agregada, no avisa nada', () => {
    expect(sutureRowNeedsName(row())).toBe(false);
    expect(sutureRowNeedsName(row('  ', ' ', ' ', ' '))).toBe(false);
  });

  it('con un plano, un calibre o una aguja pero sin sutura, avisa', () => {
    expect(sutureRowNeedsName(row('Piel'))).toBe(true);
    expect(sutureRowNeedsName(row('', '', '2/0'))).toBe(true);
    expect(sutureRowNeedsName(row('', '', '', 'cortante'))).toBe(true);
  });

  it('con la sutura escrita, no avisa', () => {
    expect(sutureRowNeedsName(row('Piel', 'Seda'))).toBe(false);
  });
});

describe('removeSutureLabel', () => {
  it('nombra el plano de la fila', () => {
    expect(removeSutureLabel(row('Piel'))).toBe('Quitar Piel');
    expect(removeSutureLabel(row('  Fascia '))).toBe('Quitar Fascia');
  });

  it('sin plano dice «Quitar plano»', () => {
    expect(removeSutureLabel(row())).toBe('Quitar plano');
    expect(removeSutureLabel(row('  '))).toBe('Quitar plano');
  });
});

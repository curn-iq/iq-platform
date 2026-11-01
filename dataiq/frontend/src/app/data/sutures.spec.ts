import type { Suture } from './api/models';
import { toPlaneSutures } from './sutures';

const suture = (overrides: Partial<Suture> = {}): Suture => ({
  id: 's-1',
  name: 'Seda',
  gauge: '2/0',
  needle_type: 'aguja cortante',
  usage: 'Piel',
  ...overrides,
});

describe('toPlaneSutures', () => {
  it('una sutura de un solo plano es una fila', () => {
    expect(toPlaneSutures([suture()])).toEqual([
      { plane: 'Piel', name: 'Seda', gauge: '2/0', needleType: 'aguja cortante' },
    ]);
  });

  it('una fila por plano: separa el uso por «;» y quita los espacios', () => {
    const rows = toPlaneSutures([suture({ usage: 'Piel; Fascia ;  Músculo' })]);

    expect(rows.map((row) => row.plane)).toEqual(['Piel', 'Fascia', 'Músculo']);
    expect(rows.every((row) => row.name === 'Seda' && row.gauge === '2/0')).toBe(true);
  });

  it('un plano con coma no se parte: solo separa el «;»', () => {
    expect(toPlaneSutures([suture({ usage: 'Piel, tejido celular' })]).map((r) => r.plane)).toEqual(
      ['Piel, tejido celular'],
    );
  });

  it('sin uso (o con uso vacío) es una fila sin plano', () => {
    const rows = toPlaneSutures([suture({ usage: null }), suture({ usage: ' ; ' })]);

    expect(rows.map((row) => row.plane)).toEqual([null, null]);
  });

  it('conserva el orden de la API', () => {
    const rows = toPlaneSutures([
      suture({ name: 'Vicryl', usage: 'Músculo; Fascia' }),
      suture({ usage: 'Piel' }),
    ]);

    expect(rows.map((row) => [row.name, row.plane])).toEqual([
      ['Vicryl', 'Músculo'],
      ['Vicryl', 'Fascia'],
      ['Seda', 'Piel'],
    ]);
  });

  it('sin suturas, no hay filas', () => {
    expect(toPlaneSutures([])).toEqual([]);
  });
});

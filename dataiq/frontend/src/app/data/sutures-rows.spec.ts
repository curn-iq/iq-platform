import type { EditorSuture } from '../domain/editor-content';
import { joinPlaneSutures, toPlaneSutures, toSutureRows } from './sutures';

const row = (plane: string, name: string, gauge = '', needle_type = ''): EditorSuture => ({
  plane,
  name,
  gauge,
  needle_type,
});

describe('toSutureRows', () => {
  it('una fila por plano, con el texto vacío donde no hay dato', () => {
    expect(
      toSutureRows([
        { name: 'Seda', gauge: '2/0', needle_type: 'aguja cortante', usage: 'Piel; Fascia' },
        { name: 'Vicryl', gauge: null, needle_type: null, usage: null },
      ]),
    ).toEqual([
      row('Piel', 'Seda', '2/0', 'aguja cortante'),
      row('Fascia', 'Seda', '2/0', 'aguja cortante'),
      row('', 'Vicryl'),
    ]);
  });

  it('sin suturas, sin filas', () => {
    expect(toSutureRows([])).toEqual([]);
  });
});

describe('joinPlaneSutures', () => {
  it('junta en una sola sutura los planos que comparten nombre, calibre y aguja', () => {
    expect(
      joinPlaneSutures([
        row('Piel', 'Seda', '2/0', 'cortante'),
        row('Fascia', 'Seda', '2/0', 'cortante'),
        row('Músculo', 'Vicryl', '0'),
      ]),
    ).toEqual([
      { name: 'Seda', gauge: '2/0', needle_type: 'cortante', usage: 'Piel; Fascia' },
      { name: 'Vicryl', gauge: '0', needle_type: null, usage: 'Músculo' },
    ]);
  });

  it('la misma sutura con otro calibre o con otra aguja es otra sutura', () => {
    const joined = joinPlaneSutures([
      row('Piel', 'Seda', '2/0', 'cortante'),
      row('Fascia', 'Seda', '3/0', 'cortante'),
      row('Músculo', 'Seda', '2/0', 'redonda'),
    ]);

    expect(joined.map((suture) => [suture.gauge, suture.needle_type, suture.usage])).toEqual([
      ['2/0', 'cortante', 'Piel'],
      ['3/0', 'cortante', 'Fascia'],
      ['2/0', 'redonda', 'Músculo'],
    ]);
  });

  it('dos filas iguales dan una sola sutura con el plano una sola vez: la API rechaza repetidos', () => {
    expect(joinPlaneSutures([row('Piel', 'Seda', '2/0'), row('Piel', 'Seda', '2/0')])).toEqual([
      { name: 'Seda', gauge: '2/0', needle_type: null, usage: 'Piel' },
    ]);
  });

  it('un mismo plano con dos suturas distintas va en las dos', () => {
    const joined = joinPlaneSutures([row('Piel', 'Seda', '2/0'), row('Piel', 'Nylon', '4/0')]);

    expect(joined.map((suture) => [suture.name, suture.usage])).toEqual([
      ['Seda', 'Piel'],
      ['Nylon', 'Piel'],
    ]);
  });

  it('una fila sin plano es una sutura sin `usage`', () => {
    expect(joinPlaneSutures([row('', 'Seda', '2/0')])).toEqual([
      { name: 'Seda', gauge: '2/0', needle_type: null, usage: null },
    ]);
  });

  it('una fila sin plano suma sus datos a la misma sutura, que conserva los planos de las otras', () => {
    expect(joinPlaneSutures([row('', 'Seda'), row('Piel', 'Seda')])).toEqual([
      { name: 'Seda', gauge: null, needle_type: null, usage: 'Piel' },
    ]);
  });

  it('una fila sin nombre no se manda, tenga lo que tenga', () => {
    expect(joinPlaneSutures([row('Piel', ''), row('Fascia', '   ', '2/0')])).toEqual([]);
  });

  it('quita los espacios de los extremos y trata lo en blanco como «sin dato»', () => {
    expect(joinPlaneSutures([row(' Piel ', ' Seda ', '  ', ' cortante ')])).toEqual([
      { name: 'Seda', gauge: null, needle_type: 'cortante', usage: 'Piel' },
    ]);
  });

  it('un plano escrito con «;» cuenta como varios, sin repetirlos', () => {
    expect(joinPlaneSutures([row('Piel; Fascia', 'Seda'), row('Fascia', 'Seda')])).toEqual([
      { name: 'Seda', gauge: null, needle_type: null, usage: 'Piel; Fascia' },
    ]);
  });

  it('sin filas, sin suturas', () => {
    expect(joinPlaneSutures([])).toEqual([]);
  });

  it('lo que se lee y se vuelve a guardar queda igual', () => {
    const sutures = [
      { name: 'Seda', gauge: '2/0', needle_type: 'cortante', usage: 'Piel; Fascia' },
      { name: 'Vicryl', gauge: null, needle_type: null, usage: null },
    ];

    expect(joinPlaneSutures(toSutureRows(sutures))).toEqual(sutures);
    expect(toPlaneSutures(joinPlaneSutures(toSutureRows(sutures)))).toEqual(
      toPlaneSutures(sutures),
    );
  });
});

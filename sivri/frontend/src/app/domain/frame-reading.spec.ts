import {
  corrections,
  headline,
  isClose,
  readFrame,
  readTechnique,
  sentenceOf,
} from './frame-reading';
import { ALL_MARKERS, frame, object, technique } from './testing';

describe('sentenceOf', () => {
  it('quita el nombre del principio de lo que va a mover, y deja la frase con mayúscula', () => {
    const kelly = object('move', 'Pinza Kelly', 6, {
      message:
        'Pinza Kelly (n.º 6): va en el centro, a la derecha, junto a Pinza Rochester (n.º 2).',
    });
    expect(sentenceOf(kelly)).toBe(
      'Va en el centro, a la derecha, junto a Pinza Rochester (n.º 2).',
    );
  });

  it('quita también el «Falta» y el «Sobra» del principio', () => {
    const missing = object('missing', 'Mango de bisturí N.º 4', 10, {
      message: 'Falta Mango de bisturí N.º 4 (n.º 10): va al final de la mesa.',
    });
    expect(sentenceOf(missing)).toBe('Va al final de la mesa.');
    const extra = object('extra', 'Pinza Allis', null, {
      message: 'Sobra Pinza Allis: no va en esta mesa.',
    });
    expect(sentenceOf(extra)).toBe('No va en esta mesa.');
  });

  it('sin el nombre al principio, deja la frase como viene', () => {
    const odd = object('move', 'Tijera', 3, { message: 'Muévala hacia el centro.' });
    expect(sentenceOf(odd)).toBe('Muévala hacia el centro.');
  });

  it('una pieza sin frase no tiene nada que decir', () => {
    expect(sentenceOf(object('in_place', 'Tijera', 3))).toBeNull();
    expect(sentenceOf(object('move', 'Tijera', 3, { message: '  ' }))).toBeNull();
  });

  it('un nombre con signos de expresión regular no rompe la lectura', () => {
    const odd = object('move', 'Pinza (larga) [A+]', 1, {
      message: 'Pinza (larga) [A+] (n.º 1): hay que moverlo.',
    });
    expect(sentenceOf(odd)).toBe('Hay que moverlo.');
  });
});

describe('readTechnique', () => {
  const result = technique('t-1', 'Mastectomía', [
    object('in_place', 'Tijera de Mayo', 8),
    object('move', 'Pinza Kelly', 6, { message: 'Pinza Kelly (n.º 6): va en el centro.' }),
    object('doubtful', 'Pinza Allis', 1),
    object('missing', 'Mango de bisturí N.º 4', 10, {
      message: 'Falta Mango de bisturí N.º 4 (n.º 10): va al final.',
    }),
    object('in_place', 'Pinza Rochester', 2),
    object('extra', 'Separador', null, { message: 'Sobra Separador: no va en esta mesa.' }),
  ]);

  it('arma los grupos por mover, falta, sobra y en su lugar', () => {
    const reading = readTechnique(result);
    expect(reading.move.map((p) => p.label)).toEqual(['Pinza Kelly']);
    expect(reading.missing.map((p) => p.label)).toEqual(['Mango de bisturí N.º 4']);
    expect(reading.extra.map((p) => p.label)).toEqual(['Separador']);
    expect(reading.placed.map((p) => p.label)).toEqual([
      'Pinza Allis',
      'Pinza Rochester',
      'Tijera de Mayo',
    ]);
  });

  it('las dudosas cuentan como en su lugar y no se marcan: no traen frase', () => {
    const reading = readTechnique(result);
    expect(reading.inPlace).toBe(3);
    expect(reading.expected).toBe(5);
    expect(reading.placed.find((p) => p.label === 'Pinza Allis')?.sentence).toBeNull();
  });

  it('ordena cada grupo por el número del diagrama, con los que no lo tienen al final', () => {
    const reading = readTechnique(
      technique('t-1', 'X', [
        object('missing', 'C', null),
        object('missing', 'B', 9),
        object('missing', 'A', 2),
      ]),
    );
    expect(reading.missing.map((p) => p.label)).toEqual(['A', 'B', 'C']);
  });

  it('el porcentaje es un entero de 0 a 100', () => {
    expect(readTechnique(result).percent).toBe(60);
    expect(readTechnique(technique('t', 'X', [], { percent: 0.9 })).percent).toBe(90);
  });

  it('una pieza sin nombre se dice sin inventar uno', () => {
    const reading = readTechnique(technique('t', 'X', [object('missing', '', 4, { label: null })]));
    expect(reading.missing[0].label).toBe('Instrumento sin nombre');
  });

  it('dos piezas iguales tienen ids distintos', () => {
    const reading = readTechnique(
      technique('t', 'X', [object('move', 'Kelly', 2), object('move', 'Kelly', 2)]),
    );
    expect(new Set(reading.move.map((p) => p.id)).size).toBe(2);
  });
});

describe('headline y corrections', () => {
  const reading = readTechnique(
    technique('t-1', 'Mastectomía', [
      object('in_place', 'A', 1),
      object('move', 'B', 3),
      object('missing', 'C', 2),
      object('extra', 'D', null),
    ]),
  );

  it('el titular dice cuántas están en su lugar de cuántas esperadas', () => {
    expect(headline(reading)).toBe('1 de 3 en su lugar.');
  });

  it('lo que hay que corregir va primero por mover, luego falta y luego sobra', () => {
    expect(corrections(reading).map((p) => p.label)).toEqual(['B', 'C', 'D']);
  });
});

describe('readFrame', () => {
  it('lee el resultado de un cuadro con las técnicas y lo que se ve', () => {
    const reading = readFrame(
      frame({
        detections: [
          {
            label: 'Pinza Kelly',
            instrument_id: null,
            confidence: 0.9,
            box: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
          },
        ],
        techniques: [technique('t-1', 'Mastectomía', [object('in_place', 'A', 1)])],
      }),
    );
    expect(reading.boardFound).toBe(true);
    expect(reading.markers).toEqual(ALL_MARKERS);
    expect(reading.detections).toEqual([
      { label: 'Pinza Kelly', box: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 } },
    ]);
    expect(reading.techniques).toHaveLength(1);
    expect(isClose(reading)).toBe(false);
  });

  it('con dos técnicas, quedan muy cerca', () => {
    const reading = readFrame(
      frame({
        techniques: [
          technique('t-1', 'A', [object('in_place', 'X', 1)]),
          technique('t-2', 'B', [object('in_place', 'X', 1)]),
        ],
      }),
    );
    expect(isClose(reading)).toBe(true);
  });

  it('sin los cuatro marcadores no hay técnicas, solo lo que se ve', () => {
    const reading = readFrame(frame({ board_found: false, recognized: false }));
    expect(reading.boardFound).toBe(false);
    expect(reading.techniques).toEqual([]);
  });
});
